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
  가: AdmissionEntry;
  나: AdmissionEntry;
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
  가: { school: '', type: '일반전형' },
  나: { school: '', type: '일반전형' },
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

// 고려대학교 학과 목록
export const MAJOR_OPTIONS: readonly string[] = [
  // 인문대학
  '국어국문학과', '영어영문학과', '한국사학과', '사학과', '철학과',
  '독어독문학과', '불어불문학과', '중어중문학과', '일어일문학과', '노어노문학과',
  '한문학과', '언어학과', '사회학과',
  // 사회과학대학
  '정치외교학과', '경제학과', '심리학부', '행정학과', '통계학과',
  // 경영대학
  '경영학과',
  // 미디어학부
  '미디어학부',
  // 이과대학
  '수학과', '물리학과', '화학과', '지구환경과학과', '생명과학부',
  // 공과대학
  '화공생명공학과', '신소재공학부', '건축사회환경공학부', '건축학과',
  '기계공학부', '산업경영공학부', '전기전자공학부', '컴퓨터학과', '인공지능학과',
  // 국제대학
  '국제학부',
  // 생명환경과학대학
  '식품공학과', '환경생태공학부', '식품자원경제학과', '생명공학부', '생명과학과',
  // 보건과학대학
  '보건환경융합과학부', '바이오시스템의과학부', '바이오의공학부',
  // 기타
  '스마트보안학부', '융합에너지공학과',
  '공공거버넌스와 리더십'
];

export const fieldRows: { label: string; key: keyof Omit<PersonalInfo, 'name' | 'affiliation'>; type: 'text' | 'select' | 'autocomplete'; options?: readonly string[] }[][] = [
  [
    { label: '생년월일', key: 'birthDate', type: 'text' },
    { label: '성별', key: 'gender', type: 'select', options: ['남성', '여성', '기타'] },
  ],
  [
    { label: '제1전공', key: 'major1', type: 'autocomplete', options: MAJOR_OPTIONS },
    { label: '제2전공', key: 'major2', type: 'autocomplete', options: MAJOR_OPTIONS },
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
