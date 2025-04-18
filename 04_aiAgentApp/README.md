# AI Agent アプリケーション on SAP BTP (SAP Embedding版) ハンズオン実施手順

## 概要
この手順書では、SAP HANA Cloud, Vector Engine に追加されたIn-Database Vectorizationと、SAP AI Core - Generative AI HubによるSAPのLLMパートナー企業から提供されるEmbeddingモデルを併用した、LangChainフレームワークによるAI Agentアプリケーションを構築します。

### アーキテクチャイメージ
![04_aiAgentAppの概要](assets/README/setup/00_aiAgentApp_overview.png)



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
   - "権限 -> エンティティ割り当て" セクションに移動し、サブアカウントを選択します
   - "編集" をクリックします
   - "サービスプランを追加" を選択します
   - 以下のサービスプランを追加します：
     - SAP HANA Schemas & HDI Containers
   - 変更を保存します
   - 変更が保存されるまで待機します
   ![エンタイトルメント追加1](assets/README/setup/16_hdi_addEntitlement_1.png)
   ![エンタイトルメント追加2](assets/README/setup/17_hdi_addEntitlement_2.png)
   ![エンタイトルメント追加3](assets/README/setup/18_hdi_addEntitlement_3.png)

2. HDI コンテナを作成します
   ![HDI作成1](assets/README/setup/19_hdi_createHdi_1.png)
   - **この際、「aiagentsample-deepdiveXXX-db」という名前に対して、自分のIDをXXXに代入した値を入力してください。**
   ![HDI作成2](assets/README/setup/20_hdi_createHdi_2.png)
   <!-- ![HDI作成完了](assets/README/setup/21_hdi_createHdi_created.png) -->

<!-- 3. サービスキーを作成します
   ![サービスキー作成](assets/README/setup/22_hdi_createServiceKey.png)
   ![サービスキー作成完了](assets/README/setup/23_hdi_createdServiceKey.png) -->

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
   
   - 自分のIDに合わせてファイル内のdeepdiveXXXを置き換えます：
     - 検索機能を開きます
       ![検索機能を開く](assets/README/setup/78_replaceIdentifier_openSearchColumn.png)
     - mta.yamlをはじめとする諸ファイル内のdeepdiveXXXを自分のIDで置き換えます
       ![deepdiveXXXを置き換え](assets/README/setup/79_replaceIdentifier_replaceDeepDiveXXX.png)
       
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

### 3.1.5 SAP HANA Database Explorerでデータを確認します
   - SAP HANA Centralを開きます
     ![HANA Centralを開く](assets/README/setup/70_DBX_openHANACentral.png)
   - Database Explorerを開きます
     ![Database Explorerを開く](assets/README/setup/71_DBX_openDatabaseExplorer.png)
   - ログインします
     ![ログイン](assets/README/setup/72_DBX_logon.png)
   - HDIコンテナを追加します
     ![HDIコンテナ追加](assets/README/setup/73_DBX_addHDIContainer.png)
   - サービスキーを取得します
     ![サービスキー取得](assets/README/setup/74_DBX_getSK.png)
   - サービスキーを設定します
     ![サービスキー設定](assets/README/setup/75_DBX_setSK.png)
   - データを開きます
     ![データを開く](assets/README/setup/76_DBX_openData.png)
   - サンプルデータを表示します
     ![サンプルデータ表示](assets/README/setup/77_DBX_viewSampleData.png)

6. 必要に応じてテーブルを削除します：
   - テーブル削除SQLを実行します
     ![テーブル削除](assets/README/setup/58_dropTable.png)
   - テーブルが削除されたことを確認します

### 3.2 AI Core と AI API のデスティネーション設定
1. Node.js がインストールされていることを確認します
2. 以下のコマンドを実行してデスティネーションを設定します：
   ```bash
   cd manualTasks
   npm install
   node 02_setup_AICore_AI_API_destination/setup-aicore-destination.js
   ```

3. AI CoreインスタンスをCAPアプリケーションにバインドします：
   - Command Paletteを開き、「>bind」と入力してローカルバインドを実行するを選択し、バインド先のディレクトリを選択します。capのディレクトリを選択します。
     ![Command Paletteを開く](assets/README/setup/61_createLLMDeployment_bindAICore_openCommandPalette.png)
   - `default_aicore`のインスタンスを選択します
     ![インスタンスを選択](assets/README/setup/62_createLLMDeployment_bindAICore_selectInstance.png)
   - SAP AI Coreインスタンスの環境情報が作成されたことを確認します
     ![環境作成完了](assets/README/setup/63_createLLMDeployment_bindAICore_addedEnv.png)
  - **同様の操作を、pythonのディレクトリに対しても行いましょう。これにより、後続のテストリクエストを処理できるようになります。**


