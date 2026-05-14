'use client';

import { useMemo, useState } from 'react';
import SelectField from '@/components/ui/SelectField';
import { useToast } from '@/components/ui/Toast';
import {
  getMatchingSuggestions,
  runMatching,
  saveMatchings,
  type EligibleMentee,
  type EligibleMentor,
  type EligiblePool,
  type GetMatchingResultsResponse,
  type GetSuggestionsResponse,
  type MatchSuggestionCandidate,
  type MenteeSuggestionGroup,
  type SaveMatchingRow,
} from '@/lib/api';
import { computeDefaultRanks } from '@/lib/matchingDefaults';

// 멘토 한 명이 담당할 수 있는 최대 멘티 수. 기본 선택 계산 시 이 제약을 지킨다.
// 관리자가 화면에서 수동으로 바꾸면 cap 위반이 생길 수 있지만 제약하지 않는다 (운영자 재량).
const MENTOR_CAP = 2;

type MatchStatus = 'editing' | 'confirmed' | 'rejected';

type RowState = {
  // 멘티 1명당 한 행. selectedRank 가 현재 선택된 멘토 후보.
  group: MenteeSuggestionGroup;
  selectedRank: number;
  status: MatchStatus;
};

const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  editing: '수정중',
  confirmed: '확정',
  rejected: '거절',
};

const PAGE_SIZE = 5;

const MATCH_STATUS_OPTIONS = Object.values(MATCH_STATUS_LABELS);

function matchStatusFromLabel(l: string): MatchStatus {
  return (Object.entries(MATCH_STATUS_LABELS).find(([, lb]) => lb === l)?.[0] as MatchStatus) ?? 'editing';
}

function ScoreBadge({ score }: { score: number }) {
  // 0~100 분포에 맞춰 임계값 조정.
  const color = score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-blue-500' : 'bg-gray-400';
  return (
    <span className={`inline-flex items-center justify-center min-w-[56px] px-3 py-1 rounded-full text-xs font-semibold text-white ${color}`}>
      {score}점
    </span>
  );
}

function findCandidate(group: MenteeSuggestionGroup, rank: number): MatchSuggestionCandidate | null {
  return group.candidates.find((c) => c.rank === rank) ?? null;
}

// 매칭 저장 결과(initialResults) 가 있으면 그 선택으로 selectedRank/status 를 복원.
// 없으면 AI 계산 기본값(computeDefaultRanks) 사용.
function buildRowsFromSuggestions(
  items: MenteeSuggestionGroup[],
  results: GetMatchingResultsResponse | null,
): RowState[] {
  const usable = items.filter((g) => g.candidates.length > 0);
  const defaults = computeDefaultRanks(usable, MENTOR_CAP);
  const savedByMentee = new Map(
    (results?.items ?? []).map((r) => [r.menteeApplicationId, r]),
  );
  return usable.map((group) => {
    const saved = savedByMentee.get(group.menteeApplicationId);
    if (saved) {
      // 저장된 멘토 id 가 후보 목록에 있을 때만 그 rank 로 복원. 없으면(예: AI 재실행으로
      // 후보가 바뀐 경우) AI 기본값으로 fallback.
      const match = group.candidates.find((c) => c.mentorApplicationId === saved.mentorApplicationId);
      if (match) {
        return { group, selectedRank: match.rank, status: saved.status };
      }
    }
    return {
      group,
      selectedRank: defaults.get(group.menteeApplicationId) ?? 1,
      status: 'editing' as MatchStatus,
    };
  });
}

