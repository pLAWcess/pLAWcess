'use client';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

// 합격 아카이브 페이지네이션 — 좌/우 화살표 + 1..N 페이지 번호.
// 페이지 수가 많아질 때를 대비해 ... 생략 패턴(현재 ±2)을 적용한다.
export default function ArchivePagination({ page, totalPages, onChange }: Props) {
  const items = buildPageList(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <PageButton
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="이전 페이지"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </PageButton>

      {items.map((it, idx) =>
        it === '...' ? (
          <span key={`gap-${idx}`} className="px-2 text-xs text-text-placeholder">…</span>
        ) : (
          <PageButton
            key={it}
            onClick={() => onChange(it)}
            active={it === page}
          >
            {it}
          </PageButton>
        ),
      )}

      <PageButton
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="다음 페이지"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </PageButton>
    </div>
  );
}

function PageButton({
  active,
  disabled,
  onClick,
  children,
  ...rest
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[32px] h-8 px-2 inline-flex items-center justify-center text-xs font-medium rounded-md transition-colors ${
        active
          ? 'bg-brand text-white'
          : 'text-text-secondary hover:bg-page-bg disabled:opacity-30 disabled:hover:bg-transparent'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

// 페이지 ±2 + 양 끝 1, N 만 노출. 그 사이는 '...' 로 표시.
function buildPageList(page: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const result: Array<number | '...'> = [1];
  const start = Math.max(2, page - 2);
  const end = Math.min(total - 1, page + 2);
  if (start > 2) result.push('...');
  for (let i = start; i <= end; i++) result.push(i);
  if (end < total - 1) result.push('...');
  result.push(total);
  return result;
}
