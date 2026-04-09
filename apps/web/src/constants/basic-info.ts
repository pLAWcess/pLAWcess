export type PersonalInfo = {
  name: string;
  affiliation: string;
  birthDate: string;
  gender: string;
  major1: string;
  major2: string;
  admissionYear: string;
  militaryStatus: string;
  academicStatus: string;
  graduationYear: string;
};

export type AdmissionEntry = { school: string; type: string };
export type AdmissionInfo = {
  가: { first: AdmissionEntry; second: AdmissionEntry };
  나: { first: AdmissionEntry; second: AdmissionEntry };
};

export const initialPersonalInfo: PersonalInfo = {
  name: '김단추',
  affiliation: '고려대학교 자유전공학부',
  birthDate: '2000.03.15.',
  gender: '남성',
  major1: '컴퓨터학과',
  major2: '공공거버넌스와리더십',
  admissionYear: '2020',
  militaryStatus: '군필여고생',
  academicStatus: '재학',
  graduationYear: '2026',
};

export const initialAdmissionInfo: AdmissionInfo = {
  가: {
    first: { school: '고려대학교', type: '일반전형' },
    second: { school: '-', type: '-' },
  },
  나: {
    first: { school: '서울대학교', type: '일반전형' },
    second: { school: '-', type: '-' },
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
