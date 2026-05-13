'use client';

import { useEffect, useState } from 'react';
import type { ShareSettings } from '@/lib/api';

const ITEMS: Array<{ key: keyof ShareSettings; label: string; desc: string }> = [
  { key: 'basicInfo', label: '기본정보', desc: '생년월일, 성별, 학교, 전공 등' },
  { key: 'quantitative', label: '정량 데이터', desc: 'LEET, GPA, 어학 성적' },
  { key: 'qualitative', label: '정성 데이터', desc: '진로 목표, 핵심 키워드, 활동 이력' },
  { key: 'statement', label: '자기소개서', desc: '가/나군 자소서 본문' },
  { key: 'requests', label: '요청사항', desc: '강점·약점, 원하는 멘토상, 특이사항' },
];

type Props = {
  initial: ShareSettings;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (settings: ShareSettings) => void;
};

// 부모가 조건부 마운트({open && <Modal/>}) 한다고 가정한다.
export default function ShareSettingsModal({
  initial,
  submitting,
  onClose,
  onConfirm,
}: Props) {
  const [settings, setSettings] = useState<ShareSettings>(initial);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const toggle = (key: keyof ShareSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 sm:px-8 py-6 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary">공개 설정</h2>
          <p className="text-sm text-text-secondary mt-1">
            매칭된 멘토에게 공유할 정보를 선택하세요. 매칭 발표 전까지는 언제든 수정할 수 있습니다.
          </p>
        </div>

        <div className="px-6 sm:px-8 py-2 divide-y divide-border">
          {ITEMS.map(({ key, label, desc }) => {
            const checked = settings[key];
            return (
              <label
                key={key}
                className="flex items-center gap-4 py-4 cursor-pointer"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-primary">{label}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  onClick={() => toggle(key)}
                  className={`shrink-0 inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 ease-out ${
                    checked ? 'bg-brand' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                      checked ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </label>
            );
          })}
        </div>

        <div className="px-6 sm:px-8 py-4 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm(settings)}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {submitting ? '제출 중...' : '제출하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
