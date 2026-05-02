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
    second: { school: '', type: '일반전형' },
  },
  나: {
    first: { school: '', type: '일반전형' },
    second: { school: '', type: '일반전형' },
  },
};

export type LawSchool = {
  name: string;
  inGa: boolean;
  inNa: boolean;
};

// 2027학년도 전국 25개 법학전문대학원 가군·나군 모집 분류
// 출처: https://www.infogoodman.com/2026/04/2027-law-school-ga-na-admission-quota.html
export const LAW_SCHOOLS: readonly LawSchool[] = [
  { name: '강원대학교',     inGa: false, inNa: true  },
  { name: '건국대학교',     inGa: true,  inNa: false },
  { name: '경북대학교',     inGa: true,  inNa: true  },
  { name: '경희대학교',     inGa: true,  inNa: false },
  { name: '고려대학교',     inGa: false, inNa: true  },
  { name: '동아대학교',     inGa: true,  inNa: true  },
  { name: '부산대학교',     inGa: true,  inNa: true  },
  { name: '서강대학교',     inGa: true,  inNa: true  },
  { name: '서울대학교',     inGa: true,  inNa: false },
  { name: '서울시립대학교', inGa: true,  inNa: false },
  { name: '성균관대학교',   inGa: false, inNa: true  },
  { name: '아주대학교',     inGa: true,  inNa: true  },
  { name: '연세대학교',     inGa: false, inNa: true  },
  { name: '영남대학교',     inGa: true,  inNa: true  },
  { name: '원광대학교',     inGa: true,  inNa: true  },
  { name: '이화여자대학교', inGa: false, inNa: true  },
  { name: '인하대학교',     inGa: true,  inNa: true  },
  { name: '전남대학교',     inGa: true,  inNa: true  },
  { name: '전북대학교',     inGa: true,  inNa: true  },
  { name: '중앙대학교',     inGa: true,  inNa: false },
  { name: '제주대학교',     inGa: true,  inNa: true  },
  { name: '충남대학교',     inGa: true,  inNa: true  },
  { name: '충북대학교',     inGa: true,  inNa: true  },
  { name: '한국외국어대학교', inGa: true, inNa: false },
  { name: '한양대학교',     inGa: false, inNa: true  },
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
