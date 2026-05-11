import { cookies } from 'next/headers';
import BasicInfoClient from './BasicInfoClient';
import { serverFetch, getActiveProcessYear } from '@/lib/server-fetch';
import { emptyPersonalInfo, emptyAdmissionInfo, type PersonalInfo, type AdmissionInfo } from '@/constants/basic-info';
import type { BasicInfoData, AdmissionSlot } from '@/lib/api';

export default async function BasicInfoPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const year = await getActiveProcessYear(token);
  const raw = await serverFetch<BasicInfoData>(`/api/mentee/basic-info?year=${encodeURIComponent(year)}`, token);

  let initialPersonal: PersonalInfo = emptyPersonalInfo;
  let initialAdmission: AdmissionInfo = emptyAdmissionInfo;
  let initialPreferredGroup: '가' | '나' | null = null;

  if (raw) {
    initialPersonal = {
      ...emptyPersonalInfo,
      name: raw.personal.name,
      affiliation: raw.personal.affiliation,
      birthDate: raw.personal.birthDate,
      gender: raw.personal.gender,
      major1: raw.personal.major1,
      major2: raw.personal.major2,
      admissionYear: raw.personal.admissionYear,
      academicStatus: raw.personal.academicStatus,
      graduationYear: raw.personal.graduationYear,
      militaryStatus: raw.personal.militaryStatus,
    };

    const fromApi = (s: AdmissionSlot): { school: string; type: string } => ({
      school: s.school,
      type: s.isSpecial ? '특별전형' : '일반전형',
    });
    initialAdmission = {
      가: fromApi(raw.admission.가),
      나: fromApi(raw.admission.나),
    };
    initialPreferredGroup = raw.admission.preferredGroup ?? null;
  }

  return (
    <BasicInfoClient
      initialPersonal={initialPersonal}
      initialAdmission={initialAdmission}
      initialPreferredGroup={initialPreferredGroup}
      year={year}
    />
  );
}
