'use client';

import { useEffect, useState } from 'react';
import { getShareSettings, patchShareSettings, type ShareSettings } from '@/lib/api';

const ITEMS: Array<{ key: keyof ShareSettings; label: string; desc: string }> = [
  { key: 'basicInfo', label: '기본정보', desc: '생년월일, 성별, 학교, 전공 등' },
  { key: 'quantitative', label: '정량 데이터', desc: 'LEET, GPA, 어학 성적' },
  { key: 'qualitative', label: '정성 데이터', desc: '진로 목표, 핵심 키워드, 활동 이력' },
  { key: 'statement', label: '자기소개서', desc: '가/나군 자소서 본문' },
  { key: 'requests', label: '요청사항', desc: '강점·약점, 원하는 멘토상, 특이사항' },
];

export default function MenteeShareSettingsCard() {
  const [settings, setSettings] = useState<ShareSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof ShareSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const year = String(new Date().getFullYear());
    getShareSettings(year)
      .then((res) => {
        if (cancelled) return;
        setSettings(res.settings);
      })
      .catch(() => {
        if (cancelled) return;
        setError('공개 설정을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(key: keyof ShareSettings) {
    if (!settings) return;
    const next = !settings[key];
    setSavingKey(key);
    try {
      const res = await patchShareSettings(String(new Date().getFullYear()), {
        [key]: next,
      });
      setSettings(res.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-4">공개 설정</h2>
        <p className="text-sm text-text-secondary">불러오는 중...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
        <h2 className="text-base font-semibold text-text-primary mb-4">공개 설정</h2>
        <p className="text-sm text-text-secondary">{error ?? '공개 설정 정보가 없습니다.'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-4 sm:px-8 py-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-text-primary">공개 설정</h2>
        <p className="text-sm text-text-secondary mt-1">
          매칭된 멘토에게 공유할 정보를 선택하세요.
        </p>
      </div>

      <div className="divide-y divide-border">
        {ITEMS.map(({ key, label, desc }) => {
          const checked = settings[key];
          const saving = savingKey === key;
          return (
            <div key={key} className="flex items-center gap-4 py-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">{label}</p>
                <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => toggle(key)}
                disabled={saving}
                className={`shrink-0 inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed ${
                  checked ? 'bg-brand' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                    checked ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
    </div>
  );
}
