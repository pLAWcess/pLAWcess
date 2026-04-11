'use client';

import { useState } from 'react';

interface ArchiveCase {
  id: string;
  major: string;
  admittedSchool: string;
  leet: number;
  gpa: number;
  keywords: string[];
  storySummary: string;
  mentorMessage: string;
  year: number;
}

// TODO: API 연결 후 실제 데이터로 교체
const MOCK_ARCHIVE: ArchiveCase[] = [
  {
    id: '1',
    major: '경영학',
    admittedSchool: '고려대',
    leet: 145,
    gpa: 4.1,
    keywords: ['기업법무', '논리적 사고', '문제해결'],
    storySummary:
      '경영학 전공을 살려 기업법무 분야 진출을 목표로 했습니다. 자소서에서는 학부 시절 창업 동아리 경험을 계약 분쟁 해결 과정과 연결해 법학에 대한 실질적 관심을 어필했습니다. LEET는 2년 준비했고, 두 번째 시험에서 크게 올랐어요.',
    mentorMessage:
      '경영+거버넌스 조합은 기업법 쪽으로 스토리 짜기 좋아요. 전공을 살린 자소서가 생각보다 잘 먹혔습니다.',
    year: 2024,
  },
  {
    id: '2',
    major: '컴퓨터공학',
    admittedSchool: '서울대',
    leet: 162,
    gpa: 4.3,
    keywords: ['IT법', '개인정보', '테크법'],
    storySummary:
      '개인정보보호법, AI 규제 등 테크 분야 법무에 관심이 생겨 로스쿨을 결심했습니다. 컴공 전공자라는 점이 오히려 차별점이 됐고, 자소서에서 개발 경험과 법적 사고의 연결고리를 강조했습니다.',
    mentorMessage:
      '컴공 출신은 테크법으로 스토리 짜면 정말 강해요. 요즘 로스쿨들이 다양한 배경을 선호하는 추세라 오히려 유리했습니다.',
    year: 2024,
  },
  {
    id: '3',
    major: '사회학',
    admittedSchool: '연세대',
    leet: 138,
    gpa: 4.0,
    keywords: ['공익법', '인권', '사회정의'],
    storySummary:
      '사회학 전공으로 공익법 분야를 목표했습니다. LEET 점수가 높지 않았지만 자소서와 면접에서 일관된 공익 스토리로 승부했어요. 학부 시절 NGO 인턴 경험이 큰 역할을 했습니다.',
    mentorMessage:
      'LEET가 낮아도 자소서 완성도와 면접으로 뒤집을 수 있어요. 스토리의 일관성이 제일 중요합니다.',
    year: 2023,
  },
];

const MAJOR_OPTIONS = ['전체', '경영학', '컴퓨터공학', '사회학', '경제학', '정치외교학'];
const SCHOOL_OPTIONS = ['전체', '서울대', '고려대', '연세대', '성균관대', '한양대'];
const LEET_OPTIONS = [
  { label: '전체', min: 0, max: 999 },
  { label: '160+', min: 160, max: 999 },
  { label: '150~159', min: 150, max: 159 },
  { label: '140~149', min: 140, max: 149 },
  { label: '139 이하', min: 0, max: 139 },
];

export default function ArchivePage() {
  const [major, setMajor] = useState('전체');
  const [school, setSchool] = useState('전체');
  const [leetRange, setLeetRange] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = MOCK_ARCHIVE.filter((c) => {
    const leet = LEET_OPTIONS[leetRange];
    return (
      (major === '전체' || c.major === major) &&
      (school === '전체' || c.admittedSchool === school) &&
      c.leet >= leet.min && c.leet <= leet.max
    );
  });

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">합격 아카이브</h1>
        <p className="text-sm text-text-secondary mt-1">
          자유전공학부 출신 로스쿨 합격 선배들의 익명 케이스를 확인하세요
        </p>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-4">필터</h2>
        <div className="flex flex-wrap gap-6">
          {[
            { label: '1전공', value: major, options: MAJOR_OPTIONS, onChange: setMajor },
            { label: '합격 학교', value: school, options: SCHOOL_OPTIONS, onChange: setSchool },
          ].map(({ label, value, options, onChange }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">{label}</label>
              <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="text-sm border border-border-input rounded-md px-3 py-2 focus:outline-none focus:border-brand bg-white transition-colors"
              >
                {options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">LEET 구간</label>
            <select
              value={leetRange}
              onChange={(e) => setLeetRange(Number(e.target.value))}
              className="text-sm border border-border-input rounded-md px-3 py-2 focus:outline-none focus:border-brand bg-white transition-colors"
            >
              {LEET_OPTIONS.map((o, i) => <option key={o.label} value={i}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 케이스 목록 */}
      <p className="text-sm text-text-secondary -mt-2">{filtered.length}개의 케이스</p>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-10 text-center text-sm text-text-secondary">
          해당 조건의 케이스가 없습니다.
        </div>
      ) : (
        filtered.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            {/* 카드 헤더 */}
            <button
              className="w-full px-8 py-6 flex items-start justify-between hover:bg-gray-50 transition-colors text-left"
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            >
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-base font-semibold text-text-primary">
                    {c.major} · 공공거버넌스와리더십
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">{c.year}년 합격</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-full">
                    {c.admittedSchool} 합격
                  </span>
                  <span className="px-2.5 py-1 bg-page-bg text-text-secondary text-xs rounded-full border border-border">
                    LEET {c.leet}
                  </span>
                  <span className="px-2.5 py-1 bg-page-bg text-text-secondary text-xs rounded-full border border-border">
                    GPA {c.gpa}
                  </span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {c.keywords.map((k) => (
                    <span key={k} className="px-2 py-0.5 border border-border text-xs text-text-secondary rounded-full">
                      #{k}
                    </span>
                  ))}
                </div>
              </div>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`shrink-0 ml-4 mt-1 transition-transform text-text-secondary ${expanded === c.id ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* 펼쳐지는 상세 */}
            {expanded === c.id && (
              <div className="px-8 pb-6 border-t border-border space-y-4 pt-5">
                <div>
                  <p className="text-sm font-medium text-text-primary mb-2">합격 스토리</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{c.storySummary}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary mb-2">선배 한마디</p>
                  <p className="text-sm text-text-secondary leading-relaxed italic">"{c.mentorMessage}"</p>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      <p className="text-xs text-text-secondary text-center pb-2">
        모든 케이스는 멘토 동의 하에 익명으로 게재됩니다.
      </p>
    </div>
  );
}
