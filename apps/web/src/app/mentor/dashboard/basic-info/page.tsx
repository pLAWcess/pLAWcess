import { cookies } from 'next/headers';
import MentorBasicInfoClient from './MentorBasicInfoClient';
import { serverFetch, getActiveProcessYear } from '@/lib/server-fetch';
import { emptyMentorPersonalInfo, type MentorPersonalInfo } from '@/constants/mentor-basic-info';
import type { MentorBasicInfoData } from '@/lib/api';

export default async function MentorBasicInfoPage() {
  const token = (await cookies()).get('plawcess_token')?.value ?? '';
  const year = await getActiveProcessYear(token);
  const raw = await serverFetch<MentorBasicInfoData>(`/api/mentor/basic-info?year=${encodeURIComponent(year)}`, token);

  const initialData: MentorPersonalInfo = raw
    ? {
        ...emptyMentorPersonalInfo,
        name: raw.personal.name,
        affiliation: raw.personal.lawschool,
        birthDate: raw.personal.birthDate,
        gender: raw.personal.gender,
        lawSchoolGrade: raw.personal.lawschoolGrade ? `${raw.personal.lawschoolGrade}기` : '',
        academicStatus: raw.personal.academicStatus,
        militaryStatus: raw.personal.militaryStatus,
        major1: raw.personal.major1,
        major2: raw.personal.major2,
        admissionYear: raw.personal.admissionYear,
        graduationYear: raw.personal.graduationYear,
      }
    : emptyMentorPersonalInfo;

  return <MentorBasicInfoClient initialData={initialData} year={year} />;
}
