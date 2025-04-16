# SAP AI Core プロンプトレジストリ

このディレクトリには、SAP AI Coreを使用してプロンプトテンプレートを管理・実行するためのスクリプト群が含まれています。プロンプトレジストリとは、AIモデルに対するプロンプトをテンプレート化し、再利用可能な形で管理するための仕組みです。Generative AI Hub内のプロンプトレジストリ機能では、プロンプトテンプレートを作成・管理し、それをAIモデルに適用することができます。

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

### 2. プロンプトテンプレートの作成

プロンプトテンプレートを作成します。

```bash
node 01_createPromptTemplate.js
```

### 3. プロンプトテンプレートの取得

作成したプロンプトテンプレートを取得します。

```bash
node 02_getPromptTemplate.js
```

### 4. プロンプトテンプレートの使用

プロンプトテンプレートを使用して、AIモデルに問い合わせを行います。

```bash
node 03_usePromptTemplate.js
```

## ファイル構成

- `00_init.sh` - 必要なnpmパッケージをインストール
- `01_createPromptTemplate.js` - プロンプトテンプレートの作成
- `02_getPromptTemplate.js` - プロンプトテンプレートの取得
- `03_usePromptTemplate.js` - プロンプトテンプレートの使用
- `credentials/` - 認証情報ファイル格納ディレクトリ

## 注意事項

- 認証情報ファイル（`credentials/`ディレクトリ内）は適切に保護してください
- プロンプトテンプレートの作成・実行には時間がかかる場合があります
- リソースグループが既に存在する場合は、その旨のメッセージが表示されます

## 参考リンク

- [SAP AI Core - プロンプトレジストリ](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/prompt-registry)
- [SAP AI Core - Generative AI Hubのプロンプトレジストリ機能を解き明かす](https://community.sap.com/t5/technology-blogs-by-sap/sap-ai-core-generative-ai-hub%E3%81%AE%E3%83%97%E3%83%AD%E3%83%B3%E3%83%97%E3%83%88%E3%83%AC%E3%82%B8%E3%82%B9%E3%83%88%E3%83%AA%E6%A9%9F%E8%83%BD%E3%82%92%E8%A7%A3%E3%81%8D%E6%98%8E%E3%81%8B%E3%81%99/ba-p/14072026) 