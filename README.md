# tanaoroshi

在庫棚卸しアプリ（Next.js + Prisma + SQLite）です。

## Stack

- Next.js 16 (App Router)
- React 19
- Prisma 6
- SQLite

## Local Development (Windows)

1) 依存関係インストール（初回のみ）

```powershell
npm.cmd install
```

2) 開発起動

```powershell
npm.cmd run dev
```

3) ブラウザ確認

- `http://localhost:3000/tanaoroshi/`

`basePath` が `/tanaoroshi` のため、`/` ではなく `/tanaoroshi/` を使います。

## Environment Variables

`.env` をプロジェクト直下に置き、`DATABASE_URL` を設定してください。

例:

```env
DATABASE_URL="file:./prisma/production.db"
```

## Routine Flow (GitHub -> Server)

### 1. Local

```powershell
git pull --ff-only origin main
npm.cmd run build
git push origin main
```

### 2. Ubuntu Server

```bash
cd /home/sofix/apps/tanaoroshi
git pull --ff-only origin main
npx prisma db push
npm run build
pm2 restart tanaoroshi
pm2 status
```

`pm2 status` で `tanaoroshi` が `online` なら反映完了です。

## Important Notes

- Prisma / npm コマンドは必ずプロジェクト直下で実行してください。
  - 別ディレクトリで実行すると `prisma/prisma/` に DB が二重作成されることがあります。
- `node_modules` と `.next` は移動不要です。新環境で再生成してください。
- PowerShell で `npm` 実行ポリシーに当たる場合は `npm.cmd` を使ってください。

## Common Commands

```bash
npm run dev
npm run build
npm run start:3002
npm run db:push
```
