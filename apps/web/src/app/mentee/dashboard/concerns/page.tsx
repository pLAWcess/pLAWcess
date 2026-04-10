'use client';

import ConcernCard from '@/components/concerns/ConcernCard';

export default function ConcernsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">기타 고민</h1>
        <p className="text-sm text-text-secondary mt-1">멘토에게 전달할 고민과 질문을 작성해주세요</p>
      </div>

      <ConcernCard
        title="강점 및 약점"
        description="본인이 생각하는 강점과 약점을 자유롭게 작성해주세요"
        placeholder="예) 강점: 꾸준한 대외활동 경험, 높은 GPA&#10;약점: LEET 준비 기간이 짧음, 법학 과목 이수 부족"
        initialValue=""
      />

      <ConcernCard
        title="희망 멘토상 및 고민"
        description="어떤 멘토를 만나고 싶은지, 멘토에게 묻고 싶은 질문을 작성해주세요"
        placeholder="예) 비슷한 스펙으로 합격한 경험이 있는 멘토를 희망합니다.&#10;자소서 방향성에 대한 조언을 받고 싶습니다."
        initialValue=""
      />

      <ConcernCard
        title="특이사항"
        description="본인만이 가지고 있는 특이사항이나, 멘토에게 꼭 전달하고 싶은 내용을 작성해주세요"
        placeholder="예) 컴퓨터학과의 장점을 살리고싶습니다.&#10;법학학점이 낮습니다."
        initialValue=""
      />
    </div>
  );
}
