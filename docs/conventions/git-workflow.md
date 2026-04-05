# Git 워크플로우

## 기본 원칙

| 상황 | 방식 |
|------|------|
| 내 담당 영역(FE 또는 BE)만 건드리는 작업 | main에 직접 커밋 |
| 상대방 영역과 연관된 작업, 피드백이 필요할 때 | PR 생성 후 리뷰 요청 |

## PR이 필요한 경우 (예시)
- API 요청/응답 스펙 변경
- DB 스키마 변경
- 공통 타입/인터페이스 추가·수정
- 상대방 코드에 직접 영향을 주는 변경

## 매일 작업 전

```bash
git pull origin main  # 최신 코드 받기
```

## 직접 커밋 (내 영역만)

```bash
git add .
git commit -m "feat(#이슈번호): 활동 목록 컴포넌트 추가"
git push origin main
```

## PR (상대와 연관된 작업)

```bash
git checkout -b feat/api-user-endpoint
git add .
git commit -m "feat(#이슈번호): 유저 조회 API 엔드포인트 추가"
git push origin feat/api-user-endpoint
# → GitHub에서 PR 생성 후 상대방 리뷰 요청
```

## GitHub Issues

- 버그, 기능 요청, 논의가 필요한 사항은 GitHub Issues에 등록
- 라벨: `fe` / `be` / `api` / `bug` / `feat`
- PR 올릴 때 관련 이슈 번호 연결: `closes #3`
