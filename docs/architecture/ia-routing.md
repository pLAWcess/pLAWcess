# pLAWcess IA & Page Routing

## 라우트 트리

```
/
├── /mentee
│   ├── /dashboard
│   │   ├── /basic-info        # 기본 정보 입력
│   │   ├── /quantitative      # 서류-정량 입력
│   │   ├── /qualitative       # 서류-자소서 입력
│   │   └── /concerns          # 기타 고민 입력
│   ├── /applications          # 프로세스 사업 신청
│   ├── /results               # 합격 결과 입력
│   └── /settings              # 멘티 설정
│
└── /admin
    ├── /dashboard             # 관리자 대시보드
    ├── /users                 # 회원 목록
    │   └── /:userId           # 회원 상세
    ├── /applications          # 신청 관리
    └── /matchings
        ├── /targets           # 매칭 대상 목록
        ├── /run               # AI 매칭 실행
        └── /results           # 매칭 결과 수정/확정
```

---

## Mentee 라우팅

| Route | 페이지명 | 주요 기능 |
|-------|---------|----------|
| `/mentee/dashboard/basic-info` | 기본 정보 입력 | 이름, 학번, 졸업예정연도, 리트 응시 여부, 법학 이수 여부 |
| `/mentee/dashboard/quantitative` | 서류-정량 입력 | 학점, 리트 점수, 어학 점수, 지원 희망 학교(가/나군), 특별전형 여부 |
| `/mentee/dashboard/qualitative` | 서류-자소서 입력 | 정성 활동(봉사/학술대회/동아리/공모전 등), 핵심 키워드, 진로 스토리 요약 |
| `/mentee/dashboard/concerns` | 기타 고민 입력 | 강점/약점, 희망 멘토상 및 질문 |
| `/mentee/applications` | 프로세스 사업 신청 | 당해 연도 멘티 신청 폼 제출 + 상태 조회(제출/승인/반려/보완요청) |
| `/mentee/results` | 합격 결과 입력 | 합격 정보(나이/군필/합격학교 등) + 멘토 전환 동의 |
| `/mentee/settings` | 설정 | 계정 설정 (헤더 우측 톱니바퀴 아이콘) |

### 대시보드 네비게이션 흐름

```
basic-info → quantitative → qualitative → concerns
   [저장 / 다음]   [이전 / 임시저장 / 다음]   [이전 / 임시저장 / 다음]   [이전 / 임시저장 / 최종 제출]
```

---

## Admin 라우팅

| Route | 페이지명 | 주요 기능 |
|-------|---------|----------|
| `/admin/dashboard` | 대시보드 | 관리자 메인 |
| `/admin/users` | 회원 목록 | 전체 회원 리스트 조회 |
| `/admin/users/:userId` | 회원 상세 | 회원 정보 + 계정 상태 + 참여 이력 |
| `/admin/applications` | 신청 관리 | 연도 필터, 멘티/멘토 신청 리스트 + 상태 관리 + 관리자 메모 |
| `/admin/matchings/targets` | 매칭 대상 목록 | 승인된(approved) 멘티/멘토 신청자 목록 |
| `/admin/matchings/run` | AI 매칭 실행 | AI 매칭 실행 버튼 |
| `/admin/matchings/results` | 매칭 결과 | 멘티-멘토 매칭 수정(드롭다운)/확정 + 최종 결과 목록 |

### 매칭 플로우

```
/admin/matchings/targets → /admin/matchings/run → /admin/matchings/results
   [승인된 신청자 확인]       [AI 매칭 실행]         [결과 수정 → 임시저장 → 확정]
```

---

## 공통 레이아웃

모든 인증된 페이지(`/mentee/*`, `/admin/*`)에 공통 적용.

| 영역 | 구성 |
|------|------|
| **Header** | 좌: pLAWcess 로고 / 우: 알림창, "이름(학번)님 환영합니다" |
| **Sidebar** | 좌측 고정, 권한별 메뉴 분기 |
| **Footer** | 좌: 저작권 + 크리에이터 + 관리처 정보 / 우: 로고 이미지 |

---

## 권한 분리

| 역할 | 접근 가능 라우트 |
|------|----------------|
| 멘티 (mentee) | `/mentee/*` |
| 멘토 (mentor) | 미기획 |
| 교육국 관리자 (admin) | `/admin/*` |
