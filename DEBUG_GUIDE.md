# 長良川カヌーゲーム - デバッグガイド

## 修正された問題

### 1. 未定義変数エラー
- **問題**: `nextSpawnIndex` が宣言されていなかった
- **修正**: グローバル変数として初期化 (`let nextSpawnIndex = 3;`)

### 2. 存在しない関数呼び出し
- **問題**: `initializeWaves()` が定義されていないのに呼び出されていた
- **修正**: 関数呼び出しを削除し、直接 `createRiver()` を実行

### 3. 波メッシュの参照の不整合
- **問題**: `window.wavesMesh` と `wavesMesh` が混在していた
- **修正**: グローバル変数 `wavesMesh` に統一

## デバッグ方法

### 基本的なデバッグ

1. **debug.html を使用**
   ```
   FACE/kanoe/debug.html をブラウザで開く
   ```
   - 左上にリアルタイムのデバッグログが表示されます
   - エラー、警告、ログメッセージが色分けされて表示されます

2. **ブラウザの開発者ツール**
   - F12 キーを押して開発者ツールを開く
   - Console タブでエラーメッセージを確認
   - Network タブで bridges.json の読み込みを確認

### よくある問題と解決方法

#### 問題1: 橋が表示されない
**原因**: bridges.json の読み込み失敗
**確認方法**:
- 開発者ツールの Network タブで bridges.json のステータスを確認
- Console に "Failed to load bridges" エラーがないか確認

**解決方法**:
- bridges.json が同じディレクトリにあることを確認
- ローカルサーバーで実行（file:// プロトコルでは動作しない場合がある）

#### 問題2: カメラが起動しない
**原因**: カメラの権限が許可されていない
**確認方法**:
- ブラウザのアドレスバーにカメラアイコンが表示されているか確認
- Console に "Camera error" メッセージがないか確認

**解決方法**:
- ブラウザのカメラ権限を許可
- HTTPS または localhost で実行（セキュリティ要件）

#### 問題3: ポーズ検出が動作しない
**原因**: MediaPipe ライブラリの読み込み失敗
**確認方法**:
- Console に "Pose Controller initialization error" がないか確認
- Network タブで MediaPipe の CDN リソースが読み込まれているか確認

**解決方法**:
- インターネット接続を確認
- CDN が利用可能か確認

#### 問題4: ゲームが重い・カクつく
**原因**: 波のアニメーションやポーズ検出の負荷
**解決方法**:
- pose-controller.js の modelComplexity を 0 に変更
- 波の解像度を下げる（PlaneGeometry の分割数を減らす）

### デバッグ用のコンソールコマンド

ブラウザの Console タブで以下のコマンドを実行できます：

```javascript
// ゲーム状態を確認
console.log(gameState);

// 橋の数を確認
console.log('橋の数:', bridges.length);

// カヌーの位置を確認
console.log('カヌー位置:', window.canoeGroup?.position);

// ポーズ検出の状態を確認
console.log('ポーズ検出:', window.poseController?.isRunning);

// 現在のジェスチャーを確認
console.log('ジェスチャー:', window.poseController?.getCurrentGesture());

// 速度を変更（テスト用）
gameState.speed = 3.0;

// スコアを変更（テスト用）
gameState.score = 1000;
```

## テスト手順

### 1. 基本動作テスト
1. index.html または debug.html を開く
2. カメラ権限を許可
3. 橋が表示されることを確認
4. キーボード操作でゲームが動作することを確認
   - ↑キー/W: 加速
   - ↓キー/S: しゃがむ

### 2. ポーズ検出テスト
1. カメラに顔が映っていることを確認
2. 右下の小さなカメラ画面に緑色の線が表示されることを確認
3. 頭を下に向けて「しゃがみ中」が表示されることを確認
4. 頭を左右に傾けてカヌーが左右に動くことを確認

### 3. 橋通過テスト
1. 橋が近づいたら警告が表示されることを確認
2. しゃがんで橋を通過できることを確認
3. しゃがまずに橋に当たるとゲームオーバーになることを確認

## パフォーマンス最適化

### 軽量化オプション

**pose-controller.js の設定を変更**:
```javascript
this.pose.setOptions({
    modelComplexity: 0,  // 1 → 0 に変更（軽量化）
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
```

**波の解像度を下げる（script.js）**:
```javascript
// 50, 50 → 20, 20 に変更
const waveGeometry = new THREE.PlaneGeometry(80, 1000, 20, 20);
```

## トラブルシューティング

### エラーメッセージ別の対処法

| エラーメッセージ | 原因 | 解決方法 |
|----------------|------|---------|
| "Failed to load bridges" | bridges.json が見つからない | ファイルパスを確認 |
| "Camera error" | カメラアクセス失敗 | 権限を許可、HTTPS で実行 |
| "Pose Controller initialization error" | MediaPipe 読み込み失敗 | ネット接続確認 |
| "nextSpawnIndex is not defined" | 変数未定義 | 修正済み（最新版を使用） |

## 開発サーバーの起動方法

ローカルサーバーで実行することを推奨します：

### Python を使用
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

### Node.js を使用
```bash
npx http-server -p 8000
```

### VS Code の Live Server 拡張機能
1. Live Server 拡張機能をインストール
2. index.html を右クリック
3. "Open with Live Server" を選択

ブラウザで `http://localhost:8000` にアクセス

## 連絡先・サポート

問題が解決しない場合は、以下の情報を含めて報告してください：
- ブラウザの種類とバージョン
- OS の種類
- Console に表示されるエラーメッセージ
- 問題が発生する手順
