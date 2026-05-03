import { LAW_SCHOOLS } from './basic-info';

export type MentorPersonalInfo = {
  name: string;
  affiliation: string;       // 소속 로스쿨
  birthDate: string;
  gender: string;
  lawSchoolGrade: string;    // 로스쿨 기수 (입학년도 기준)
  academicStatus: string;
  militaryStatus: string;
  major1: string;
  major2: string;
  admissionYear: string;     // 학부 입학년도
  graduationYear: string;    // 학부 졸업년도
};

export const emptyMentorPersonalInfo: MentorPersonalInfo = {
  name: '',
  affiliation: '',
  birthDate: '',
  gender: '',
  lawSchoolGrade: '',
  academicStatus: '',
  militaryStatus: '',
  major1: '',
  major2: '',
  admissionYear: '',
  graduationYear: '',
};

export const GENDER_OPTIONS = ['남성', '여성', '기타'];

export const LAW_SCHOOL_NAMES = LAW_SCHOOLS.map((s) => s.name);

// 로스쿨 기수: 2009학년도 ~ 향후 20년
export const LAW_SCHOOL_GRADES = Array.from({ length: 20 }, (_, i) => `${2009 + i}학년도`);

export const ACADEMIC_STATUS_OPTIONS = ['재학', '휴학', '졸업'];

export const MILITARY_STATUS_OPTIONS = ['군필', '미필', '해당없음'];

// 학부 전공 — 일반적인 전공 + 기타
export const MAJOR_OPTIONS = [
  '법학',
  '경영학',
  '경제학',
  '정치외교학',
  '행정학',
  '사회학',
  '심리학',
  '교육학',
  '국어국문학',
  '영어영문학',
  '사학',
  '철학',
  '수학',
  '물리학',
  '화학',
  '생명과학',
  '컴퓨터공학',
  '전자공학',
  '기계공학',
  '화학공학',
  '산업공학',
  '건축학',
  '의학',
  '약학',
  '간호학',
  '기타',
];

// 학부 입학·졸업년도: 1990 ~ 현재+5
const CURRENT_YEAR = new Date().getFullYear();
export const UNDERGRAD_YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR + 5 - 1990 + 1 },
  (_, i) => `${1990 + i}`,
);

export const fieldRows: {
  label: string;
  key: keyof Omit<MentorPersonalInfo, 'name'>;
  type: 'text' | 'select';
  options?: string[];
}[][] = [
  [
    { label: '생년월일', key: 'birthDate', type: 'text' },
    { label: '성별', key: 'gender', type: 'select', options: GENDER_OPTIONS },
  ],
  [
    { label: '소속 로스쿨', key: 'affiliation', type: 'select', options: LAW_SCHOOL_NAMES },
    { label: '로스쿨 기수', key: 'lawSchoolGrade', type: 'select', options: LAW_SCHOOL_GRADES },
  ],
  [
    { label: '학적상태', key: 'academicStatus', type: 'select', options: ACADEMIC_STATUS_OPTIONS },
    { label: '병역여부', key: 'militaryStatus', type: 'select', options: MILITARY_STATUS_OPTIONS },
  ],
  [
    { label: '학부 제1전공', key: 'major1', type: 'select', options: MAJOR_OPTIONS },
    { label: '학부 제2전공', key: 'major2', type: 'select', options: MAJOR_OPTIONS },
  ],
  [
    { label: '학부 입학년도', key: 'admissionYear', type: 'select', options: UNDERGRAD_YEAR_OPTIONS },
    { label: '학부 졸업년도', key: 'graduationYear', type: 'select', options: UNDERGRAD_YEAR_OPTIONS },
  ],
];
