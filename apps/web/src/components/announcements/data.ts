export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author: string;
};

// TODO: API 연결 후 실제 데이터로 교체 — GET /api/announcements
export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: '2026학년도 멘토 모집 안내',
    body: '2026학년도 pLAWcess 멘토 모집을 시작합니다. 자유전공학부 출신 법학대학원 합격자라면 누구나 지원 가능합니다.',
    created_at: '2026-04-10T00:00:00Z',
    author: '관리자',
  },
  {
    id: '2',
    title: '멘티 신청 마감일 변경',
    body: '멘티 신청 마감일이 2026년 4월 30일로 변경되었습니다. 기간 내 신청 부탁드립니다.',
    created_at: '2026-04-05T00:00:00Z',
    author: '관리자',
  },
];
