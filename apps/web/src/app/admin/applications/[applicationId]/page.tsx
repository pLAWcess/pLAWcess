'use client';

import { useState } from 'react';
import Link from 'next/link';
import { use } from 'react';

type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'revision_requested';

// TODO: API 연결 후 실제 데이터로 교체
const MOCK_DETAIL: Record<string, {
  name: string; email: string; phone: string; student_id: string;
  major: string; birth_date: string; graduation_year: number;
  gpa: number | null; gpa_major: number | null;
  leet_verbal_standard: number | null; leet_reasoning_standard: number | null; leet_score: number | null;
  toeic: number | null; toefl: number | null;
  target_school_ga: string | null; target_school_na: string | null;
  has_leet_experience: boolean; is_special_admission: boolean;
  core_keywords: string | null; story_summary: string | null;
  strengths_weaknesses: string | null; desired_mentor: string | null;
  application_status: ApplicationStatus; submitted_at: string;
}> = {
  'app-1': {
    name: '김자전', email: 'kim@korea.ac.kr', phone: '010-1234-5678',
    student_id: '2021120001', major: '자유전공학부', birth_date: '2001-03-15',
    graduation_year: 2025,
    gpa: 4.1, gpa_major: 4.3,
    leet_verbal_standard: 72, leet_reasoning_standard: 70, leet_score: 142,
    toeic: 945, toefl: null,
    target_school_ga: '고려대학교', target_school_na: '연세대학교',
    has_leet_experience: true, is_special_admission: false,
    core_keywords: '논리적 사고, 문제해결력, 사회정의',
    story_summary: '학부 시절 법학 관련 동아리 활동과 학술 연구를 통해 법조인의 꿈을 키워왔습니다.',
    strengths_weaknesses: '강점: 꼼꼼한 분석력. 약점: 발표 시 긴장.',
    desired_mentor: '자소서 첨삭과 면접 준비를 함께해줄 멘토를 원합니다.',
    application_status: 'submitted', submitted_at: '2026-04-10T09:23:00Z',
  },
  'app-2': {
    name: '이지원', email: 'lee@korea.ac.kr', phone: '010-9876-5432',
    student_id: '2020110032', major: '자유전공학부', birth_date: '2000-07-22',
    graduation_year: 2024,
    gpa: 4.3, gpa_major: 4.4,
    leet_verbal_standard: 80, leet_reasoning_standard: 79, leet_score: 159,
    toeic: null, toefl: 108,
    target_school_ga: '서울대학교', target_school_na: '고려대학교',
    has_leet_experience: true, is_special_admission: false,
    core_keywords: '국제법, 인권, 글로벌 역량',
    story_summary: '교환학생과 국제 학술대회 참가를 통해 국제법 분야 진출의 꿈을 확고히 했습니다.',
    strengths_weaknesses: '강점: 영어 커뮤니케이션. 약점: 국내법 실무 경험 부족.',
    desired_mentor: null,
    application_status: 'approved', submitted_at: '2026-04-08T14:10:00Z',
  },
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: '검토 대기',
  approved: '승인',
  rejected: '반려',
  revision_requested: '보완 요청',
};

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  submitted: 'bg-blue-50 text-blue-600',
  approved: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-500',
  revision_requested: 'bg-yellow-50 text-yellow-600',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3 border-b border-border last:border-0">
      <span className="w-32 shrink-0 text-sm text-text-secondary">{label}</span>
      <span className="text-sm text-text-primary">{value ?? '-'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-xl px-6 py-5">
      <h2 className="text-sm font-semibold text-text-primary mb-2">{title}</h2>
      <div>{children}</div>
    </div>
  );
}

