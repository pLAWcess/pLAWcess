'use client';

import { useState } from 'react';

const TABS = ['대시보드', '교내', '대외', '사회경험', '자격·시험'] as const;
type Tab = typeof TABS[number];

function AddItemPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-xl relative">
      <span className="absolute top-3 left-4 text-xs font-medium text-text-secondary bg-page-bg px-2 py-0.5 rounded">
        미리보기
      </span>
      <button className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center hover:bg-brand-muted transition-colors">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <span className="mt-3 text-sm font-medium text-text-secondary">항목 추가</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-20 h-20 rounded-full bg-page-bg flex items-center justify-center text-text-placeholder">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-text-primary">분석을 위해 정보를 입력해주세요</p>
        <p className="text-sm text-text-secondary mt-1">활동 정보를 입력하면 AI가 자동으로 경험을 분석해드립니다</p>
      </div>
      <button className="mt-2 px-5 py-2.5 text-sm text-white bg-brand rounded-md hover:bg-brand-dark transition-colors">
        샘플 데이터 불러오기
      </button>
    </div>
  );
}

export default function QualitativePage() {
  const [activeTab, setActiveTab] = useState<Tab>('대시보드');

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">정성 데이터</h1>
        <p className="text-sm text-text-secondary mt-1">경험과 활동 정보를 입력하고 AI 분석을 받아보세요</p>
      </div>

      {/* 탭 */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex border-b border-border px-2 pt-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-md transition-colors ${
                activeTab === tab
                  ? 'bg-brand text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="px-8 py-6">
          {activeTab === '대시보드' ? <EmptyState /> : <AddItemPlaceholder />}
        </div>
      </div>
    </div>
  );
}
