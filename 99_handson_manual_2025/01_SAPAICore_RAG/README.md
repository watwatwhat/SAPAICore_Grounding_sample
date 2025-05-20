# RAGハンズオン手順書

## 準備

1. BTP Cockpitのグローバルアカウントの画面から、ハンズオン用のサブアカウントにObject Storeのエンタイトルメントを追加する
2. BTP Cockpitのサブアカウントから、Build Lobbyにアクセスする
3. Build CodeのFullStackのWorkSpaceを作る（このWorkSpace作成時に作成されるプロジェクトは使わないが、一旦Node.jsプロジェクトにしておく）
4. getStarted からgithubのリポジトリをcloneする
   ```
   https://github.com/watwatwhat/SAPAICore_Grounding_sample.git
   ```

## 01_grounding の手順

### 1. 事前準備

1. WorkSpaceに入り、「deepdiveXXX」を「deepdive011」（ご自身の任意の一意のID）に全文置換する
2. AI Coreのデフォルト（default_aicore）のサービスキーをai_core_sk.jsonにコピペする
3. Object Store on SAP BTP のインスタンスを立てる
   - SAP AI Core のGrounding　機能では、現状 Amazon S3 等をサポートしている。Amazon S3互換のオブジェクトストレージとして、今回は Object Store on SAP BTP を利用します。
4. Object Store on SAP BTP のサービスキーを作成し、object_store_sk.jsonにコピペする
5. ターミナルを起動し、以下のコマンドを実行
   ```
   cd 01_grounding
   npm install
   node 01_prerequisites/01_prerequisites.js
   ```
   - このコードは、まず SAP AI Core の「deepdiveXXX」という名前のリソースグループを検索し、なければ作成するという内容になっています。
   ```js
    async function createResourceGroup(token) {
        const url = `${AI_API_HOST}/v2/admin/resourceGroups`;
        const payload = { resourceGroupId };

        console.log(payload);

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            console.log('✅ Resource Groupの作成を開始しました！');
            console.log('🔍 レスポンス:', response.data);
        } catch (err) {
            logAxiosError(err);
            throw err;
        }
    }
   ```

6. SAP AI Coreのリソースグループの作成が完了次第、SAP AI Launchpadへ移動する
7. SAP AI Launchpadの画面からサービスキーをアップロードして、SAP AI Coreインスタンスに接続する
8. 以下のコマンドを実行してリソースグループのGrounding機能を有効化する
   ```
   node 01_prerequisites/01_prerequisites.js
   ```
   - インタラクティブなスクリプトなので、表示されたメニューから1を選択してGroundingを有効化してください。
   - このコードでは、下記のように、`ext.ai.sap.com/document-grounding`ラベルを含むPATCHリクエストをリソースグループに対して送ることで、当該リソースグループのGrounding機能を有効化します。
   ```js
    async function patchResourceGroupWithGroundingLabel(token) {
        const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;
        const payload = {
            resourceGroupId: resourceGroupId,
            labels: [
                {
                    key: 'ext.ai.sap.com/document-grounding',
                    value: 'true',
                },
            ],
        };

        console.log(url);
        console.log(payload);

        try {
            const response = await axios.patch(url, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            console.log('🔧 Resource GroupにGrounding用ラベルを付与しました！');
            console.log('🔍 レスポンス:', response.data);
        } catch (err) {
            logAxiosError(err);
            throw new Error('❌ Resource Groupへのラベル付与に失敗しました。');
        }
    }
   ```
