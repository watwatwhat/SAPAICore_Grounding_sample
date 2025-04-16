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
1. グローバルアカウントからサブアカウントへのEntitlement付与を行います：
   - SAP BTP コックピットでグローバルアカウントにログインします
   - サブアカウントを選択します
   - "Entitlements" セクションに移動します
   - "Configure Entitlements" をクリックします
   - "Add Service Plans" を選択します
   - 以下のサービスプランを追加します：
     - SAP HANA Cloud
     - SAP HANA Schemas & HDI Containers
   - 変更を保存します
   ![エンタイトルメント追加1](assets/README/setup/16_hdi_addEntitlement_1.png)
   ![エンタイトルメント追加2](assets/README/setup/17_hdi_addEntitlement_2.png)
   ![エンタイトルメント追加3](assets/README/setup/18_hdi_addEntitlement_3.png)

2. HDI コンテナを作成します
   ![HDI作成1](assets/README/setup/19_hdi_createHdi_1.png)
   ![HDI作成2](assets/README/setup/20_hdi_createHdi_2.png)
   ![HDI作成完了](assets/README/setup/21_hdi_createHdi_created.png)

3. サービスキーを作成します
   ![サービスキー作成](assets/README/setup/22_hdi_createServiceKey.png)
   ![サービスキー作成完了](assets/README/setup/23_hdi_createdServiceKey.png)

## 2. アプリケーションのデプロイ

### 2.1 デプロイ前の準備
1. ワークスペースを作成します：
   - "Create Workspace" をクリックします
     ![ワークスペース作成](assets/README/setup/33_createWorkSpace_clickCreate.png)
   - "App Development" を選択します
     ![App Developmentを選択](assets/README/setup/34_createWorkSpace_selectAppDevelopment.png)
   - "Build Code" を選択します
     ![Build Codeを選択](assets/README/setup/35_createWorkSpace_selectBuildCode.png)
   - "Full Stack" を選択します
     ![Full Stackを選択](assets/README/setup/36_createWorkSpace_selectFullStack.png)
   - 詳細情報を入力します
     ![詳細情報を入力](assets/README/setup/37_createWorkSpace_inputDetails.png)
   - "Get Started" をクリックします
     ![Get Startedをクリック](assets/README/setup/38_createWorkSpace_GetStarted.png)
   - Gitからクローンします
     ![Gitからクローン](assets/README/setup/39_createWorkSpace_CloneFromGit.png)
   - プロジェクトがクローンされたことを確認します
     ![プロジェクトクローン完了](assets/README/setup/40_createWorkSpace_clonedProject.png)
   - ターミナルを開き、プロジェクトディレクトリに移動します
     ![ターミナルを開く](assets/README/setup/41_createWorkSpace_openTerminalAndGoToProjectDir.png)

2. DevSpaceにHANA Toolsを追加します：
   - DevSpace Managerを開きます
     ![DevSpace Managerを開く](assets/README/setup/27_addHanaTools_openDevSpaceManager.png)
   - 実行中のDevSpaceを停止します
     ![DevSpaceを停止](assets/README/setup/28_addHanaTools_stopDevSpace.png)
   - Settingsを開きます
     ![Settingsを開く](assets/README/setup/29_addHanaTools_openSettings.png)
   - HANA Toolsを選択します
     ![HANA Toolsを選択](assets/README/setup/30_addHanaTools_selectHanaTools.png)
   - DevSpaceを再起動します
     ![DevSpaceを起動](assets/README/setup/31_addHanaTools_startDevSpace.png)
   - 実行状態を確認します
     ![実行状態を確認](assets/README/setup/32_addHanaTools_checkRunningState.png)

3. SAP Cloud Loggingのインスタンスを作成します：
   - SAP BTP コックピットでインスタンス作成画面を開きます
   - インスタンス名を入力します
     ![インスタンス名を入力](assets/README/setup/43_createLoggingInstance_nameInstance.png)
   - インスタンスを作成します
     ![インスタンスを作成](assets/README/setup/42_createLoggingInstance_create.png)
   - インスタンスが作成されたことを確認します
     ![インスタンス作成完了](assets/README/setup/44_createLoggingInstance_instanceCreated.png)

4. Cloud Foundry にログインします
   ![Cloud Foundry ログイン](assets/README/setup/25_deployApp_cfLogin.png)

