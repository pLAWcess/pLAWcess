'use client';

import { useRef, useState } from 'react';
import { uploadSchoolTemplate, type SchoolTemplate } from '@/lib/api';

const SCHOOLS = [
  '서울대학교', '고려대학교', '연세대학교', '성균관대학교',
  '한양대학교', '이화여자대학교', '경희대학교',
];
const YEAR = new Date().getFullYear().toString();

export default function PersonalStatementsClient({
  initialTemplates,
}: {
  initialTemplates: SchoolTemplate[];
}) {
  const [templates, setTemplates] = useState<Record<string, SchoolTemplate>>(
    () => Object.fromEntries(initialTemplates.map((t) => [t.school_name, t])),
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const pendingSchoolRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function triggerUpload(school: string) {
    pendingSchoolRef.current = school;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const school = pendingSchoolRef.current;
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file || !school) return;
    if (!file.name.match(/\.(hwp|hwpx)$/i)) {
      alert('.hwp 또는 .hwpx 파일만 업로드할 수 있습니다.');
      return;
    }
    setUploading(school);
    try {
      await uploadSchoolTemplate(YEAR, school, file);
      const now = new Date().toISOString();
      setTemplates((prev) => ({
        ...prev,
        [school]: { school_name: school, uploaded_at: now, updated_at: now },
      }));
    } catch (e) {
      alert(e instanceof Error ? e.message : '업로드 실패');
    } finally {
      setUploading(null);
      pendingSchoolRef.current = null;
    }
  }

  return (
    <div className="flex flex-col gap-6 page-container w-full">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">자기소개서 양식 관리</h1>
        <p className="text-sm text-text-secondary mt-1">
          학교별 자기소개서 양식을 업로드합니다. 멘티는 지망 학교에 맞는 양식을 자동으로 확인할 수 있습니다.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".hwp,.hwpx"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col gap-3">
        {SCHOOLS.map((school) => {
          const template = templates[school];
          const isUploading = uploading === school;
          return (
            <div
              key={school}
              className="bg-white rounded-xl border border-border shadow-sm px-8 py-5 flex items-center justify-between"
            >
              <div>
                <p className="text-base font-medium text-text-primary">{school}</p>
                <p className="text-sm text-text-secondary mt-0.5">
                  {template
                    ? `최근 업데이트: ${new Date(template.updated_at).toLocaleDateString('ko-KR')}`
                    : '양식 미업로드'}
                </p>
              </div>
              <button
                onClick={() => triggerUpload(school)}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-text-secondary bg-page-bg rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isUploading ? '업로드 중...' : template ? '파일 교체' : '업로드'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
