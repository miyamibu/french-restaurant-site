# Bistro Joa 予約システム (Next.js + Prisma)

フレンチレストラン向けのオンライン予約・在庫管理・管理画面・通知を備えた Next.js (App Router) プロジェクトです。タイムゾーンは JST 固定で、日付キーは常に `YYYY-MM-DD`（JST基準）で扱います。

## セットアップ

1. Node.js 20+ を用意
2. 依存インストール
   ```bash
   npm install
   ```
3. 環境変数を設定
   ```bash
   cp .env.example .env
   # DATABASE_URL, ADMIN_BASIC_USER/PASS, STORE_NOTIFY_EMAIL, EMAIL_PROVIDER(resend|sendgrid), EMAIL_API_KEY, EMAIL_FROM を入力
   ```
4. Prisma migrate / seed
   ```bash
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```
5. 開発サーバ
   ```bash
   npm run dev
   ```

## 主要エンドポイント

- 公開サイト: `/`, `/menu`, `/photos`, `/reserve`, `/info`
- 予約 API: `POST /api/reservations`
- 空き状況 API: `GET /api/availability?date=YYYY-MM-DD`
- 管理画面: `/admin/reservations`, `/admin/reservations/[id]`, `/admin/business-days`
- 管理 API: `/api/admin/reservations`, `/api/admin/reservations/[id]`, `/api/admin/business-days`
- Cron（前日通知の仕組み）: `POST /api/cron/remind`

## ベーシック認証

`/admin/*`, `/api/admin/*`, `/api/cron/*` は BASIC 認証で保護されています。`.env` の `ADMIN_BASIC_USER`, `ADMIN_BASIC_PASS` を設定してください。

## 通知

- 店側メール通知: Resend または SendGrid を `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `STORE_NOTIFY_EMAIL` で設定。環境変数が無い場合は安全にスキップします。
- `EMAIL_FROM` はプロバイダで認証済みのドメインのアドレスに設定してください（例: `no-reply@yourdomain.com`）。未設定の場合は `STORE_NOTIFY_EMAIL` を送信元として使用します。
- LINE 前日通知: 仕組みのみ実装。トークン未設定時は `/api/cron/remind` が「SKIPPED_LINE_SETUP」で正常終了します。

## テスト

最低限のユースケーステストを `vitest` で用意しています。

```bash
npm run test
```

検証内容: 当日ブロック、3ヶ月超ブロック、メイン 12 席上限、来店時刻 17:30 以降。

## 予約競合（同時アクセス）確認手順

1. サーバを起動 (`npm run dev` または本番環境 URL を使用)
2. 同じ日付で ROOM1 に対して 2 つのリクエストを同時送信し、一方が 200 / もう一方が 409 になることを確認
   ```bash
   # 例: Powershell で並列送信
   1..2 | ForEach-Object { Start-Job { curl -s -X POST http://localhost:3000/api/reservations -H "Content-Type: application/json" -d '{"date":"2026-02-01","seatType":"ROOM1","partySize":2,"name":"test","phone":"090","arrivalTime":"17:30"}' } }
   ```
3. メイン席は `partySize` 合計が 12 を超えると 409 が返ることを確認
4. 当日・3ヶ月超・休業日では 400/409 で弾かれ、`callPhone`/`callMessage` が返ることを確認

## Cron の実行

毎日 12:00 JST に以下を叩く想定です（BASIC 認証必須）。
```bash
curl -u "$ADMIN_BASIC_USER:$ADMIN_BASIC_PASS" -X POST https://your-domain/api/cron/remind
```

## ディレクトリ

- `src/app` … App Router ページと API route handlers
- `src/lib` … 日時処理、在庫判定、Prisma クライアント、メール送信、Basic 認証
- `prisma/schema.prisma` … Reservation/BusinessDay/MenuItem/Photo モデル
- `prisma/seed.ts` … メニュー/写真/休業日サンプル
- `tests/` … ビジネスルールのユニットテスト

## 注意点

- 日付判定は JST 基準で行い、当日・3ヶ月超・休業日は API 側でも必ず弾きます。
- 個室は 2〜4 名のみ、ROOM1/ROOM2 指定で予約。1室=1予約でロックします。
- 予約作成は PostgreSQL + Prisma の Serializable トランザクション（リトライ付き）で在庫を保護しています。
- キャンセルは Web からは不可。ステータス変更は管理画面から行ってください。
