import { LAW_SCHOOLS, MAJOR_OPTIONS } from './basic-info';

// 다른 모듈이 기존 경로(@/constants/mentor-basic-info)로 import할 수 있도록 re-export.
export { MAJOR_OPTIONS };

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

// 멘토 소속 로스쿨 자동완성은 'OO대학교 로스쿨' 표기로 표시.
// (멘티 지망학교 자동완성은 학교명만 — LAW_SCHOOLS 그대로 사용)
export const LAW_SCHOOL_NAMES = LAW_SCHOOLS.map((s) => `${s.name} 로스쿨`);

// 로스쿨 기수: 2009학년도 ~ 향후 20년
export const LAW_SCHOOL_GRADES = Array.from({ length: 17 }, (_, i) => `${17 - i}기`);

export const ACADEMIC_STATUS_OPTIONS = ['재학', '휴학', '졸업'];

export const MILITARY_STATUS_OPTIONS = ['군필', '미필', '해당없음'];

// 학부 전공은 basic-info.MAJOR_OPTIONS(고려대 실제 학과 목록)를 재사용한다.
// 자유전공학부 같은 실제 학과명을 검색하려면 추상 전공명 리스트는 부적합.


export const fieldRows: {
  label: string;
  key: keyof Omit<MentorPersonalInfo, 'name'>;
  type: 'text' | 'select' | 'autocomplete';
  options?: readonly string[];
}[][] = [
  [
    { label: '생년월일', key: 'birthDate', type: 'text' },
    { label: '성별', key: 'gender', type: 'select', options: GENDER_OPTIONS },
  ],
  [
    { label: '소속 로스쿨', key: 'affiliation', type: 'autocomplete', options: LAW_SCHOOL_NAMES },
    { label: '로스쿨 기수', key: 'lawSchoolGrade', type: 'select', options: LAW_SCHOOL_GRADES },
  ],
  [
    { label: '학적상태', key: 'academicStatus', type: 'select', options: ACADEMIC_STATUS_OPTIONS },
    { label: '병역여부', key: 'militaryStatus', type: 'select', options: MILITARY_STATUS_OPTIONS },
  ],
  [
    { label: '학부 제1전공', key: 'major1', type: 'autocomplete', options: MAJOR_OPTIONS },
    { label: '학부 제2전공', key: 'major2', type: 'autocomplete', options: MAJOR_OPTIONS },
  ],
  [
    { label: '학부 입학년도', key: 'admissionYear', type: 'text' },
    { label: '학부 졸업년도', key: 'graduationYear', type: 'text' },
  ],
];
