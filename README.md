# Contentful CSV Manager

ContentfulのデータをブラウザでCSVインポート・エクスポートできるWebアプリケーション。

## 機能

- ✨ Content Typeを選択してワンクリックでCSVエクスポート
- ✨ CSVファイルをアップロードしてデータをインポート
- ✨ リアルタイムでインポート結果を表示
- ✨ エラー詳細とログの表示
- ✨ shadcn/uiによる美しいUI

## 技術スタック

- **Next.js 14** (App Router)
- **TypeScript**
- **Contentful Management API**
- **shadcn/ui** (Radix UI + Tailwind CSS)
- **papaparse** (CSV処理)
- **Vercel** (デプロイ)

## セットアップ

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd wevox-contentful
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 環境変数を設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
CONTENTFUL_SPACE_ID=your_space_id_here
CONTENTFUL_MANAGEMENT_TOKEN=your_management_token_here
CONTENTFUL_ENVIRONMENT=master
```

#### Contentful Management Tokenの取得方法

1. [Contentful](https://app.contentful.com/)にログイン
2. Settings > API keys > Content management tokens
3. "Generate personal token"をクリック
4. トークンをコピーして`.env.local`に貼り付け

### 4. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## 使い方

### エクスポート

1. **エクスポート**タブを選択
2. Content Typeをドロップダウンから選択
3. **CSVをダウンロード**ボタンをクリック
4. CSVファイルがダウンロードされます

### インポート

1. **インポート**タブを選択
2. Content Typeを選択
3. CSVファイルを選択（またはドラッグ&ドロップ）
4. **CSVをインポート**ボタンをクリック
5. インポート結果が表示されます

### CSV形式

- 1行目: フィールド名（ヘッダー）
- 2行目以降: データ
- `id`列があれば既存エントリーを更新、なければ新規作成
- ネストされたオブジェクトは`.`（ドット記法）でフラット化
- 配列はJSON文字列化

## Vercelへのデプロイ

### 1. GitHubにプッシュ

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Vercelで新しいプロジェクトを作成

1. [Vercel](https://vercel.com/)にログイン
2. "Add New Project"をクリック
3. GitHubリポジトリを選択
4. 環境変数を設定：
   - `CONTENTFUL_SPACE_ID`
   - `CONTENTFUL_MANAGEMENT_TOKEN`
   - `CONTENTFUL_ENVIRONMENT`
5. **Deploy**をクリック

### 3. 自動デプロイ

以降、`main`ブランチへのプッシュで自動的にデプロイされます。

## プロジェクト構造

```
wevox-contentful/
├── app/
│   ├── api/
│   │   └── contentful/
│   │       ├── content-types/route.ts  # Content Type一覧取得
│   │       ├── export/route.ts         # CSV エクスポート
│   │       └── import/route.ts         # CSV インポート
│   ├── layout.tsx                      # ルートレイアウト
│   ├── page.tsx                        # メインページ
│   └── globals.css                     # グローバルスタイル
├── components/
│   ├── ui/                             # shadcn/ui コンポーネント
│   ├── export-tab.tsx                  # エクスポートタブ
│   └── import-tab.tsx                  # インポートタブ
├── lib/
│   ├── contentful.ts                   # Contentful APIクライアント
│   ├── csv.ts                          # CSV処理ユーティリティ
│   └── utils.ts                        # shadcn/ui ユーティリティ
├── .env.local                          # 環境変数（ローカル）
└── package.json
```

## トラブルシューティング

### "接続エラー"が表示される

- `.env.local`ファイルが存在するか確認
- `CONTENTFUL_SPACE_ID`と`CONTENTFUL_MANAGEMENT_TOKEN`が正しく設定されているか確認
- Management Tokenが有効か確認

### "Content Typeが見つかりません"

- Contentful Spaceに少なくとも1つのContent Typeが作成されているか確認

### インポートが失敗する

- CSVファイルのフォーマットが正しいか確認
- 必須フィールドがすべて含まれているか確認
- エラー詳細を展開して具体的なエラーメッセージを確認

## ライセンス

MIT

## 作者

Built with Next.js + Contentful + shadcn/ui
