# SAP AI Core ドキュメントグラウンディング

このディレクトリには、SAP AI Coreを使用してドキュメントグラウンディングを設定・実行するためのスクリプト群が含まれています。ドキュメントグラウンディングとは、生成AIの回答を企業固有の知識やデータに紐づけて信頼性を高める仕組みです。これにより、生成AIの回答を特定のデータに基づいたものにでき、いわゆるハルシネーションを起こりにくくします。

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

### 1. 初期化

必要なnpmパッケージをインストールします。

```bash
./00_init.sh
```

### 2. 前提条件の設定

SAP AI CoreとObject Storeの連携を設定します。

```bash
node 01_prerequisites.js
```

### 3. ドキュメントのアップロード

グラウンディング対象のドキュメントをObject Store (S3) にアップロードします。

```bash
node 02_uploadDocs.js
```

### 4. パイプラインの作成

ドキュメントのベクトル化処理を行うパイプラインを作成します。

```bash
node 03_createPipeline.js
```

### 5. パイプラインの管理

作成したパイプラインを管理するための対話型スクリプトです。

```bash
# パイプライン一覧の取得
node 04_managePipeline.js list

# 特定のパイプラインの詳細取得
node 04_managePipeline.js get <pipelineId>

# パイプラインのステータス確認
node 04_managePipeline.js status <pipelineId>

# パイプラインの削除
node 04_managePipeline.js delete <pipelineId>
```

### 6. リポジトリ情報の取得

ドキュメントグラウンディング用のデータリポジトリ情報を取得します。

```bash
# すべてのリポジトリを取得
node 05_getRepository.js

# 特定のリポジトリを取得
node 05_getRepository.js <repositoryId>
```

### 7. 検索と取得

グラウンディングされたドキュメントに対して自然言語で検索を行います。

```bash
# すべてのリポジトリで検索（推奨）
node 06_searchRetrieval.js "What is SAP BTP?"

# 特定のリポジトリで検索
node 06_searchRetrieval.js "What is SAP BTP?" <repositoryId>
```

## ファイル構成

- `00_init.sh` - 必要なnpmパッケージをインストール
- `01_prerequisites.js` - SAP AI CoreとObject Storeの連携設定
- `02_uploadDocs.js` - ドキュメントのS3へのアップロード
- `03_createPipeline.js` - ベクトル化パイプラインの作成
- `04_managePipeline.js` - パイプラインの管理（一覧/詳細/ステータス/削除）
- `05_getRepository.js` - データリポジトリ情報の取得
- `06_searchRetrieval.js` - グラウンディングされたドキュメントの検索
- `credentials/` - 認証情報ファイル格納ディレクトリ
- `docs/` - グラウンディング対象のドキュメント格納ディレクトリ

## 注意事項

- 認証情報ファイル（`credentials/`ディレクトリ内）は適切に保護してください
- パイプラインの作成・実行には時間がかかる場合があります
- リソースグループが既に存在する場合は、その旨のメッセージが表示されます
- S3シークレットが既に存在する場合は、その旨のメッセージが表示されます

## 参考リンク

- [SAP AI Core - ドキュメントグラウンディングのリソースグループ作成](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-resource-group-for-ai-data-management)
- [SAP AI Core - AWS S3用のグラウンディングジェネリックシークレット](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/grounding-generic-secrets-for-aws-s3)
- [SAP AI Core - パイプラインAPI](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/pipeline-api)
- [SAP AI Core - データパイプラインの管理](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/manage-data-pipelines)
- [SAP AI Core - リポジトリの取得](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/get-a-repository)
- [SAP AI Core - 検索呼び出し](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/retrieval-search-call)
- [SAP AI Core - Generative AI Hubの新機能Groundingを解き明かす](https://community.sap.com/t5/technology-blogs-by-sap/sap-ai-core-generative-ai-hub%E3%81%AE%E6%96%B0%E6%A9%9F%E8%83%BDgrounding%E3%82%92%E8%A7%A3%E3%81%8D%E6%98%8E%E3%81%8B%E3%81%99/ba-p/14065096)
