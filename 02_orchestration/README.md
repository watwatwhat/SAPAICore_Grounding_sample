# SAP AI Core オーケストレーション

このディレクトリには、SAP AI Coreを使用してオーケストレーションを設定・実行するためのスクリプト群が含まれています。オーケストレーションとは、複数のAIモデルを組み合わせて、より複雑なタスクを実行するための仕組みです。Generative AI Hub内のオーケストレーションモジュールでは、プロンプトの処理やモデル実行の流れに沿って複数のステップを定義できます。

## 前提条件

- SAP BTP アカウント
- SAP AI Core インスタンス
- Node.js 環境

## 認証情報の設定

以下の認証情報ファイルを `credentials` ディレクトリに配置する必要があります：

1. `ai_core_sk.json` - SAP AI Coreのサービスキー
2. `user_defined_variable.json` - ユーザー定義変数（リソースグループIDとシークレット名）

## 実行手順

### 1. 初期化

必要なnpmパッケージをインストールします。

```bash
./00_init.sh
```

### 2. 前提条件の設定

SAP AI Coreのオーケストレーション用の設定を行います。

```bash
node 01_prerequisites.js
```

### 3. オーケストレーションエンドポイントの呼び出し

オーケストレーションエンドポイントを呼び出して、複数のAIモデルを組み合わせた処理を実行します。

```bash
node 02_orchestration/01_callOrchEndpoint.js
```

## ファイル構成

- `00_init.sh` - 必要なnpmパッケージをインストール
- `01_prerequisites.js` - SAP AI Coreのオーケストレーション設定
- `02_orchestration/01_callOrchEndpoint.js` - オーケストレーションエンドポイントの呼び出し
- `02_orchestration/ModelOrchConfig.json` - オーケストレーション設定ファイル
- `credentials/` - 認証情報ファイル格納ディレクトリ

## 注意事項

- 認証情報ファイル（`credentials/`ディレクトリ内）は適切に保護してください
- オーケストレーションの実行には時間がかかる場合があります
- リソースグループが既に存在する場合は、その旨のメッセージが表示されます

## 参考リンク

- [SAP AI Core - オーケストレーション](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/orchestration)
- [SAP AI Core - Orchestration機能を解き明かす](https://community.sap.com/t5/technology-blogs-by-sap/sap-ai-core-orchestration%E6%A9%9F%E8%83%BD-%E3%82%92%E8%A7%A3%E3%81%8D%E6%98%8E%E3%81%8B%E3%81%99/ba-p/14066141) 