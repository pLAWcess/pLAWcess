'use client';

import { useState } from 'react';

// TODO: API 연결 후 실제 데이터로 교체
const MOCK_MENTEES = [
  {
    matchId: '1',
    name: '김자전',
    email: 'kim@korea.ac.kr',
    phone: '010-1234-5678',
    targetSchoolGa: '고려대학교',
    targetSchoolNa: '연세대학교',
    desiredMentor: '자소서와 면접 준비를 도와줄 멘토를 원합니다.',
  },
  {
    matchId: '2',
    name: '이지원',
    email: 'lee@korea.ac.kr',
    phone: '010-9876-5432',
    targetSchoolGa: '서울대학교',
    targetSchoolNa: null,
    desiredMentor: null,
  },
];

export default function MentorDashboardPage() {
  const [kakaoLink, setKakaoLink] = useState('');
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!kakaoLink) return;
    navigator.clipboard.writeText(kakaoLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-xl font-bold text-text-primary">멘토 대시보드</h1>
        <p className="mt-1 text-sm text-text-secondary">매칭된 멘티 목록입니다.</p>
      </div>

      {/* 카카오톡 오픈채팅 */}
      <div className="bg-white border border-border rounded-xl p-5 max-w-md">
        <p className="text-sm font-medium text-text-primary">카카오톡 오픈채팅 링크</p>
        <div className="flex gap-2 mt-2">
          <input
            type="url"
            value={kakaoLink}
            onChange={(e) => setKakaoLink(e.target.value)}
            placeholder="https://open.kakao.com/o/..."
            className="flex-1 px-3 py-2 text-sm border border-border-input rounded-md focus:outline-none focus:border-brand transition-colors"
          />
          <button
            onClick={handleCopy}
            disabled={!kakaoLink}
            className="px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-40"
          >
            {copied ? '복사됨' : '복사'}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-text-secondary">링크를 입력하고 복사해 멘티에게 공유하세요.</p>
      </div>

      {/* 멘티 카드 목록 */}
      {MOCK_MENTEES.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-10 text-center text-text-secondary text-sm">
          아직 매칭된 멘티가 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {MOCK_MENTEES.map((mentee) => (
            <div key={mentee.matchId} className="bg-white border border-border rounded-xl p-5 space-y-3">
              <div>
                <p className="font-semibold text-text-primary">{mentee.name}</p>
                <p className="text-sm text-text-secondary">{mentee.email}</p>
                {mentee.phone && (
                  <p className="text-sm text-text-secondary">{mentee.phone}</p>
                )}
              </div>
              <div className="pt-3 border-t border-border space-y-1">
                {mentee.targetSchoolGa && (
                  <p className="text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">가군</span> {mentee.targetSchoolGa}
                  </p>
                )}
                {mentee.targetSchoolNa && (
                  <p className="text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">나군</span> {mentee.targetSchoolNa}
                  </p>
                )}
              </div>
              {mentee.desiredMentor && (
                <p className="text-xs text-text-secondary italic border-t border-border pt-3">
                  "{mentee.desiredMentor}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
