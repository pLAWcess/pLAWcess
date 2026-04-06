type GradeRow = Record<string, string>;

const CATEGORY_STYLE: Record<string, string> = {
  전공필수: 'bg-blue-100 text-blue-700',
  전공선택: 'bg-sky-100 text-sky-700',
  교양필수: 'bg-gray-200 text-gray-600',
  교양선택: 'bg-gray-100 text-gray-500',
};

const GRADE_STYLE: Record<string, string> = {
  'A+': 'bg-green-100 text-green-700',
  'A0': 'bg-green-100 text-green-700',
  'B+': 'bg-blue-100 text-blue-700',
  'B0': 'bg-blue-100 text-blue-700',
  'C+': 'bg-yellow-100 text-yellow-700',
  'C0': 'bg-yellow-100 text-yellow-700',
};

function Badge({ text, style }: { text: string; style: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {text}
    </span>
  );
}

export default function GradeTable({ rows }: { rows: GradeRow[] }) {
  return (
    <div className="mt-6 border-t border-[#E5E7EB] pt-6">
      <h3 className="text-sm font-semibold text-[#111827] mb-4">학업 성적표</h3>
      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
              {['년도', '학기', '학수번호', '과목명', '이수구분', '학점', '등급', '평점', '재수강 여부'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]">
                <td className="px-4 py-3 text-[#374151]">{row['년도']}</td>
                <td className="px-4 py-3 text-[#374151]">{row['학기']}</td>
                <td className="px-4 py-3 text-[#3B82F6] font-medium">{row['학수번호']}</td>
                <td className="px-4 py-3 text-[#111827]">{row['과목명']}</td>
                <td className="px-4 py-3">
                  <Badge
                    text={row['이수구분']}
                    style={CATEGORY_STYLE[row['이수구분']] ?? 'bg-gray-100 text-gray-500'}
                  />
                </td>
                <td className="px-4 py-3 text-[#374151]">{row['학점']}</td>
                <td className="px-4 py-3">
                  {row['등급'] ? (
                    <Badge
                      text={row['등급']}
                      style={GRADE_STYLE[row['등급']] ?? 'bg-gray-100 text-gray-500'}
                    />
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-[#374151]">{row['평점']}</td>
                <td className="px-4 py-3 text-[#374151]">
                  {row['재수강과목'] ? '재수강' : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
