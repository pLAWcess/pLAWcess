'use client';

export default function MenteeHistoryPage() {
  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">지난 기록</h1>
        <p className="text-sm text-text-secondary mt-1">이전 연도에 작성한 나의 데이터를 확인할 수 있습니다.</p>
      </div>
      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-16 flex items-center justify-center">
        <p className="text-text-secondary text-sm">준비 중입니다.</p>
      </div>
    </div>
  );
}
