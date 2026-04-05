'use client';

import EditButton from '@/components/ui/EditButton';

const personalInfo = {
  name: '김철수',
  affiliation: '고려대학교 자유전공학부',
  birthDate: '2000-03-15',
  gender: '남성',
  major1: '법학',
  major2: '경영학',
  admissionYear: '2020',
  militaryStatus: '군필',
  academicStatus: '졸업',
  graduationYear: '2024',
};

const admissionInfo = {
  가: {
    first: { school: '고려대학교', type: '일반전형' },
    second: { school: '-', type: '-' },
  },
  나: {
    first: { school: '서울대학교', type: '일반전형' },
    second: { school: '-', type: '-' },
  },
};

const fieldRows = [
  [
    { label: '생년월일', key: 'birthDate' },
    { label: '성별', key: 'gender' },
  ],
  [
    { label: '제1전공', key: 'major1' },
    { label: '제2전공', key: 'major2' },
  ],
  [
    { label: '입학년도', key: 'admissionYear' },
    { label: '병역여부', key: 'militaryStatus' },
  ],
  [
    { label: '학적상태', key: 'academicStatus' },
    { label: '졸업년도', key: 'graduationYear' },
  ],
] as const;

export default function BasicInfoPage() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">개인정보</h1>
        <p className="text-sm text-[#6B7280] mt-1">기본 프로필과 희망 학교 정보를 입력해주세요</p>
      </div>

      {/* 개인정보 카드 */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        {/* 프로필 헤더 */}
        <div className="flex items-center justify-between px-8 py-6 bg-[#EFF6FF] border-b border-[#E5E7EB]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#3B82F6]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-[#111827]">{personalInfo.name}</p>
              <p className="text-sm text-[#6B7280] mt-0.5">{personalInfo.affiliation}</p>
            </div>
          </div>
          <EditButton />
        </div>

        {/* 필드 그리드 */}
        <div className="px-8 py-2">
          {fieldRows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className={`grid grid-cols-2 divide-x divide-[#E5E7EB] py-5 ${rowIdx < fieldRows.length - 1 ? 'border-b border-[#E5E7EB]' : ''}`}
            >
              {row.map(({ label, key }, colIdx) => (
                <div key={key} className={`flex flex-col gap-2${colIdx === 1 ? ' pl-8' : ''}`}>
                  <span className="text-sm text-[#6B7280]">{label}</span>
                  <span className="text-base text-[#111827]">{personalInfo[key]}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 희망 학교 및 전형 카드 */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-[#111827]">희망 학교 및 전형</h2>
          <EditButton />
        </div>

        {/* 가군 / 나군 2컬럼 */}
        <div className="grid grid-cols-2 divide-x divide-[#E5E7EB]">
          {(['가', '나'] as const).map((group) => {
            const data = admissionInfo[group];
            return (
              <div key={group} className={group === '나' ? 'pl-8' : 'pr-8'}>
                <span className="inline-block text-sm font-semibold text-[#3B82F6] bg-[#EFF6FF] px-3 py-1 rounded mb-5">
                  {group}군
                </span>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      { rank: '제1지망', item: data.first },
                      { rank: '제2지망', item: data.second },
                    ].map(({ rank, item }) => (
                      <tr key={rank} className="border-b border-[#E5E7EB] last:border-0">
                        <td className="py-4 text-[#6B7280] w-16">{rank}</td>
                        <td className="py-4 text-[#111827] font-medium w-32">{item.school}</td>
                        <td className="py-4 text-[#6B7280]">{item.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