export default function AdminApplicationDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = use(params);
  const app = MOCK_DETAIL[applicationId];

  const [status, setStatus] = useState<ApplicationStatus>(app?.application_status ?? 'submitted');
  const [memo, setMemo] = useState('');

  if (!app) {
    return (
      <div className="text-center py-20 text-text-secondary text-sm">
        지원서를 찾을 수 없습니다.{' '}
        <Link href="/admin/applications" className="text-brand hover:underline">목록으로</Link>
      </div>
    );
  }

  function handleStatusChange(next: ApplicationStatus) {
    // TODO: API 연결 - PATCH /api/admin/applications/:id/status
    setStatus(next);
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/applications" className="text-text-secondary hover:text-text-primary transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-text-primary">{app.name} 지원서</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
          </span>
        </div>
        <p className="text-xs text-text-secondary">
          제출일: {new Date(app.submitted_at).toLocaleDateString('ko-KR')}
        </p>
      </div>

      {/* 기본 정보 */}
      <Section title="기본 정보">
        <InfoRow label="이름" value={app.name} />
        <InfoRow label="이메일" value={app.email} />
        <InfoRow label="연락처" value={app.phone} />
        <InfoRow label="학번" value={app.student_id} />
        <InfoRow label="전공" value={app.major} />
        <InfoRow label="생년월일" value={app.birth_date} />
        <InfoRow label="졸업 예정년도" value={`${app.graduation_year}년`} />
        <InfoRow label="LEET 응시 경험" value={app.has_leet_experience ? '있음' : '없음'} />
        <InfoRow label="특별전형" value={app.is_special_admission ? '해당' : '해당 없음'} />
      </Section>

      {/* 희망 학교 */}
      <Section title="희망 로스쿨">
        <InfoRow label="가군" value={app.target_school_ga} />
        <InfoRow label="나군" value={app.target_school_na} />
      </Section>

      {/* 정량 데이터 */}
      <Section title="정량 데이터">
        <InfoRow label="전체 GPA" value={app.gpa} />
        <InfoRow label="전공 GPA" value={app.gpa_major} />
        <InfoRow
          label="LEET 표준점수"
          value={app.leet_score != null
            ? `${app.leet_score}점 (언어 ${app.leet_verbal_standard} / 추리 ${app.leet_reasoning_standard})`
            : null}
        />
        <InfoRow
          label="어학"
          value={[app.toeic && `TOEIC ${app.toeic}`, app.toefl && `TOEFL ${app.toefl}`].filter(Boolean).join(' / ') || null}
        />
      </Section>

      {/* 정성 데이터 */}
      <Section title="정성 데이터">
        <InfoRow label="핵심 키워드" value={app.core_keywords} />
        <div className="py-3 border-b border-border last:border-0">
          <p className="text-sm text-text-secondary mb-2">스토리 요약</p>
          <p className="text-sm text-text-primary whitespace-pre-wrap">{app.story_summary ?? '-'}</p>
        </div>
        <div className="py-3">
          <p className="text-sm text-text-secondary mb-2">강점/약점</p>
          <p className="text-sm text-text-primary whitespace-pre-wrap">{app.strengths_weaknesses ?? '-'}</p>
        </div>
      </Section>

      {/* 기타 고민 */}
      <Section title="희망 멘토">
        <p className="text-sm text-text-primary whitespace-pre-wrap py-2">{app.desired_mentor ?? '-'}</p>
      </Section>

      {/* 관리자 액션 */}
      <div className="bg-white border border-border rounded-xl px-6 py-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">심사 처리</h2>

        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'approved', label: '승인' },
            { key: 'revision_requested', label: '보완 요청' },
            { key: 'rejected', label: '반려' },
          ] as { key: ApplicationStatus; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleStatusChange(key)}
              className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                status === key
                  ? key === 'approved'
                    ? 'bg-green-600 text-white border-green-600'
                    : key === 'rejected'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-yellow-500 text-white border-yellow-500'
                  : 'bg-white text-text-secondary border-border hover:border-text-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">관리자 메모</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="내부 메모를 입력하세요 (멘티에게 표시되지 않음)"
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand resize-none transition-colors"
          />
        </div>

        <button
          className="px-5 py-2.5 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors"
          onClick={() => {
            // TODO: API 연결 - 상태 저장 + 메모 저장
            alert('저장되었습니다.');
          }}
        >
          저장
        </button>
      </div>
    </div>
  );
}
