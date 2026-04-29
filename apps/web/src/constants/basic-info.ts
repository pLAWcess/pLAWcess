export type PersonalInfo = {
  name: string;
  affiliation: string;
  birthDate: string;
  gender: string;
  major1: string;
  major2: string;
  admissionYear: string;
  militaryStatus: string;   // DB 미지원 — 로컬 상태로만 유지
  academicStatus: string;
  graduationYear: string;
};

export type AdmissionEntry = { school: string; type: string };
export type AdmissionInfo = {
  가: { first: AdmissionEntry; second: AdmissionEntry };  // second는 DB 미지원
  나: { first: AdmissionEntry; second: AdmissionEntry };  // second는 DB 미지원
};

export const emptyPersonalInfo: PersonalInfo = {
  name: '',
  affiliation: '',
  birthDate: '',
  gender: '',
  major1: '',
  major2: '',
  admissionYear: '',
  militaryStatus: '',
  academicStatus: '',
  graduationYear: '',
};

export const emptyAdmissionInfo: AdmissionInfo = {
  가: {
    first: { school: '', type: '일반전형' },
    second: { school: '', type: '' },
  },
  나: {
    first: { school: '', type: '일반전형' },
    second: { school: '', type: '' },
  },
};

export const SCHOOL_OPTIONS = [
  '서울대학교', '고려대학교', '연세대학교', '성균관대학교',
  '한양대학교', '이화여자대학교', '경희대학교', '중앙대학교',
];

export const TYPE_OPTIONS = ['일반전형', '특별전형'];

export const fieldRows: { label: string; key: keyof Omit<PersonalInfo, 'name' | 'affiliation'>; type: 'text' | 'select'; options?: string[] }[][] = [
  [
    { label: '생년월일', key: 'birthDate', type: 'text' },
    { label: '성별', key: 'gender', type: 'select', options: ['남성', '여성', '기타'] },
  ],
  [
    { label: '제1전공', key: 'major1', type: 'text' },
    { label: '제2전공', key: 'major2', type: 'text' },
  ],
  [
    { label: '입학년도', key: 'admissionYear', type: 'text' },
    { label: '병역여부', key: 'militaryStatus', type: 'select', options: ['군필', '미필', '해당없음'] },
  ],
  [
    { label: '학적상태', key: 'academicStatus', type: 'select', options: ['재학', '휴학', '수료', '졸업 유예', '졸업'] },
    { label: '졸업년도', key: 'graduationYear', type: 'text' },
  ],
];
