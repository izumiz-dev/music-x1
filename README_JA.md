<div align="center">
  <img src="src/icons/icon.svg" alt="Music x1 Logo" width="128" height="128" />
  
  # Music x1 Chrome Extension

  [![Release](https://img.shields.io/github/v/release/izumiz-dev/music-x1?style=flat-square)](https://github.com/izumiz-dev/music-x1/releases)
  [![License](https://img.shields.io/github/license/izumiz-dev/music-x1?style=flat-square)](LICENSE)

  [日本語](README_JA.md) | [English](README.md)

  AIを活用したスマートYouTube再生速度コントローラー
</div>

---

> [!CAUTION]
> これは実験的なChrome拡張機能です。自己責任でご利用ください。機能や動作は予告なく変更される可能性があります。

YouTube Data APIとGoogle Gemini AIを使用してYouTubeの音楽コンテンツを自動検出し、コンテンツタイプに基づいて再生速度を設定するChrome拡張機能です：
- 音楽コンテンツの場合：最適な視聴のために自動的に1倍速に設定
- 非音楽コンテンツの場合：1倍速から2.5倍速の間を0.1倍速刻みで調整可能

検出システムと内部動作の詳細については[ARCHITECTURE.md](ARCHITECTURE.md)をご覧ください。

## インストール

### クイックインストール（推奨）

1. 最新リリースをダウンロード
- [リリースページ](https://github.com/izumiz-dev/music-x1/releases)にアクセス
- 最新の`music-x1-vX.X.X.zip`ファイル（X.X.Xはバージョン番号）をダウンロード

2. Chromeに拡張機能をロード
- Chromeを開く
- `chrome://extensions/`にアクセス
- 右上の「デベロッパーモード」を有効化
- 左上の「パッケージ化されていない拡張機能を読み込む」をクリック
- ダウンロードしたzipファイルを展開したディレクトリを選択

### ソースからのインストール（開発用）

ソースからビルドする場合：

1. クローンとセットアップ
```bash
git clone https://github.com/izumiz-dev/music-x1.git
cd music-x1
pnpm install
pnpm build
```

2. クイックインストールと同様の手順で拡張機能をロード（`dist`ディレクトリを選択）

### 設定

両方のAPIキーをGoogle Cloud Consoleから取得する必要があります：

1. Google Cloudプロジェクトの設定
- [Google Cloud Console](https://console.cloud.google.com/)にアクセス
- 新規プロジェクトを作成、または既存のプロジェクトを選択
- プロジェクトの請求を有効化（API利用に必要）

2. APIの有効化
- 「APIとサービス」>「ライブラリ」に移動
- 「YouTube Data API v3」を検索して有効化
- 「Gemini API」を検索して有効化

3. APIキーの作成
- 「APIとサービス」>「認証情報」に移動
- 「認証情報を作成」>「APIキー」をクリック
- 2つのキーを作成：YouTube Data API用とGemini API用
- （オプション）セキュリティ向上のため、APIキーをサービスごとに制限

4. 拡張機能の設定
- Chrome上で拡張機能のアイコンをクリック
- 拡張機能の設定を開く
- 両方のAPIキーをそれぞれのフィールドに入力
- 設定を保存

## 開発

### 利用可能なコマンド

- `pnpm dev` - ホットリロード付きの開発モードを開始
- `pnpm build` - プロダクションビルドを実行

### 技術スタック

- TypeScript
- Google Gemini AI
- Preact
- esbuild
