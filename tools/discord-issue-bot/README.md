# Discord GitHub Issue Bot

디스코드에서 GitHub 이슈를 등록하는 봇.

## 기능

- **이슈 등록 버튼** — 채널에 고정된 버튼 클릭 → 폼 작성 → 이슈 생성
- **메시지 우클릭** — 메시지 우클릭 → "이슈 등록" → 내용이 미리 채워진 폼
- **이모지 리액션** — 📋 리액션 → 즉시 이슈 생성

## 설정

### 1. Discord Bot

1. [Discord Developer Portal](https://discord.com/developers/applications)에서 앱 생성
2. Bot 탭에서 토큰 발급
3. Bot 탭 → Privileged Gateway Intents → `MESSAGE CONTENT INTENT` 활성화
4. OAuth2 → URL Generator → `bot` + `applications.commands` scope
5. Bot Permissions: Send Messages, Use Slash Commands, Read Message History, Add Reactions
6. 생성된 URL로 서버에 봇 초대

### 2. GitHub Token

1. GitHub Settings → Developer settings → Personal access tokens
2. `repo` scope로 토큰 생성

### 3. 환경변수

`.env.example`을 `.env`로 복사 후 값 입력:

| Variable | Description |
| -------- | ----------- |
| DISCORD_TOKEN | 디스코드 봇 토큰 |
| GITHUB_TOKEN | GitHub PAT (repo scope) |
| GITHUB_REPO | 대상 리포 (예: doertail/pLAWcess) |
| ISSUE_LOG_CHANNEL_ID | 이슈 로그 채널 ID |
| ISSUE_REACTION_EMOJI | 리액션 트리거 이모지 (기본: 📋) |
| REQUIRED_ROLE | 이슈 등록 허용 역할 (기본: Team) |

## 실행

### 로컬

```bash
cp .env.example .env
# .env 파일 편집
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python bot.py
```

### Docker

```bash
docker build -t discord-issue-bot .
docker run --env-file .env discord-issue-bot
```

## 사용법

1. `/이슈채널설정` — 현재 채널에 이슈 등록 버튼 설치 (관리자)
2. 버튼 클릭 또는 메시지 우클릭 → "이슈 등록"
3. 메시지에 📋 리액션으로 빠른 이슈 등록
