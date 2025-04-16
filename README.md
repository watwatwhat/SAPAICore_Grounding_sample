# SAP AI Core サンプルコード

このリポジトリには、SAP AI Coreを使用してAIモデルを管理・実行するためのサンプルコードが含まれています。

## ディレクトリ構成

- `01_grounding/` - ドキュメントグラウンディングのサンプルコード
- `02_orchestration/` - オーケストレーションのサンプルコード
- `03_promptRegistry/` - プロンプトレジストリのサンプルコード
- `04_aiAgentApp/` - AIエージェントアプリケーションのサンプルコード
- `credentials/` - 認証情報ファイル格納ディレクトリ

## 前提条件

- SAP BTP アカウント
- SAP AI Core インスタンス
- Object Store (Amazon S3互換) へのアクセス
- Node.js 環境

## 認証情報の設定

以下の認証情報ファイルを `credentials` ディレクトリに配置する必要があります：

1. `ai_core_sk.json` - SAP AI Coreのサービスキー
2. `object_store_sk.json` - Object Store (S3) のサービスキー
3. `user_defined_variable.json` - ユーザー定義変数（リソースグループIDとシークレット名）

## 実行手順

各ディレクトリのREADME.mdを参照してください。

## 注意事項

- 認証情報ファイル（`credentials/`ディレクトリ内）は適切に保護してください
- 各機能の実行には時間がかかる場合があります
- リソースグループが既に存在する場合は、その旨のメッセージが表示されます

## 参考リンク

- [SAP AI Core - ドキュメントグラウンディング](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/document-grounding)
- [SAP AI Core - オーケストレーション](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/orchestration)
- [SAP AI Core - プロンプトレジストリ](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/prompt-registry) 