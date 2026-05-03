'use client';

import QuantitativeContent from '@/components/quantitative/QuantitativeContent';

export default function QuantitativePage() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">정량 데이터</h1>
        <p className="text-sm text-text-secondary mt-1">시험 성적과 학업 정보를 입력해주세요</p>
      </div>

      <QuantitativeContent />
    </div>
  );
}
