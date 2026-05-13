<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## このリポジトリ（Cursor / 新セッション用メモ）

### スタック
- Next.js 16（App Router）・React 19・Prisma 6・SQLite
- `basePath` は `next.config.ts` の **`/tanaoroshi`**（社内 Nginx がサブパスでプロキシ）

### ローカル開発
- 開発 URL: `http://localhost:3000/tanaoroshi/`（`basePath` あり）
- **iCloud Drive 上**では `node_modules` / Prisma のファイル読み込みが失敗することがある。**ローカルディスクに clone または移動**し、`npm install` → `npm run build` を推奨
- **`.next` と `node_modules` は移動・バックアップ不要**。新しい場所で `npm install`（または `npm ci`）と `npm run build` で再生成

### 本番（Ubuntu サーバー例）
- 配置例: `/home/sofix/apps/tanaoroshi`
- 環境変数: プロジェクト直下の `.env` に `DATABASE_URL`（例は `env.example` を参照）。**必ずプロジェクト直下で** `prisma` / `npm` を実行（DB が `prisma/prisma/` に二重でできるのを防ぐ）
- PM2: **`npm run start:3002`** でポート固定。作業ディレクトリを明示する例:
  `pm2 start npm --name tanaoroshi --cwd /home/sofix/apps/tanaoroshi -- run start:3002`
- デプロイの流れ: `git pull` → スキーマ変更時は **`npx prisma db push`** → **`npm run build`** → **`pm2 restart tanaoroshi`** → 必要なら **`pm2 save`**
- Nginx: `location ^~ /tanaoroshi { proxy_pass http://127.0.0.1:3002; ... }`（**`proxy_pass` の URL 末尾に `/` を付けない**）

### Git リモート
- 例: `https://github.com/setoband3/tanaoroshi.git`（実際の URL は `git remote -v` で確認）
