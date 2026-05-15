# DB 스키마 변경 워크플로우

운영 DB는 Supabase, 마이그레이션은 Prisma가 `_prisma_migrations` 테이블에 추적한다. 아래 절차로 끝.

## 1. `schema.prisma` 수정

`packages/database/prisma/schema.prisma`에 필드·모델·enum 변경.

## 2. 마이그레이션 SQL 파일 작성

`packages/database/prisma/migrations/YYYYMMDDHHMMSS_descriptive_name/migration.sql` 폴더를 만들고 SQL을 직접 작성.

```sql
-- 예시
ALTER TABLE "users" ADD COLUMN "new_field" TEXT;
```

SQL을 손으로 쓰기 귀찮으면 자동 생성:

```bash
cd packages/database
node_modules/.bin/prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```

출력을 `migration.sql`에 붙여넣는다.

## 3. 커밋

```bash
git add packages/database/prisma/schema.prisma \
        packages/database/prisma/migrations/YYYYMMDDHHMMSS_*
git commit -m "feat(#xxx): ..."
```

## 4. Supabase에 반영

```bash
pnpm db:migrate:deploy
```

Prisma가 `_prisma_migrations`를 보고 미적용 마이그레이션의 SQL을 실행 + 추적 행을 추가한다. **SQL Editor를 직접 열어 실행하지 않아도 된다.**

## 5. 코드 동기화 (필요 시)

```bash
pnpm db:generate
```

`postinstall`로 자동 실행되긴 한다.

---

## 트러블슈팅

### `db:migrate:deploy`가 hang 될 때

`.env`의 `DATABASE_URL`이 pgbouncer 풀러(포트 6543)를 가리키면 마이그레이션 단계에서 멈출 수 있다. 그때만 임시로 `DIRECT_URL`을 강제한다:

```bash
cd packages/database
DIRECT_URL_VAL=$(grep "^DIRECT_URL=" .env | cut -d= -f2- | tr -d '"')
DATABASE_URL="$DIRECT_URL_VAL" node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma
```

### 잘못 적용됐을 때

- **이미 SQL Editor에서 직접 실행해버린 마이그레이션이 있다면**: `node_modules/.bin/prisma migrate resolve --applied <migration_name> --schema=prisma/schema.prisma`로 추적만 마크한다 (스키마는 건드리지 않음).
- **잘못 적용된 마이그레이션을 되돌리려면**: 새 마이그레이션 폴더에 `DROP COLUMN ...` SQL을 작성한 뒤 deploy. 마이그레이션은 forward-only다.
