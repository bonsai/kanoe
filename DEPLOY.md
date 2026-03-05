# デプロイ手順

## Git プッシュ完了 ✅

コードは GitHub にプッシュされました：
- リポジトリ: https://github.com/bonsai/kanoe
- ブランチ: main
- 最新コミット: 6c245e2

## Vercel デプロイ方法

### 方法1: Vercel CLI（推奨）

ターミナルで以下のコマンドを実行してください：

```bash
cd "I:\My Drive\FACE\kanoe"
vercel --prod
```

プロンプトが表示されたら：
1. "Set up and deploy?" → **Yes** を選択
2. "Which scope?" → あなたのアカウントを選択
3. "Link to existing project?" → **No** を選択（新規プロジェクトの場合）
4. プロジェクト名を確認（デフォルト: kanoe）

### 方法2: Vercel Dashboard（簡単）

1. https://vercel.com/dashboard にアクセス
2. "Add New..." → "Project" をクリック
3. GitHub リポジトリ "bonsai/kanoe" を選択
4. "Deploy" をクリック

設定は自動的に検出されます（vercel.json があるため）

## デプロイ後の確認事項

デプロイが完了したら、以下を確認してください：

1. **カメラ権限**: HTTPS でデプロイされるため、カメラが正常に動作します
2. **bridges.json**: CORS エラーが解決され、正常に読み込まれます
3. **MediaPipe**: CDN からのライブラリ読み込みが正常に動作します

## トラブルシューティング

### Vercel CLI がインストールされていない場合

```bash
npm install -g vercel
```

### デプロイ URL の確認

デプロイ後、以下のような URL が表示されます：
```
https://kanoe-game.vercel.app
```

または Vercel Dashboard で確認できます：
https://vercel.com/dashboard

## 環境変数（必要な場合）

現在のプロジェクトでは環境変数は不要ですが、将来的に必要な場合：

1. Vercel Dashboard → プロジェクト → Settings → Environment Variables
2. 必要な変数を追加

## 自動デプロイ

GitHub に push すると、Vercel が自動的にデプロイします：
- main ブランチ → 本番環境
- その他のブランチ → プレビュー環境

## カスタムドメイン（オプション）

Vercel Dashboard でカスタムドメインを設定できます：
1. プロジェクト → Settings → Domains
2. ドメインを追加

---

## 現在の状態

✅ Git にプッシュ済み
⏳ Vercel デプロイ待ち

上記の方法でデプロイを完了してください！
