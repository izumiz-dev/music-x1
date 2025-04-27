<div align="center">
  <img src="src/icons/icon.svg" alt="Music x1 Logo" width="128" height="128" />

  # Music x1 Browser Extension

  [![Release](https://img.shields.io/github/v/release/izumiz-dev/music-x1?style=flat-square)](https://github.com/izumiz-dev/music-x1/releases)
  [![License](https://img.shields.io/github/license/izumiz-dev/music-x1?style=flat-square)](LICENSE)

  [日本語](README_JA.md) | [English](README.md)

  AIを活用したスマートYouTube再生速度コントローラー
</div>

---

> [!CAUTION]
> これは実験的なブラウザ拡張機能です。自己責任でご利用ください。機能や動作は予告なく変更される可能性があります。

YouTube Data APIとGoogle Gemini AIを使用してYouTubeの音楽コンテンツを自動検出し、コンテンツタイプに基づいて再生速度を設定するブラウザ拡張機能です：
- 音楽コンテンツの場合：最適な視聴のために自動的に1倍速に設定
- 非音楽コンテンツの場合：1倍速から3倍速の間を0.1倍速刻みで調整可能
- グローバルトグル：必要に応じてワンクリックで拡張機能の有効/無効を切り替え可能

検出システムと内部動作の詳細については[ARCHITECTURE.md](ARCHITECTURE.md)をご覧ください。

## 使い方

### 基本機能

- 拡張機能はYouTubeで音楽動画を視聴しているときに自動的に検出します
- 音楽動画の場合、最適な視聴体験のために再生速度は1倍速に固定されます
- 非音楽動画の場合、再生速度を1倍速から3倍速の間で調整できます

### 拡張機能の有効/無効切り替え

- 拡張機能のアイコンをクリックしてポップアップパネルを開きます
- 右上のトグルスイッチで拡張機能の有効/無効を切り替えられます
- 無効時：
  - すべての動画が通常速度（1倍速）で再生されます
  - 速度調整コントロールは非アクティブになります
  - バッジアイコンは非表示になります
- 有効時：
  - 拡張機能は通常の動作を再開します
  - 現在の動画が分析され、それに応じて速度が調整されます

## インストール

### クイックインストール（推奨）

1. 最新リリースをダウンロード
- [リリースページ](https://github.com/izumiz-dev/music-x1/releases)にアクセス
- お使いのブラウザに適したZIPファイルをダウンロード：
  - Chrome/Edge：`music-x1-chrome-vX.X.X.zip`
  - Firefox：`music-x1-firefox-vX.X.X.zip`
  （X.X.Xはバージョン番号）

2. Chromeにインストール
- 方法１（リリースから直接インストール）：
  - ダウンロードしたZIPファイルをChromeの拡張機能ページ（`chrome://extensions/`）にデベロッパーモードを有効にした状態でドラッグ＆ドロップするだけでインストールできます

- 方法２（解凍してインストール）：
  - Chromeを開く
  - `chrome://extensions/`にアクセス
  - 右上の「デベロッパーモード」を有効化
  - 左上の「パッケージ化されていない拡張機能を読み込む」をクリック
  - ダウンロードしたChrome用zipファイルを展開したディレクトリを選択

3. Firefoxにインストール
- 方法１（リリースから直接インストール）：
  - Firefoxを開く
  - アドレスバーに `about:addons` と入力
  - 歯車アイコンをクリック > 「ファイルからアドオンをインストール」を選択
  - ダウンロードしたXPIファイルを選択

- 方法２（一時的インストール）：
  - Firefoxを開く
  - `about:debugging#/runtime/this-firefox`にアクセス
  - 「一時的なアドオンを読み込む...」をクリック
  - 展開したFirefox用zipファイル内の`manifest.json`ファイルを選択

### ソースからのインストール（開発用）

ソースからビルドする場合：

1. クローンとセットアップ
```bash
git clone https://github.com/izumiz-dev/music-x1.git
cd music-x1
pnpm install
```

2. Chrome用ビルド
```bash
# プロダクションビルド
pnpm build:chrome
# または開発用ビルド
pnpm build:chrome:dev
```
Chrome拡張機能は`dist/chrome`ディレクトリにビルドされます。

3. インストール可能なChrome拡張機能ファイルを作成
```bash
pnpm package:chrome
```
Chrome拡張機能のZIPファイルが`dist/chrome-ext`ディレクトリに作成されます。プロジェクトルートに秘密鍵（`chrome-ext.pem`）がある場合、`.crx`ファイルも作成されます。

4. Firefox用ビルド
```bash
# Firefox用の依存関係を最初にインストール
pnpm install:firefox-deps
# プロダクションビルド
pnpm build:firefox
# または開発用ビルド
pnpm build:firefox:dev
```
Firefox拡張機能は`dist/firefox`ディレクトリにビルドされます。

5. インストール可能なFirefoxアドオンファイルを作成
```bash
pnpm package:firefox
```
Firefox XPIファイルが`dist/firefox-addon`ディレクトリに作成されます。

6. クイックインストールのセクションで説明されている方法で拡張機能をインストールします。

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
- ブラウザで拡張機能のアイコンをクリック
- 拡張機能の設定を開く
- 両方のAPIキーをそれぞれのフィールドに入力
- 設定を保存

## 開発

### 利用可能なコマンド

- `pnpm build` - すべてのブラウザ用の拡張機能をビルド（`dist`フォルダに出力）
- `pnpm build:chrome` - Chrome拡張機能のみをビルド（`dist/chrome`に出力）
- `pnpm build:firefox` - Firefox拡張機能のみをビルド（`dist/firefox`に出力）
- `pnpm build:dev` - すべての拡張機能を開発モードでビルド
- `pnpm build:chrome:dev` - Chrome拡張機能を開発モードでビルド
- `pnpm build:firefox:dev` - Firefox拡張機能を開発モードでビルド
- `pnpm dev` - すべてのブラウザ用のホットリロード付き開発モードを開始
- `pnpm dev:chrome` - Chrome用のホットリロード付き開発モードを開始
- `pnpm dev:firefox` - Firefox用のホットリロード付き開発モードを開始
- `pnpm package` - すべての拡張機能をビルドしてパッケージ化
- `pnpm package:chrome` - Chrome拡張機能をビルドしてパッケージ化（`dist/chrome-ext`に出力）
- `pnpm package:firefox` - Firefox拡張機能をビルドしてパッケージ化（`dist/firefox-addon`に出力）
- `pnpm install:firefox-deps` - Firefox固有の依存関係をインストール
- `pnpm lint` - ESLintを実行してコードスタイルの問題をチェック
- `pnpm lint:fix` - ESLintを実行して問題を自動修正
- `pnpm type-check` - TypeScriptコンパイラを実行して型エラーをチェック

### 技術スタック

- TypeScript
- Google Gemini AI
- Preact
- esbuild

### Firefoxでの未署名拡張機能のテスト

開発中は、Firefox Developer EditionまたはFirefox Nightlyで未署名の拡張機能をテストできます：

1. Firefox Developer EditionまたはFirefox Nightlyを開く
2. `about:config`にアクセス
3. `xpinstall.signatures.required`を検索
4. 設定をダブルクリックして`false`に変更
5. これでテスト用に未署名の拡張機能をインストールできます

**注意**: これは開発/テスト目的のみに使用してください。一般ユーザーへの配布には、Mozillaによる署名が必要です。

### Firefox拡張機能の署名

一般のFirefoxユーザーへの配布には、すべての拡張機能はMozillaによる署名が必要です：

1. [addons.mozilla.org](https://addons.mozilla.org/)で開発者アカウントを作成
2. `pnpm package:firefox`を使用してXPIファイルを生成
3. AMO開発者ダッシュボードを通じてXPIファイルを提出
4. 公開リストまたは自己配布（非公開）を選択
5. 承認後、配布用に署名済みXPIをダウンロード

署名プロセスについての詳細は、[Mozilla Extension Workshop](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)を参照してください。

## ブラウザ互換性

この拡張機能はChrome/Edge（Manifest V3）とFirefox（Manifest V2）の両方をサポートしています。Firefox互換性の実装に関する詳細情報は[FIREFOX_SETUP.md](FIREFOX_SETUP.md)をご覧ください。
