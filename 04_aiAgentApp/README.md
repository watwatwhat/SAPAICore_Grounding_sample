# SAP AI Core Grounding サンプルアプリケーション セットアップ手順

## 1. HANA Cloud セットアップ

### 1.1 HANA Cloud Booster の実行
1. SAP BTP コックピットにログインし、HANA Cloud Booster を検索します
   ![HANA Cloud Booster 検索](assets/README/setup/01_booster_searchBoosterForHANACloud.png)

2. "HANA Cloud のセットアップ" シナリオを選択します
   ![シナリオ選択](assets/README/setup/02_booster_selectScenario.png)

3. サブアカウントを選択します
   ![サブアカウント選択](assets/README/setup/03_booster_selectSubaccount.png)

4. ユーザーを指定します
   ![ユーザー指定](assets/README/setup/04_booster_designateUser.png)

### 1.2 HANA Cloud インスタンスの作成
1. HANA Cockpit を起動します
   ![HANA Cockpit 起動](assets/README/setup/05_cockpit_launchHANACockpit.png)

2. Cloud Foundry にログインします
   ![Cloud Foundry ログイン](assets/README/setup/07_createDB_loginToCF.png)

3. スペースを選択します
   ![スペース選択](assets/README/setup/08_createDB_selectSpace.png)

4. 以下の設定で HANA Cloud インスタンスを作成します：
   - 一般設定
     ![一般設定](assets/README/setup/09_createDB_generalSetting.png)
   - スペック設定
     ![スペック設定](assets/README/setup/10_createDB_specSetting.png)
   - アベイラビリティーゾーンの選択
     ![AZ選択](assets/README/setup/11_createDB_selectAZ.png)
   - NLP 機能の有効化
     ![NLP有効化](assets/README/setup/12_createDB_enableNLP.png)
   - インスタンスマッピングの設定
     ![インスタンスマッピング](assets/README/setup/13_createDB_instanceMapping.png)

5. インスタンス作成を実行します
   ![インスタンス作成実行](assets/README/setup/14_createDB_executeCreation.png)
   ![インスタンス作成完了](assets/README/setup/15_createDB_created.png)

### 1.3 HDI コンテナの設定
1. HDI コンテナを作成します
   ![HDI作成1](assets/README/setup/19_hdi_createHdi_1.png)
   ![HDI作成2](assets/README/setup/20_hdi_createHdi_2.png)
   ![HDI作成完了](assets/README/setup/21_hdi_createHdi_created.png)

2. エンタイトルメントの追加を行います
   ![エンタイトルメント追加1](assets/README/setup/16_hdi_addEntitlement_1.png)
   ![エンタイトルメント追加2](assets/README/setup/17_hdi_addEntitlement_2.png)
   ![エンタイトルメント追加3](assets/README/setup/18_hdi_addEntitlement_3.png)

3. サービスキーを作成します
   ![サービスキー作成](assets/README/setup/22_hdi_createServiceKey.png)
   ![サービスキー作成完了](assets/README/setup/23_hdi_createdServiceKey.png)

## 2. アプリケーションのデプロイ

### 2.1 デプロイ前の準備
1. Cloud Foundry にログインします
   ![Cloud Foundry ログイン](assets/README/setup/25_deployApp_cfLogin.png)

2. API エンドポイントを取得します
   ![APIエンドポイント取得](assets/README/setup/24_deployApp_getAPIEndpoint.png)

### 2.2 アプリケーションのビルドとデプロイ
1. アプリケーションをビルドし、デプロイします
   ![アプリケーションのビルドとデプロイ](assets/README/setup/26_deployApp_buildAndDeploy.png)

## 3. 手動タスクの実行

### 3.1 テーブルの作成とテストデータの投入
1. HANA Cockpit にログインし、SQLコンソールを開きます
2. 以下のSQLファイルを順番に実行します：
   ```bash
   # テーブル作成
   cat manualTasks/01_tables_manual_creation/createTable_QAHISTORY.sql | hdbsql -i <instance_number> -d <database_name> -u <username> -p <password>

   # テストデータ投入
   cat manualTasks/01_tables_manual_creation/insertTestData_QAHISTORY.sql | hdbsql -i <instance_number> -d <database_name> -u <username> -p <password>
   ```

### 3.2 AI Core と AI API のデスティネーション設定
1. Node.js がインストールされていることを確認します
2. 以下のコマンドを実行してデスティネーションを設定します：
   ```bash
   cd manualTasks/02_setup_AICore_AI_API_destination
   npm install
   node setup-aicore-destination.js
   ```

### 3.3 テストリクエストの実行

#### Pythonモジュール用のテストリクエスト
1. Node.js がインストールされていることを確認します
2. テストスクリプトのディレクトリに移動します：
   ```bash
   cd manualTasks/03_test_requests/python
   ```
3. 必要なパッケージをインストールします：
   ```bash
   npm install
   ```
4. テストスクリプトを実行します：
   ```bash
   node test.js
   ```

#### CAPアプリケーション用のテストリクエスト
1. Node.js がインストールされていることを確認します
2. テストスクリプトのディレクトリに移動します：
   ```bash
   cd manualTasks/03_test_requests/cap
   ```
3. 必要なパッケージをインストールします：
   ```bash
   npm install
   ```
4. テストスクリプトを実行します：
   ```bash
   node test.js
   ```

## 注意事項
- セットアップには SAP BTP の適切な権限が必要です
- リソースの作成には時間がかかる場合があります
- 各ステップで問題が発生した場合は、画像を参照して設定を確認してください
- 手動タスクの実行前に、必要なツール（Node.js）がインストールされていることを確認してください
- SQLファイルの実行時は、適切なデータベース接続情報を指定してください
- テストリクエストは、Pythonモジュール用またはCAPアプリケーション用のいずれかの方法で実行できます
