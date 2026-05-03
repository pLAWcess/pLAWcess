export type MentorPersonalInfo = {
  name: string;
  affiliation: string;
  birthDate: string;
  gender: string;
  major1: string;
  major2: string;
  admissionYear: string;
  lawSchoolAdmissionYear: string;
  lawSchoolGrade: string;
  academicStatus: string;
  militaryStatus: string;
  graduationYear: string;
};

export const emptyMentorPersonalInfo: MentorPersonalInfo = {
  name: '',
  affiliation: '',
  birthDate: '',
  gender: '',
  major1: '',
  major2: '',
  admissionYear: '',
  lawSchoolAdmissionYear: '',
  lawSchoolGrade: '',
  academicStatus: '',
  militaryStatus: '',
  graduationYear: '',
};

export const GENDER_OPTIONS = ['남성', '여성', '기타'];
export const LAW_SCHOOLS = [
  '강원대학교',
  '건국대학교',
  '경북대학교',
  '경희대학교',
  '고려대학교',
  '동아대학교',
  '부산대학교',
  '서강대학교',
  '서울대학교',
  '서울시립대학교',
  '성균관대학교',
  '아주대학교',
  '연세대학교',
  '영남대학교',
  '원광대학교',
  '이화여자대학교',
  '인하대학교',
  '전남대학교',
  '전북대학교',
  '중앙대학교',
  '제주대학교',
  '충남대학교',
  '충북대학교',
  '한국외국어대학교',
  '한양대학교',
];

// 로스쿨 기수는 입학년도 기준 (예: 2024년 입학 -> 2024학년도)
export const LAW_SCHOOL_GRADES = Array.from({ length: 20 }, (_, i) => {
  const year = 2009 + i;
  return `${year}학년도`;
});

export const ACADEMIC_STATUS_OPTIONS = ['재학', '휴학', '수료', '졸업 유예', '졸업'];
export const MILITARY_STATUS_OPTIONS = ['군필', '미필', '해당없음'];

export const fieldRows: { label: string; key: keyof Omit<MentorPersonalInfo, 'name'>; type: 'text' | 'select'; options?: string[] }[][] = [
  [
    { label: '생년월일', key: 'birthDate', type: 'text' },
    { label: '성별', key: 'gender', type: 'select', options: GENDER_OPTIONS },
  ],
  [
    { label: '소속 로스쿨', key: 'affiliation', type: 'select', options: LAW_SCHOOLS },
    { label: '로스쿨 기수', key: 'lawSchoolAdmissionYear', type: 'select', options: LAW_SCHOOL_GRADES },
  ],
  [
    { label: '학적상태', key: 'academicStatus', type: 'select', options: ACADEMIC_STATUS_OPTIONS },
    { label: '병역여부', key: 'militaryStatus', type: 'select', options: MILITARY_STATUS_OPTIONS },
  ],
  [
    { label: '학부 제1전공', key: 'major1', type: 'text' },
    { label: '학부 제2전공', key: 'major2', type: 'text' },
  ],
  [
    { label: '학부 입학년도', key: 'admissionYear', type: 'text' },
    { label: '학부 졸업년도', key: 'graduationYear', type: 'text' },
  ],
];
