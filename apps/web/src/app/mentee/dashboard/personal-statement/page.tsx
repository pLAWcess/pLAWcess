'use client';

export default function PersonalStatementPage() {
  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">자기소개서</h1>
        <p className="text-sm text-text-secondary mt-1">자기소개서를 작성하고 관리할 수 있습니다.</p>
      </div>
      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-16 flex items-center justify-center">
        <p className="text-text-secondary text-sm">준비 중입니다.</p>
      </div>
    </div>
  );
}
