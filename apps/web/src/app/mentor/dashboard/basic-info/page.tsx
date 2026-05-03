'use client';

export default function MentorBasicInfoPage() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">기본정보</h1>
        <p className="text-sm text-text-secondary mt-1">
          멘티 시절 작성한 기본정보가 자동으로 표시됩니다. 멘토로 직접 가입한 경우 비어있을 수 있습니다.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm px-8 py-10 text-center text-sm text-text-secondary">
        준비 중입니다.
      </div>
    </div>
  );
}