5. API エンドポイントを取得します
   ![APIエンドポイント取得](assets/README/setup/24_deployApp_getAPIEndpoint.png)

### 2.2 アプリケーションのビルドとデプロイ
1. アプリケーションをビルドし、デプロイします
   ![アプリケーションのビルドとデプロイ](assets/README/setup/26_deployApp_buildAndDeploy.png)

## 3. 手動タスクの実行

### 3.1 テーブルの作成とテストデータの投入
1. HANA Cockpit にログインし、SQLコンソールを開きます
2. HDIコンテナに接続します：
   - Command Paletteを開きます
     ![Command Paletteを開く](assets/README/setup/49_addDB_openCommandPalette.png)
   - HDIコンテナを選択します
     ![HDIコンテナを選択](assets/README/setup/50_addDB_selectHdiContainer.png)
   - HDIコンテナが接続されたことを確認します
     ![HDIコンテナ接続完了](assets/README/setup/51_addDB_HdiContainerConnected.png)
   - SQLファイルを開きます
     ![SQLファイルを開く](assets/README/setup/52_addDB_openSQLFile.png)
   - 対象のHDIコンテナを選択します
     ![対象HDIコンテナを選択](assets/README/setup/53_addDB_targetHdiContainer.png)
   - 認証情報を取得します
     ![認証情報を取得](assets/README/setup/54_addDB_getCredentials.png)
   - 認証情報を入力します
     ![認証情報を入力](assets/README/setup/55_addDB_inputCredentials.png)
   - DBへの接続が成功したことを確認します
     ![DB接続成功](assets/README/setup/56_addDB_successfulConnectionToDB.png)

3. テーブルを作成します：
   - テーブル作成SQLを実行します
     ![テーブル作成](assets/README/setup/57_createTable.png)
   - テーブルが作成されたことを確認します

4. サンプルデータを投入します：
   - サンプルデータ投入SQLを実行します
     ![サンプルデータ投入](assets/README/setup/59_insertSampleData.png)
   - データが投入されたことを確認します

5. 必要に応じてテーブルを削除します：
   - テーブル削除SQLを実行します
     ![テーブル削除](assets/README/setup/58_dropTable.png)
   - テーブルが削除されたことを確認します

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
4. Destinationインスタンスをバインドします：
   - Destination Selectorを開きます
     ![Destination Selectorを開く](assets/README/setup/45_test_cap_bindDestination_openSelector.png)
   - ディレクトリを選択します
     ![ディレクトリを選択](assets/README/setup/46_test_cap_bindDestination_selectDir.png)
   - インスタンスを選択します
     ![インスタンスを選択](assets/README/setup/47_test_cap_bindDestination_selectInstance.png)
   - 環境が作成されたことを確認します
     ![環境作成完了](assets/README/setup/48_test_cap_bindDestination_createdEnv.png)
5. テストスクリプトを実行します：
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
4. Destinationインスタンスをバインドします：
   - Destination Selectorを開きます
     ![Destination Selectorを開く](assets/README/setup/45_test_cap_bindDestination_openSelector.png)
   - ディレクトリを選択します
     ![ディレクトリを選択](assets/README/setup/46_test_cap_bindDestination_selectDir.png)
   - インスタンスを選択します
     ![インスタンスを選択](assets/README/setup/47_test_cap_bindDestination_selectInstance.png)
   - 環境が作成されたことを確認します
     ![環境作成完了](assets/README/setup/48_test_cap_bindDestination_createdEnv.png)
5. テストスクリプトを実行します：
   ```bash
   node test.js
   どの操作を実行しますか？（get / post）: get
   ```
6. GETリクエストのテスト結果を確認します：
   ![GETリクエストテスト結果](assets/README/setup/60_test_getData.png)

## 注意事項
- セットアップには SAP BTP の適切な権限が必要です
- リソースの作成には時間がかかる場合があります
- 各ステップで問題が発生した場合は、画像を参照して設定を確認してください
- 手動タスクの実行前に、必要なツール（Node.js）がインストールされていることを確認してください
- SQLファイルの実行時は、適切なデータベース接続情報を指定してください
- テストリクエストは、Pythonモジュール用またはCAPアプリケーション用のいずれかの方法で実行できます
