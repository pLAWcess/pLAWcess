'use client';

type MatchingStatus = 'active' | 'inactive';

type ApprovedMentee = {
  id: string;
  name: string;
  studentId: string;
  major: string;
  role: '멘티';
  status: MatchingStatus;
};

type ApprovedMentor = {
  id: string;
  name: string;
  studentId: string;
  school: string;
  role: '멘토';
  status: MatchingStatus;
};

const APPROVED_MENTEES: ApprovedMentee[] = [
  { id: 'm1', name: '김민준', studentId: '2020123456', major: '법학과', role: '멘티', status: 'active' },
  { id: 'm2', name: '이서연', studentId: '2019234567', major: '경영학과', role: '멘티', status: 'active' },
  { id: 'm3', name: '박지호', studentId: '2021345678', major: '컴퓨터공학과', role: '멘티', status: 'active' },
  { id: 'm4', name: '정태양', studentId: '2020567890', major: '경제학과', role: '멘티', status: 'active' },
  { id: 'm5', name: '강하늘', studentId: '2019678901', major: '심리학과', role: '멘티', status: 'active' },
];

const APPROVED_MENTORS: ApprovedMentor[] = [
  { id: 't1', name: '최수진', studentId: '2018456789', school: '성균관대학교', role: '멘토', status: 'active' },
  { id: 't2', name: '오승민', studentId: '2017890123', school: '경희대학교', role: '멘토', status: 'active' },
  { id: 't3', name: '송지우', studentId: '2016234567', school: '서울대학교', role: '멘토', status: 'active' },
];

function StatusBadge({ status }: { status: MatchingStatus }) {
  const styles: Record<MatchingStatus, string> = {
    active: 'bg-green-500 text-white',
    inactive: 'bg-gray-200 text-gray-600',
  };
  const labels: Record<MatchingStatus, string> = { active: '활성', inactive: '비활성' };
  return (
    <span className={`inline-flex items-center justify-center min-w-[56px] px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function AdminMatchingsPage() {
  const handleRunMatching = () => {
    // TODO: POST /api/admin/matchings/run
    alert('AI 매칭을 실행합니다. (mock)');
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">매칭관리</h1>
        <p className="mt-1 text-sm text-text-secondary">멘토-멘티 매칭 프로세스를 관리합니다</p>
      </div>

      {/* 매칭 대상 조회 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-6">매칭 대상 조회</h2>
        <div className="grid grid-cols-2 gap-10">
          <ApprovedTable
            title="승인된 멘티 신청자 목록"
            columns={['이름', '학번', '전공', '현재 역할', '상태']}
            rows={APPROVED_MENTEES.map((m) => [m.name, m.studentId, m.major, m.role, <StatusBadge key="s" status={m.status} />])}
          />
          <ApprovedTable
            title="승인된 멘토 신청자 목록"
            columns={['이름', '학번', '소속 학교', '현재 역할', '상태']}
            rows={APPROVED_MENTORS.map((m) => [m.name, m.studentId, m.school, m.role, <StatusBadge key="s" status={m.status} />])}
          />
        </div>
      </section>

      {/* AI 매칭 실행 */}
      <section className="bg-white border border-border rounded-xl px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">AI 매칭 실행</h2>
        <button
          onClick={handleRunMatching}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
            <path d="M19 3 L19.5 5 L21.5 5.5 L19.5 6 L19 8 L18.5 6 L16.5 5.5 L18.5 5 Z" />
          </svg>
          AI 매칭 실행
        </button>
      </section>
    </div>
  );
}

function ApprovedTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <table className="w-full table-auto">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th key={c} className="text-left text-xs font-medium text-text-secondary py-2.5 pr-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-sm text-text-secondary">
                승인된 신청자가 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((cells, i) => (
              <tr key={i} className="border-b border-border last:border-b-0">
                {cells.map((cell, j) => (
                  <td key={j} className="py-3 pr-3 text-sm text-text-primary align-middle">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