export default function AdminMatchingsClient({
  initialPool,
  initialSuggestions,
  initialResults,
}: {
  initialPool: EligiblePool | null;
  initialSuggestions: GetSuggestionsResponse | null;
  initialResults: GetMatchingResultsResponse | null;
}) {
  const pool = initialPool ?? { mentees: [] as EligibleMentee[], mentors: [] as EligibleMentor[], year: new Date().getFullYear() };

  const [rows, setRows] = useState<RowState[] | null>(() =>
    initialSuggestions ? buildRowsFromSuggestions(initialSuggestions.items, initialResults) : null,
  );
  const [finalized, setFinalized] = useState<boolean>(initialResults?.anyFinalized ?? false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const toast = useToast();

  const totalRows = rows?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pagedRows = useMemo(() => {
    if (!rows) return null;
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const handleRunMatching = async () => {
    setRunning(true);
    setProgress({ completed: 0, total: 0 });
    try {
      const result = await runMatching(pool.year, (event) => {
        if (event.type === 'start') {
          setProgress({ completed: 0, total: event.total });
        } else if (event.type === 'progress') {
          setProgress({ completed: event.completed, total: event.total });
        }
      });
      const fresh = await getMatchingSuggestions(pool.year);
      // AI 매칭을 새로 돌리면 후보가 바뀌므로 기존 저장 결과(initialResults) 와 매칭이 안 될
      // 수 있다. 새 후보 기준으로 다시 기본 선택을 계산 (저장 결과 무시).
      setRows(buildRowsFromSuggestions(fresh.items, null));
      setFinalized(false);
      setExpanded(new Set());
      setPage(1);

      // done 라인이 안 와서 fallback 으로 끝난 경우 result.processed 가 0 으로 들어옴.
      // 그때는 새로 받아온 suggestion 갯수를 신뢰값으로 사용.
      const processedCount = result.processed > 0 ? result.processed : fresh.items.length;

      if (result.skipped.length > 0) {
        // 어떤 멘티가 어떤 이유로 빠졌는지 콘솔에 자세히 (운영자 디버깅용).
        console.warn('[AI 매칭] 처리되지 않은 멘티:', result.skipped);
        toast.info(
          `${processedCount}명 매칭 완료. ${result.skipped.length}명은 처리되지 않았어요. (콘솔에서 사유 확인)`,
        );
      } else {
        toast.success(`${processedCount}명 매칭 완료.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI 매칭 실행 실패');
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const toggleExpand = (menteeApplicationId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(menteeApplicationId)) next.delete(menteeApplicationId);
      else next.add(menteeApplicationId);
      return next;
    });
  };

  const updateSelectedRank = (menteeApplicationId: string, newRank: number) => {
    setRows((prev) =>
      prev?.map((r) =>
        r.group.menteeApplicationId === menteeApplicationId ? { ...r, selectedRank: newRank } : r,
      ) ?? null,
    );
  };

  const updateStatus = (menteeApplicationId: string, status: MatchStatus) => {
    setRows((prev) =>
      prev?.map((r) =>
        r.group.menteeApplicationId === menteeApplicationId ? { ...r, status } : r,
      ) ?? null,
    );
  };

  const [saving, setSaving] = useState<null | 'draft' | 'confirm'>(null);

  // 현재 화면 상태 → 저장 payload. 행마다 selectedRank 의 후보가 mentor/score/reason 의 소스.
  const buildSavePayload = (): SaveMatchingRow[] => {
    if (!rows) return [];
    const out: SaveMatchingRow[] = [];
    for (const r of rows) {
      const selected = findCandidate(r.group, r.selectedRank) ?? findCandidate(r.group, 1);
      if (!selected) continue;
      out.push({
        menteeApplicationId: r.group.menteeApplicationId,
        mentorApplicationId: selected.mentorApplicationId,
        aiScore: selected.score,
        aiReason: selected.reason,
        status: r.status,
      });
    }
    return out;
  };

  const handleSaveDraft = async () => {
    if (!rows || rows.length === 0 || saving) return;
    setSaving('draft');
    try {
      const payload = buildSavePayload();
      const res = await saveMatchings('draft', payload, pool.year);
      setFinalized(false);
      toast.success(`임시저장 완료 (${res.saved}건).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '임시저장 실패');
    } finally {
      setSaving(null);
    }
  };

  const handleConfirmAll = async () => {
    if (!rows || rows.length === 0 || saving) return;
    const editingCount = rows.filter((r) => r.status === 'editing').length;
    if (editingCount > 0) {
      toast.error(`${editingCount}명이 '수정중' 상태입니다. 모든 행을 '확정' 또는 '거절' 로 표시한 뒤 다시 시도해 주세요.`);
      return;
    }
    setSaving('confirm');
    try {
      const payload = buildSavePayload();
      const res = await saveMatchings('confirm', payload, pool.year);
      setFinalized(true);
      toast.success(`매칭 확정 완료 (${res.finalized}건 확정 / ${res.saved - res.finalized}건 제외).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '매칭 확정 실패');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">매칭관리</h1>
        <p className="text-sm text-text-secondary mt-1">
          멘토-멘티 매칭 프로세스를 관리합니다
        </p>
      </div>

      <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-6">매칭 대상 조회</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          <ApprovedTable
            title={`승인된 멘티 신청자 목록 (${pool.mentees.length}명)`}
            columns={['이름', '전공', '제1지망 학교', '제2지망 학교']}
            rows={pool.mentees.map((m) => [
              m.name,
              m.major || '-',
              m.firstPreferenceSchool ?? '-',
              m.secondPreferenceSchool ?? '-',
            ])}
          />
          <ApprovedTable
            title={`승인된 멘토 신청자 목록 (${pool.mentors.length}명)`}
            columns={['이름', '학부 전공', '소속 로스쿨']}
            rows={pool.mentors.map((m) => [
              m.name,
              m.undergradMajor || '-',
              m.lawSchool ?? '-',
            ])}
          />
        </div>
      </section>

      <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">AI 매칭 실행</h2>
        <button
          onClick={handleRunMatching}
          disabled={running || (pool.mentees.length === 0 || pool.mentors.length === 0)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
            <path d="M19 3 L19.5 5 L21.5 5.5 L19.5 6 L19 8 L18.5 6 L16.5 5.5 L18.5 5 Z" />
          </svg>
          {running
            ? progress && progress.total > 0
              ? `매칭 실행 중... (${progress.completed}/${progress.total})`
              : '매칭 실행 중...'
            : 'AI 매칭 실행'}
        </button>
        {running && progress && progress.total > 0 && (
          <div className="mt-3 h-1.5 w-full max-w-md rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{ width: `${Math.round((progress.completed / progress.total) * 100)}%` }}
            />
          </div>
        )}
        <p className="text-xs text-text-placeholder mt-2">
          승인된 모든 멘티에 대해 각자 멘토 후보 3명을 추천합니다. 이미 결과가 있으면 새 결과로 교체됩니다.
        </p>
      </section>

      <section className="bg-white border border-border rounded-xl px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-1">AI 매칭 결과 및 확정</h2>
        <p className="text-xs text-text-placeholder mb-5">
          기본 선택은 멘토 한 명당 멘티 {MENTOR_CAP}명 제약 하에 점수 합이 최대가 되도록 자동 계산됩니다. 행을 클릭하면 다른 후보 멘토를 확인하고 변경할 수 있어요.
        </p>
        {rows === null ? (
          <p className="py-6 text-sm text-text-secondary">아직 매칭이 실행되지 않았습니다. 위에서 AI 매칭을 실행해주세요.</p>
        ) : totalRows === 0 ? (
          <p className="py-6 text-sm text-text-secondary">매칭 결과가 비어 있습니다.</p>
        ) : (
          <>
            <MergedTable
              rows={pagedRows ?? []}
              expanded={expanded}
              onToggle={toggleExpand}
              onSelectRank={updateSelectedRank}
              onSelectStatus={updateStatus}
            />
            <PaginationFooter
              totalCount={totalRows}
              page={safePage}
              totalPages={totalPages}
              onPage={setPage}
            />
            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={handleSaveDraft}
                disabled={saving !== null}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {saving === 'draft' ? '저장 중...' : '임시저장'}
              </button>
              <button
                onClick={handleConfirmAll}
                disabled={saving !== null}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-60"
              >
                {saving === 'confirm' ? '확정 중...' : finalized ? '매칭 다시 확정' : '매칭 확정'}
              </button>
              {finalized && (
                <span className="text-xs text-text-placeholder ml-2">
                  현재 사이클은 확정 상태입니다. 다시 저장하면 새 확정으로 덮어씁니다.
                </span>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ---------------- 매칭 결과 통합 테이블 (조회 + 멘토 선택 + 상태 변경) ----------------
//
// 메인 행: 현재 selectedRank 멘토의 정보 + 멘토 선택 dropdown + 상태 dropdown.
// 펼침 행: 같은 멘티의 나머지 후보 멘토 (선택 가능한 다른 옵션을 한눈에).
//   - chevron 클릭 / 멘티 이름 셀 클릭으로 toggle.
//   - dropdown 영역 클릭은 toggle 막아야 함 (stopPropagation).

function MergedTable({
  rows,
  expanded,
  onToggle,
  onSelectRank,
  onSelectStatus,
}: {
  rows: RowState[];
  expanded: Set<string>;
  onToggle: (menteeApplicationId: string) => void;
  onSelectRank: (menteeApplicationId: string, rank: number) => void;
  onSelectStatus: (menteeApplicationId: string, status: MatchStatus) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto min-w-[720px]">
        <thead>
          <tr className="border-b border-border">
            <th className="w-10" />
            <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap w-[14%]">멘티 이름</th>
            <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap w-[22%]">멘토 선택</th>
            <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap w-[10%]">매칭 점수</th>
            <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap">추천 사유</th>
            <th className="text-left text-xs font-medium text-text-secondary py-3 pr-4 whitespace-nowrap w-[12%]">매칭 상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <MergedRowGroup
              key={r.group.menteeApplicationId}
              row={r}
              isOpen={expanded.has(r.group.menteeApplicationId)}
              onToggle={() => onToggle(r.group.menteeApplicationId)}
              onSelectRank={(rank) => onSelectRank(r.group.menteeApplicationId, rank)}
              onSelectStatus={(s) => onSelectStatus(r.group.menteeApplicationId, s)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MergedRowGroup({
  row,
  isOpen,
  onToggle,
  onSelectRank,
  onSelectStatus,
}: {
  row: RowState;
  isOpen: boolean;
  onToggle: () => void;
  onSelectRank: (rank: number) => void;
  onSelectStatus: (status: MatchStatus) => void;
}) {
  const selected = findCandidate(row.group, row.selectedRank) ?? findCandidate(row.group, 1);
  const others = useMemo(
    () =>
      row.group.candidates
        .filter((c) => c.rank !== (selected?.rank ?? -1))
        .sort((a, b) => a.rank - b.rank),
    [row.group.candidates, selected?.rank],
  );
  if (!selected) return null;

  const dropdownOptions = row.group.candidates
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((c) => `${c.rank}순위 — ${c.mentorName} (${c.score}점)`);
  const selectedLabel = `${selected.rank}순위 — ${selected.mentorName} (${selected.score}점)`;

  return (
    <>
      <tr className="border-b border-border last:border-b-0 hover:bg-brand-light/30">
        <td className="py-3 pl-3 pr-1 align-middle text-text-secondary cursor-pointer" onClick={onToggle}>
          <Chevron open={isOpen} />
        </td>
        <td
          className="py-3 pr-4 text-sm font-medium text-text-primary whitespace-nowrap cursor-pointer"
          onClick={onToggle}
        >
          {row.group.menteeName}
        </td>
        <td className="py-3 pr-4 text-sm text-text-primary" onClick={(e) => e.stopPropagation()}>
          <SelectField
            value={selectedLabel}
            options={dropdownOptions}
            onChange={(v) => {
              const m = v.match(/^(\d+)순위/);
              onSelectRank(m ? parseInt(m[1], 10) : 1);
            }}
          />
        </td>
        <td className="py-3 pr-4"><ScoreBadge score={selected.score} /></td>
        <td className="py-3 pr-4 text-sm text-text-secondary whitespace-pre-line leading-relaxed">{selected.reason}</td>
        <td className="py-3 pr-4 text-sm text-text-primary" onClick={(e) => e.stopPropagation()}>
          <SelectField
            value={MATCH_STATUS_LABELS[row.status]}
            options={MATCH_STATUS_OPTIONS}
            onChange={(v) => onSelectStatus(matchStatusFromLabel(v))}
          />
        </td>
      </tr>
      {isOpen && others.map((c) => (
        <tr key={c.rank} className="border-b border-border last:border-b-0 bg-page-bg/40">
          <td className="py-3 pl-3 pr-1 align-middle text-xs text-text-placeholder">{c.rank}순위</td>
          <td />
          <td className="py-3 pr-4 text-sm text-text-primary whitespace-nowrap">{c.mentorName}</td>
          <td className="py-3 pr-4"><ScoreBadge score={c.score} /></td>
          <td className="py-3 pr-4 text-sm text-text-secondary whitespace-pre-line leading-relaxed">{c.reason}</td>
          <td />
        </tr>
      ))}
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform ${open ? 'rotate-90' : ''}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ---------------- 적격 풀 테이블 (기존 유지) ----------------

function ApprovedTable({ title, columns, rows }: { title: string; columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <span className="text-xs text-text-placeholder">{rows.length}건</span>
      </div>
      <div className="overflow-hidden border border-border rounded-lg bg-white">
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '320px' }}>
          <table className="w-full table-auto min-w-[320px]">
            <thead className="sticky top-0 bg-page-bg z-10">
              <tr className="border-b border-border">
                {columns.map((c) => (
                  <th key={c} className="text-left text-xs font-semibold text-text-secondary py-3 px-4 whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-10 text-center text-sm text-text-placeholder">
                    승인된 신청자가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((cells, i) => (
                  <tr
                    key={i}
                    className={`border-b border-border last:border-b-0 hover:bg-brand-light/40 transition-colors ${i % 2 === 1 ? 'bg-page-bg/30' : ''}`}
                  >
                    {cells.map((cell, j) => (
                      <td key={j} className="py-3 px-4 text-sm text-text-primary align-middle whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------- 페이지네이션 (회원관리/신청관리와 동일 패턴) ----------------

function PaginationFooter({
  totalCount,
  page,
  totalPages,
  onPage,
}: {
  totalCount: number;
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mt-4">
      <span className="text-xs text-text-secondary">
        총 {totalCount}건 · {page} / {totalPages} 페이지
      </span>
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPage={onPage} />}
    </div>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages = pageNumbers(page, totalPages);
  return (
    <div className="flex items-center gap-1">
      <PageButton onClick={() => onPage(Math.max(1, page - 5))} disabled={page === 1}>«</PageButton>
      <PageButton onClick={() => onPage(page - 1)} disabled={page === 1}>‹</PageButton>
      {pages.map((p, i) =>
        p === null ? (
          <span key={`ph${i}`} className="min-w-[28px] h-7 px-2" aria-hidden="true" />
        ) : (
          <PageButton key={p} onClick={() => onPage(p)} active={p === page}>{p}</PageButton>
        ),
      )}
      <PageButton onClick={() => onPage(page + 1)} disabled={page === totalPages}>›</PageButton>
      <PageButton onClick={() => onPage(Math.min(totalPages, page + 5))} disabled={page === totalPages}>»</PageButton>
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-7 h-7 px-2 text-xs rounded-md transition-colors ${
        active
          ? 'bg-brand text-white font-semibold'
          : 'text-text-secondary hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed'
      }`}
    >
      {children}
    </button>
  );
}

function pageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);
  // 현재 페이지가 항상 시각적 가운데에 오도록 5칸 window 를 current 중심으로 고정.
  // 범위 밖(<1 또는 >total) 은 null(보이지 않는 placeholder) 로 두어 셀 폭/위치를 유지한다.
  // « / » (점프) 는 ‹ 의 왼쪽 / › 의 오른쪽에 별도 버튼으로 두므로 여기엔 포함하지 않는다.
  const half = 2;
  const windowStart = current - half;
  const windowEnd = current + half;
  const showLeftAnchor = 1 < windowStart;
  const showRightAnchor = total > windowEnd;
  const pages: (number | null)[] = [];
  pages.push(showLeftAnchor ? 1 : null);
  for (let i = -half; i <= half; i++) {
    const p = current + i;
    pages.push(p >= 1 && p <= total ? p : null);
  }
  pages.push(showRightAnchor ? total : null);
  return pages;
}