9. 上記のリクエストが無事完了したら、SAP AI Launchpadから`Grounding Management`のタブが追加されたことと、`Generic Secrets`にシークレットキーが追加されたことを確認する
    - このシークレットは、Object Store on SAP BTPのサービスキーから取得された内容を持っており、Grounding機能がObject Store on SAP BTP にアクセスする際に利用される。
    - 当該のシークレットキー登録は下記のようにAPI経由で行われている。
    ```js
    async function createS3Secret(token) {
        const url = `${AI_API_HOST}/v2/admin/secrets`;
        console.log(`🔑 S3シークレットを読み込み中 ...`);

        const secretData = {
            url: Buffer.from(`https://s3.${s3Info.region}.amazonaws.com`).toString('base64'),
            authentication: Buffer.from('NoAuthentication').toString('base64'),
            description: Buffer.from('Grounding用のS3シークレット').toString('base64'),
            access_key_id: Buffer.from(s3Info.accessKeyId).toString('base64'),
            secret_access_key: Buffer.from(s3Info.secretAccessKey).toString('base64'),
            bucket: Buffer.from(s3Info.bucketName).toString('base64'),
            host: Buffer.from(s3Info.host).toString('base64'),
            region: Buffer.from(s3Info.region).toString('base64'),
            username: Buffer.from(s3Info.username).toString('base64'),
        }

        console.log(secretData);

        const payload = {
            name: secretName,
            data: secretData,
            labels: [
                {
                    key: 'ext.ai.sap.com/document-grounding',
                    value: 'true',
                },
                {
                    key: 'ext.ai.sap.com/documentRepositoryType',
                    value: 'S3',
                },
            ],
        };

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'AI-Resource-Group': resourceGroupId,
        }

        for (const [key, value] of Object.entries(headers)) {
            if (key === 'Authorization') {
                const tokenSnippet = value.slice(7, 17); // "Bearer " の後ろから
                console.log(`${key}: Bearer ${tokenSnippet}...`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }

        try {
            const response = await axios.post(url, payload, {
                headers: headers,
            });
            console.log('✅ S3シークレットを作成しました');
            console.log('🔍 レスポンス:', response.data);
        } catch (err) {
            if (err.response && err.response.status === 409) {
                console.log('ℹ️ S3シークレットはすでに存在します');
            } else {
                logAxiosError(err);
                throw err;
            }
        }
    }
    ```

### 2. パイプラインの作成 -> 自動Embed

1. 下記のコマンドから、RAGの対象となるドキュメントをObject Store on SAP BTPにアップロードする。
   ```
   node 02_pipelineAPI/02_uploadDocs.js SAP_AI_Core_Overview.pdf
   ```
    - この際には、AWS SDK for JavaScriptを用いてアップロードが行われている。
    - 1時間の事前署名付きのURL（アップロードしたpdfを無認証で閲覧できるURL）が出力される。
    ```js
    // AWS S3 クライアントの設定
    const s3 = new AWS.S3({
        accessKeyId: s3Info.accessKeyId,
        secretAccessKey: s3Info.secretAccessKey,
        endpoint: s3Info.host, // SAP BTPのObject Storeの場合も有効
        region: s3Info.region,
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
    });

    // アップロードパラメータ
    const uploadParams = {
        Bucket: s3Info.bucketName,
        Key: fileName,
        Body: fileContent,
        ContentType: 'application/pdf'
    };

    // アップロードと署名付きURLの生成
    s3.upload(uploadParams, (err, data) => {
        if (err) {
            console.error('❌ アップロード失敗:', err);
            return;
        }

        console.log('✅ アップロード成功:', data.Location);

        // Presigned URL 発行（1時間有効）
        const signedUrl = s3.getSignedUrl('getObject', {
            Bucket: s3Info.bucketName,
            Key: fileName,
            Expires: 3600,
        });

        console.log('⏳ 署名付きURL (1時間有効):');
        console.log(signedUrl);
    });

    ```
2. アップロードされたドキュメントを確認
    - これにより、Object Store on SAP BTPにドキュメントを配置したということになる。
3. パイプラインを作成
    - 次に、Object Store on SAP BTPから、格納されているドキュメントにアクセスし、データをSAP AI CoreのGrounding機能側に持ってくるための「パイプライン」の作成を行う。
    - 下記のコマンドを実行する。
   ```
   node 02_pipelineAPI/03_createPipeline.js
   ```
    - このスクリプトでは、S3タイプのリポジトリ（ドキュメントの格納庫）に対して、SAP AI CoreのAPI経由でパイプラインを作成している。これにより、そこに格納されている文書が定期的（現時点では1回/日）にクロールされるようになる。
    ```js
    async function createS3Pipeline(token) {
        const url = `${AI_API_HOST}/v2/lm/document-grounding/pipelines`;

        const payload = {
            type: "S3",
            configuration: {
                destination: secretName
            }
        };
        console.log(url);
        console.log(payload);

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'AI-Resource-Group': resourceGroupId,
        };

        for (const [key, value] of Object.entries(headers)) {
            if (key === 'Authorization') {
                const tokenSnippet = value.slice(7, 17); // "Bearer " の後ろから
                console.log(`${key}: Bearer ${tokenSnippet}...`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }

        try {
            const response = await axios.post(url, payload, {
                headers: headers,
            });

            console.log('✅ Pipeline 作成成功！');
            console.log('📄 Pipeline ID:', response.data.id);
            return response.data;
        } catch (err) {
            if (err.response) {
                console.error('❌ Pipeline 作成エラー:', {
                    status: err.response.status,
                    statusText: err.response.statusText,
                    data: err.response.data,
                });
                throw err;
            } else if (err.request) {
                console.error('❌ Pipeline 作成エラー: No response received', err.request);
                throw err;
            } else {
                console.error('❌ Pipeline 作成エラー:', err.message);
                throw err;
            }
        }
    }
    ```
4. パイプラインを確認
   ```
   node 02_pipelineAPI/04_managePipeline.js list
   ```
5. SAP AI Launchpadの`Grounding Management`から、データリポジトリ（接続先のリポジトリ）が追加されていることを確認する
6. 今作成したリポジトリを開き、データがEmbeddingされていること、およびmetadataが入っていることを確認
   - データが入っていない場合は以下のコマンドで状態を確認することができる。
   - pipelineId のみだと概要的なステータスが、executionIdも含めると詳細なステータスが確認できる。
   ```
   node 02_pipelineAPI/04_managePipeline.js executions <必須：上記listから得たpipelineId> <任意：executionsで得られるexecutionId>
   ```
7. 下記のコマンドを実行して、関連文書するが取得できることを確認する。
    - RAGの言葉で言うと、`Retrieval`がどう動くのか。をこのステップで確認している。
   ```
   node 03_retrievalAPI/06_searchRetrieval.js "リソースグループとは"
   ```
    - このスクリプトでも、SAP AI CoreのAPI経由で検索を行っている。
    ```js
    async function searchRetrieval(token, query, repositoryId = '*', maxChunkCount = 3) {
        const url = `${AI_API_HOST}/v2/lm/document-grounding/retrieval/search`;

        const payload = {
            query: query,
            filters: [
                {
                    id: "filter-1",
                    searchConfiguration: {
                        maxChunkCount: maxChunkCount
                    },
                    dataRepositories: [repositoryId],
                    dataRepositoryType: "vector"
                }
            ]
        };

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'AI-Resource-Group': resourceGroupId,
                    'Content-Type': 'application/json',
                },
            });

            console.log('🔎 検索結果:');
            console.log(JSON.stringify(response.data, null, 2));
        } catch (err) {
            if (err.response) {
                console.error('❌ Retrieval Search エラー:', {
                    status: err.response.status,
                    statusText: err.response.statusText,
                    data: err.response.data,
                });
            } else {
                console.error('❌ Retrieval Search エラー:', err.message);
            }
        }
    }
    ```

### 3. Vector APIを介した手動Embed

1. データリポジトリを作成
   ```
   node 04_vectorAPI/07_manageCollection.js create folkTale text-embedding-ada-002
   ```
2. AI Launchpadからデータリポジトリが作成されたことを確認
3. データリポジトリのIDを取得
   ```
   node 04_vectorAPI/07_manageCollection.js list
   ```
4. ドキュメントを登録
   ```
   node 04_vectorAPI/08_manageDocument.js create <RepositoryID> docs/Momotaro.txt
   ```

### 4. SearchAPI（とVector API）を介した関連文書の抽出

1. データリポジトリから関連文書を検索
   ```
   node 04_vectorAPI/08_manageDocument.js search "桃から生まれる" <RepositoryID>
   ```
   - シェル内での編集が難しい場合は、ツールバーか別の場所で編集してペースト
2. 関連する文書が抽出されたことを確認

### 5. AI LaunchpadのRun Search機能からの抽出

1. AI LaunchpadのRun Searchへ移動
2. 「桃から生まれた」をキーワードに、folkTaleコレクションで、3 Chunksを指定してSearch
3. 類似の結果が得られることを確認

## 02_orchestration の手順

### 1. 事前準備

1. ディレクトリを移動して必要なパッケージをインストール
   ```
   cd 02_orchestration
   npm install
   ```
2. AI Launchpadから、Orchestration用のデプロイメントが必要なことを確認
3. Orchestration用のデプロイメントを作成
   ```
   node 01_prerequisites/01_createOrchDeployment.js deploy
   ```
4. 作成の進捗状況を確認
   ```
   node 01_prerequisites/01_createOrchDeployment.js check
   ```

### 2. Orchestrationを作成

1. AI LaunchpadのGenerative AI Hub -> Orchestrationタブに移動
2. 「Edit Workflow」ボタンからモジュールを追加（今回は全てをON）
3. Groundingモジュールの設定
   - Inputを「question」、Outputを「related_fragments」に名称変更
   - Data Repositoriesで「folkTale」を選択
   - Max 3 Chunksに設定
4. Templateモジュールの設定
   - Messagesにて、以下のメッセージをUserプロンプトとして追加
   ```
   You are a helpful assistant.
   Please respond to user's question based on related contexts.

   User's question: {{?question}}
   Related contexts are as follows: {{?related_fragments}}
   ```
5. Model Configurationモジュール
   - gpt-4o (2024-05-13) を選択
6. その他のモジュールはデフォルト設定のまま

### 3. Orchestrationをテスト実行

1. テストボタンからテストを実行
2. Input Variablesのquestionに「桃から生まれたのは？」と入力
3. Runボタンをクリック
4. Responseを確認し、トレースも確認

### 4. APIからOrchestrationを実行

1. Orchestrationの設定をDownloadボタンからダウンロード
2. ダウンロードした内容を02_orchestration/ModelOrchConfig.jsonにペースト
3. APIからOrchestrationを実行
   ```
   node 02_orchestration/01_callOrchEndpoint.js "桃から生まれたのは誰？"
   ```
4. Orchestration経由でGroundingし、LLMの回答（RAG）が返されることを確認