4. LLMデプロイメントを作成します：
   ```bash
   # リソースグループを作成
   node 03_createLLMDeployments/01_init.js
   🔧 モード選択: 1) ResourceGroup作成, 2) モデルデプロイ, 3) 状態確認 [1/2/3]: 1
   ```
   リソースグループが作成されたことを確認します：
   ![リソースグループ作成](assets/README/setup/64_createResourceGroup.png)

   ```bash
   # デプロイメントを作成
   node 03_createLLMDeployments/01_init.js
   🔧 モード選択: 1) ResourceGroup作成, 2) モデルデプロイ, 3) 状態確認 [1/2/3]: 2
   ```
   - 2本のモデル（チャットモデル+エンべディングモデル）をデプロイメントとして追加しますが、かなり時間がかかります(10分 x 2 程度)。途中でスクリプトによる監視が途切れた時は、同じスクリプトを再度実行し、`2)モデルデプロイ`にて再度監視を開始してください。
   ![デプロイメント作成](assets/README/setup/80_createLLMDeployment_runCreationAndCheckState.png)

5. SAP CAPの環境変数に、デプロイが完了したモデルのIDを上書きします。
    ```bash
    node 03_createLLMDeployments/02_migrateDeploymentId.js
    ```
    - 完了すると、`cap/.cdsrc.json`にデプロイメントのIDが指定され、LLMモデルにCAPからアクセスできるようになります。
    ![デプロイメントIDをCAPに設定](assets/README/setup/81_migrateDeploymentIdToCdsrc.png)

6. SAP CAPを再デプロイします。
    ```bash
    cd ../
    mbt build
    cf deploy mta_archives/<プロジェクト名>.mtar
    ```
    - これにより、上記の環境変数が反映されます。
    ![CAPの再デプロイ](assets/README/setup/82_reDeployApp.png)

5. SAP AI LaunchpadとSAP AI Coreのインスタンスを紐付けます：
   - SAP AI Launchpadにログインします
        - **この際、Default Identity Providerでログインしてください。カスタムIASで認証が走ってしまっている場合は、シークレットモードでSAP AI Launchpadのリンクを開いてください。**
   - インスタンスの紐付け画面を開きます
     ![インスタンス紐付け画面](assets/README/setup/67_launchpadConfig_getSK.png)
   - SAP AI Coreのインスタンスを選択します
     ![インスタンス選択](assets/README/setup/68_launchpadConfig_openAILaunchpad.png)
   - 紐付けが完了したことを確認します
     ![紐付け完了](assets/README/setup/69_launchpadConfig_uploadSK.png)
   - 上記作業で作成されたConfigurationやDeploymentsの確認が可能です。


### 3.3 テストリクエストの実行

#### CAPアプリケーション用のテストリクエスト
1. Node.js がインストールされていることを確認します
2. GET用のテストスクリプトを実行します：
    ```bash
    node 03_test_requests/cap/test.js
    どの操作を実行しますか？（get / post）: get
    ```
   
3. GETリクエストのテスト結果を確認します：
   ![GETリクエストテスト結果](assets/README/setup/60_test_getData.png)

4. POST用のテストスクリプトを実行します：
    ```bash
    node 03_test_requests/cap/test.js
    どの操作を実行しますか？（get / post）: post
    ```
   
5. POSTリクエストのテスト結果を確認します：
  - POSTリクエストにより、SAP CAPを介してDBにデータを登録します。カスタムハンドラを用いて、格納後にカスタムのEmbeddingを特定のカラムに格納しています。
  ![POSTリクエストテスト結果](assets/README/setup/83_test_addDataViaAPI.png)

6. SAP HANA Database Explorerより挿入されたデータを確認する
  - SAP HANA Database Explorerへのアクセスは[こちら](#315-sap-hana-database-explorerでデータを確認します)をご参照ください。
  - CUSTOM_EMBEDDINGカラムに、SAP AI Coreにデプロイしてカスタムで作成したベクトル表現が格納されます。
  ![POSTリクエストテスト結果](assets/README/setup/84_addedCustomEmbeddingData.png)
  

#### Pythonモジュール用のテストリクエスト
1. Node.js がインストールされていることを確認します
2. テストスクリプトを実行します：
   ```bash
   node 03_test_requests/python/test.js
   ```
   どのエンドポイントを呼び出しますか？（chat / chain）: chain

3.`/chain`エンドポイントに対するリクエストのテスト結果を確認します：
   ![chainエンドポイントの呼び出し](assets/README/setup/85_executePythonModule.png)

4. ログの確認
  - `cf apps` にて、デプロイされたアプリケーション一覧を表示し、ai-agentアプリの名前をコピーする
  - `cf logs <アプリケーション名>` により、ログをストリーミングする
  - この状態で上記のテストリクエストを送付すると、下記の通りログを確認できる。
  - SAP HANA Cloud からRAGツールを用いて関連するデータを取得し、それに基づいて回答を生成していることが確認できる。
   ![LangChainログ](assets/README/setup/86_getPythonLogs.png)
   

## 注意事項
- セットアップには SAP BTP の適切な権限が必要です
- リソースの作成には時間がかかる場合があります
- 各ステップで問題が発生した場合は、画像を参照して設定を確認してください
- 手動タスクの実行前に、必要なツール（Node.js）がインストールされていることを確認してください
- SQLファイルの実行時は、適切なデータベース接続情報を指定してください
- テストリクエストは、Pythonモジュール用またはCAPアプリケーション用のいずれかの方法で実行できます
