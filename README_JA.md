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

## ドキュメント

詳細なドキュメントはdocsディレクトリにあります：

- [インストールガイド](docs/installation.md) - 拡張機能のインストール方法
- [使用ガイド](docs/usage.md) - 拡張機能の機能の使い方
- [ビルドガイド](docs/build.md) - ビルドとパッケージングのプロセス
- [開発ガイド](docs/development.md) - 開発ワークフローとコマンド
- [アーキテクチャ](docs/architecture.md) - 技術的なアーキテクチャと実装の詳細

## クイックスタート

### インストール

1. [リリースページ](https://github.com/izumiz-dev/music-x1/releases)から最新リリースをダウンロード
2. Chrome/Edge: デベロッパーモードを有効にして、ZIPファイルを`chrome://extensions/`にドラッグ＆ドロップ
3. Firefox: `about:addons`にアクセス、歯車アイコンをクリックして「ファイルからアドオンをインストール」を選択

### 設定

1. [Google Cloud Console](https://console.cloud.google.com/)からAPIキーを取得
2. YouTube Data API v3とGemini APIを有効化
3. 拡張機能の設定で両方のAPIキーを入力

詳細については[インストールガイド](docs/installation.md)と[使用ガイド](docs/usage.md)をご覧ください。

## ブラウザ互換性

この拡張機能はChrome/Edge（Manifest V3）とFirefox（Manifest V2）の両方をサポートしています。
