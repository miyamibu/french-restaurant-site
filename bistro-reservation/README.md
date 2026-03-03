# Bistro Joa 予約システム

Next.js App Router で構成した、レストラン予約 + オンラインストア + 管理画面のアプリです。  
データストアは以下の二系統を維持しています。

- 予約: Prisma + PostgreSQL
- 注文: Supabase (`orders`, `order_history`, `bank_account`)

## 技術スタック

- Next.js 15 / React 18 / TypeScript
- Prisma 5
- Supabase JS 2
- Tailwind CSS
- Vitest

## ディレクトリ

- `src/app` App Router ページ + API route
- `src/lib` ドメイン処理（認証、日付、API防御、validation、logger）
- `prisma/` スキーマ・マイグレーション
- `supabase/` SQL定義（DDL / RLS / 検証クエリ）
- `tests/` ユニットテスト

## セットアップ

1. 依存関係
```bash
npm install
```
2. 環境変数
```bash
cp .env.example .env
```
3. Prisma
```bash
npx prisma migrate dev
npm run prisma:seed
```
4. 開発起動
```bash
npm run dev
```

リリース運用手順は `docs/production-launch.md` を参照してください。

## 環境変数

主要変数は `.env.example` に記載しています。特に以下は必須です。

- `DATABASE_URL`
- `ADMIN_BASIC_USER`, `ADMIN_BASIC_PASS`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `CONTACT_PHONE_E164`, `CONTACT_PHONE_DISPLAY`, `CONTACT_MESSAGE`

クライアント表示で連絡先を使う場合は以下も設定してください。

- `NEXT_PUBLIC_CONTACT_PHONE_E164`
- `NEXT_PUBLIC_CONTACT_PHONE_DISPLAY`
- `NEXT_PUBLIC_CONTACT_MESSAGE`

## 認証・保護範囲

### Basic 認証（middleware）

以下パスは Basic 認証で保護されます。

- `/admin/:path*`
- `/dashboard/:path*`
- `/api/admin/:path*`
- `/api/dashboard/:path*`

### Cron 認証（Bearer）

cron API は `Authorization: Bearer $CRON_SECRET` で保護されます。

- `/api/crons/remind`
- `/api/crons/cancel-expired-orders`
- `/api/crons/delete-old-histories`
- `/api/cron/remind`（旧互換。内部で `/api/crons/remind` に委譲）

実行メソッドは `POST` を正とします。`GET` は Vercel Cron 互換のため、
`x-vercel-cron: 1` ヘッダーまたは `?compat=1` がある場合のみ受け付けます。

## API 防御方針（CORS/CSRF）

書き込み API では共通防御 `src/lib/api-security.ts` を適用しています。

- `Content-Type: application/json` 必須
- `Origin` が同一オリジン（`request.nextUrl.origin` / `BASE_URL`）であること
- `Sec-Fetch-Site: cross-site` を拒否
- `X-Requested-With: XMLHttpRequest` は既定で必須
- 例外: `POST /api/reservations` は AI エージェント互換のため未指定でも受け付ける

対象（主な書き込み API）:

- `POST /api/reservations`
- `POST /api/orders`
- `PUT|DELETE /api/dashboard/orders`
- `PUT|DELETE /api/dashboard/bank-account`
- `POST /api/admin/business-days`
- `PATCH /api/admin/reservations/[id]`
- `POST /api/pdf-to-image`

## API 一覧（主要）

- `GET /api/availability?date=YYYY-MM-DD`
- `GET /api/availability/monthly?month=YYYY-MM`
- `POST /api/reservations`
- `POST /api/orders`
- `GET|PUT|DELETE /api/dashboard/orders`
- `GET|PUT|DELETE /api/dashboard/bank-account`
- `GET|POST /api/admin/business-days`
- `GET /api/admin/reservations`
- `GET|PATCH /api/admin/reservations/[id]`
- `POST /api/crons/remind`
- `POST /api/crons/cancel-expired-orders`
- `POST /api/crons/delete-old-histories`
- `POST /api/pdf-to-image`

## エラーレスポンス形式

バリデーション/認可エラーは以下形式で統一しています。

```json
{
  "error": "説明",
  "code": "MACHINE_READABLE_CODE",
  "fields": {
    "field": "message"
  }
}
```

`fields` は入力エラー時のみ付与されます。  
一部 API は障害追跡用に `requestId` を返します。

## 予約・注文ルール

- 予約は当日不可、最大3ヶ月先まで
- メイン席合計 12 名まで、10名以上予約は貸切扱い
- 来店時間は `17:30` 以降
- 店頭支払い（`cash-store`）の来店日は 木〜日かつ 注文日+14〜30日
- 顧客の自己キャンセル/変更 UI は未実装。連絡導線（電話）で運用

## Prisma マイグレーション

マイグレーション状態を確認:

```bash
npx prisma migrate status
```

`Photo.category` 追補は以下で管理:

- `prisma/migrations/20260223224000_add_photo_category_column/migration.sql`

## Supabase SQL 適用手順

1. テーブル作成
```sql
-- supabase/schema.sql
```
2. RLS/Policy 適用
```sql
-- supabase/rls-policies.sql
```
3. 状態確認
```sql
-- supabase/verify.sql
```

## ログ運用（最小）

`src/lib/logger.ts` で JSON ログ化しています。  
主な項目:

- `level`
- `event`
- `requestId`
- `route`
- `errorCode`
- `context`

障害時は `requestId` と `errorCode` を起点に API ログを確認してください。

## テスト・リリース前チェック

```bash
npm run lint
npm run test
npm run build
```

全て成功してからデプロイしてください。

