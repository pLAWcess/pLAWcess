import { notFound } from 'next/navigation';

// app/error.tsx 미리보기 전용 dev 라우트. 프로덕션 빌드에선 404.
// 사용: dev 서버에서 /dev/error-preview 로 접속.
// (next dev 의 빨간 오버레이는 X 로 닫으면 그 밑에 진짜 error.tsx 가 보임)
export default function ErrorPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  throw new Error('error.tsx 미리보기용 의도적 에러입니다.');
}
