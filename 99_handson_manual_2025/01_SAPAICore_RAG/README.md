# RAGハンズオン手順書

## 目次
- [デモ動画](#デモ動画)
- [概要](#概要)
- [準備](#準備)
- [01_grounding の手順](#01_grounding-の手順)
  - [1. 事前準備](#1-事前準備)
  - [2. パイプラインの作成 -> 自動Embed](#2-パイプラインの作成---自動embed)
  - [3. Vector APIを介した手動Embed](#3-vector-apiを介した手動embed)
  - [4. SearchAPI（とVector API）を介した関連文書の抽出](#4-searchapiとvector-apiを介した関連文書の抽出)
  - [5. AI LaunchpadのRun Search機能からの抽出](#5-ai-launchpadのrun-search機能からの抽出)
- [02_orchestration の手順](#02_orchestration-の手順)
  - [デモ動画](#デモ動画-1)
  - [1. 事前準備](#1-事前準備-1)
  - [2. Orchestrationを作成](#2-orchestrationを作成)
  - [3. Orchestrationをテスト実行](#3-orchestrationをテスト実行)
  - [4. APIからOrchestrationを実行](#4-apiからorchestrationを実行)

## デモ動画
以下のYouTubeリンクでハンズオンのデモをご覧いただけます：

[![Grounding デモ動画](https://img.youtube.com/vi/vExXOQprhXk/0.jpg)](https://youtu.be/vExXOQprhXk)

## 概要
このハンズオンでは、SAP AI CoreのGrounding機能とOrchestration機能を用いて、RAGエンドポイントを作成します。
大きな俯瞰図は下記のとおりです。
![RAGエンドポイント作成概要](assets/00_Overview.png)

## 準備

1. BTP Cockpitのグローバルアカウントの画面から、ハンズオン用のサブアカウントにObject Storeのエンタイトルメントを追加する
2. BTP Cockpitのサブアカウントから、Build Lobbyにアクセスする
3. Build CodeのFullStackのWorkSpaceを作る（このWorkSpace作成時に作成されるプロジェクトは使わないが、一旦Node.jsプロジェクトにしておく）
4. getStarted からgithubのリポジトリをcloneする
   ```
   https://github.com/sapwatwatwhat/BTPHackathon2025_deepdive1.git
   ```

## 01_grounding の手順

### 1. 事前準備

1. WorkSpaceに入り、「deepdiveXxX」（← 大文字Xが3つ。置換防止のために真ん中を小文字xにしている）を「deepdiveXXX」（ご自身の任意の一意のID）に全文置換する
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
   - このコードは、まず SAP AI Core の「deepdiveXXX」という名前のリソースグループを検索し、なければ作成するという内容になっています。([01_grounding/01_prerequisites/01_prerequisites.js](../../01_grounding/01_prerequisites/01_prerequisites.js))
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
   - このコードでは、下記のように、`ext.ai.sap.com/document-grounding`ラベルを含むPATCHリクエストをリソースグループに対して送ることで、当該リソースグループのGrounding機能を有効化します。([01_grounding/01_prerequisites/01_prerequisites.js](../../01_grounding/01_prerequisites/01_prerequisites.js))
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
    ([01_grounding/01_prerequisites/01_prerequisites.js](../../01_grounding/01_prerequisites/01_prerequisites.js))
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
    - この際には、AWS SDK for JavaScriptを用いてアップロードが行われている。([01_grounding/02_pipelineAPI/02_uploadDocs.js](../../01_grounding/02_pipelineAPI/02_uploadDocs.js))
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
    - このスクリプトでは、S3タイプのリポジトリ（ドキュメントの格納庫）に対して、SAP AI CoreのAPI経由でパイプラインを作成している。([01_grounding/02_pipelineAPI/03_createPipeline.js](../../01_grounding/02_pipelineAPI/03_createPipeline.js))これにより、そこに格納されている文書が定期的（現時点では1回/日）にクロールされるようになる。
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
    - このスクリプトでも、SAP AI CoreのAPI経由で検索を行っている。([01_grounding/03_retrievalAPI/06_searchRetrieval.js](../../01_grounding/03_retrievalAPI/06_searchRetrieval.js))
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
   - このスクリプトはSAP AI CoreのVector APIを使用してコレクション（データリポジトリ）を作成します。([01_grounding/04_vectorAPI/07_manageCollection.js](../../01_grounding/04_vectorAPI/07_manageCollection.js))
   ```js
   async function createCollection(token, title, embeddingModelName) {
       const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/collections`;
       const payload = {
           title: title,
           embeddingConfig: {
               modelName: embeddingModelName
           },
           metadata: [
               { key: "purpose", value: ["demo"] },
               { key: "project", value: ["DeepDive2025"] }
           ]
       };
       const res = await axios.post(url, payload, getRequestOptions(token));
       console.log(`✅ コレクション作成成功: ${res.data.id}`);
   }
   ```
2. AI Launchpadからデータリポジトリが作成されたことを確認
3. データリポジトリのIDを取得
   ```
   node 04_vectorAPI/07_manageCollection.js list
   ```
   - このコマンドで作成されたコレクションの一覧とIDが表示されます。([01_grounding/04_vectorAPI/07_manageCollection.js](../../01_grounding/04_vectorAPI/07_manageCollection.js))
   ```js
   async function listCollections(token) {
       const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/collections`;
       const res = await axios.get(url, getRequestOptions(token));
       console.log('📚 コレクション一覧:\n', JSON.stringify(res.data, null, 2));
   }
   ```
4. ドキュメントを登録
   ```
   node 04_vectorAPI/08_manageDocument.js create <RepositoryID> docs/Momotaro.txt
   ```
   - このスクリプトは物語のテキストをチャンク（断片）に分割して、ベクトルDBに保存します。([01_grounding/04_vectorAPI/08_manageDocument.js](../../01_grounding/04_vectorAPI/08_manageDocument.js))
   ```js
   async function createDocument(token, collectionId, filePath) {
       const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/collections/${collectionId}/documents`;
       const rawText = fs.readFileSync(filePath, 'utf8');
       const chunks = [];
       for (let i = 0; i < rawText.length; i += CHUNK_SIZE) {
           chunks.push({
               content: rawText.substring(i, i + CHUNK_SIZE),
               metadata: [{ key: "index", value: [(i / CHUNK_SIZE + 1).toString()] }]
           });
       }
       const payload = {
           documents: [
               {
                   metadata: [
                       { key: "source", value: [path.basename(filePath)] }
                   ],
                   chunks: chunks
               }
           ]
       };
       const res = await axios.post(url, payload, getRequestOptions(token));
       console.log('✅ ドキュメント作成成功:\n', JSON.stringify(res.data, null, 2));
   }
   ```

### 4. SearchAPI（とVector API）を介した関連文書の抽出

1. データリポジトリから関連文書を検索
   ```
   node 04_vectorAPI/08_manageDocument.js search "桃から生まれる" <RepositoryID>
   ```
   - シェル内での編集が難しい場合は、ツールバーか別の場所で編集してペースト
   - このスクリプトは、ベクトル検索を使って関連する文書を取得します。([01_grounding/04_vectorAPI/08_manageDocument.js](../../01_grounding/04_vectorAPI/08_manageDocument.js))
   ```js
   async function vectorSearch(token, query, collectionId) {
       const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/search`;
       const payload = {
           query: query,
           filters: [
               {
                   id: "search-1",
                   collectionIds: [collectionId],
                   configuration: {},
                   documentMetadata: [],
                   chunkMetadata: [],
                   collectionMetadata: []
               }
           ]
       };
       const res = await axios.post(url, payload, getRequestOptions(token));
       console.log('🔍 検索結果:\n', JSON.stringify(res.data, null, 2));
   }
   ```
2. 関連する文書が抽出されたことを確認

### 5. AI LaunchpadのRun Search機能からの抽出

1. AI LaunchpadのRun Searchへ移動
2. 「桃から生まれた」をキーワードに、folkTaleコレクションで、3 Chunksを指定してSearch
3. 類似の結果が得られることを確認

## 02_orchestration の手順

### デモ動画
以下のYouTubeリンクでOrchestrationのデモをご覧いただけます：

[![Orchestration デモ動画](https://img.youtube.com/vi/crbT2v8LVlU/0.jpg)](https://youtu.be/crbT2v8LVlU)

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
   - このスクリプトは、オーケストレーション用のConfiguration（構成）とDeployment（デプロイメント）を作成します。([02_orchestration/01_prerequisites/01_createOrchDeployment.js](../../02_orchestration/01_prerequisites/01_createOrchDeployment.js))
   ```js
   // Configuration作成
   async function createConfiguration(token) {
     const url = `${AI_API_HOST}/v2/lm/configurations`;
     const payload = {
       name: "orchestration-config",
       executableId: "orchestration",
       scenarioId: "orchestration"
     };

     const res = await axios.post(url, payload, {
       headers: {
         Authorization: `Bearer ${token}`,
         'ai-resource-group': resourceGroupId,
         'Content-Type': 'application/json'
       }
     });

     console.log("✅ Configuration 作成完了:", res.data.id);
     return res.data.id;
   }

   // Deployment作成
   async function createDeployment(token, configurationId) {
     const url = `${AI_API_HOST}/v2/lm/deployments`;
     const payload = {
       configurationId
     };

     const res = await axios.post(url, payload, {
       headers: {
         Authorization: `Bearer ${token}`,
         'ai-resource-group': resourceGroupId,
         'Content-Type': 'application/json'
       }
     });

     const deploymentId = res.data.id;
     console.log("🚀 Deployment スケジュール完了:", deploymentId);

     // orchDeploymentId を保存
     const currentVars = JSON.parse(fs.readFileSync(userDefinedPath, 'utf8'));
     currentVars.orchDeploymentId = deploymentId;
     fs.writeFileSync(userDefinedPath, JSON.stringify(currentVars, null, 2), 'utf8');
     console.log("💾 orchDeploymentId を user_defined_variable.json に保存しました。");

     return deploymentId;
   }
   ```
4. 作成の進捗状況を確認
   ```
   node 01_prerequisites/01_createOrchDeployment.js check
   ```
   - このコマンドでデプロイメントの状態を確認します。「RUNNING」状態になれば利用可能です。([02_orchestration/01_prerequisites/01_createOrchDeployment.js](../../02_orchestration/01_prerequisites/01_createOrchDeployment.js))
   ```js
   async function checkDeploymentStatus(token, deploymentId) {
     const url = `${AI_API_HOST}/v2/lm/deployments/${deploymentId}`;
     const res = await axios.get(url, {
       headers: {
         Authorization: `Bearer ${token}`,
         'ai-resource-group': resourceGroupId
       }
     });

     const status = res.data.status;
     console.log(`📊 Deployment ステータス: ${status}`);

     if (status === "RUNNING") {
       const deploymentUrl = res.data.deploymentUrl;
       console.log("🌐 Deployment URL:", deploymentUrl);

       // orchDeploymentUrl を保存
       const currentVars = JSON.parse(fs.readFileSync(userDefinedPath, 'utf8'));
       currentVars.orchDeploymentUrl = deploymentUrl;
       fs.writeFileSync(userDefinedPath, JSON.stringify(currentVars, null, 2), 'utf8');
       console.log("💾 orchDeploymentUrl を user_defined_variable.json に保存しました。");

     } else {
       console.log("⏳ まだRUNNINGではありません。数分後に再度確認してください。");
     }
   }
   ```

### 2. Orchestrationを作成

1. AI LaunchpadのGenerative AI Hub -> Orchestrationタブに移動
2. 「Edit Workflow」ボタンからモジュールを追加（今回は全てをON）
3. Groundingモジュールの設定
   - Inputを「question」、Outputを「related_fragments」に名称変更
   - Data Repositoriesで「folkTale」を選択
   - Max 3 Chunksに設定
4. Templateモジュールの設定
   - Messagesにて、以下のメッセージを`System`プロンプトとして追加
   ```
   You are a helpful assistant.
   Please respond to user's question based on related contexts.
   Related contexts are as follows: {{?related_fragments}}
   ```
   - `User`プロンプトとして、下記のメッセージを追加。OrchestrationのAPIの入力となるquestionをそのまま渡している状態。
   ```
   {{?question}}
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
   - このスクリプトは、SAP AI CoreのOrchestrationエンドポイントを呼び出して、RAGパイプラインを実行します。([02_orchestration/02_orchestration/01_callOrchEndpoint.js](../../02_orchestration/02_orchestration/01_callOrchEndpoint.js))
   ```js
   // Orchestrationエンドポイント呼び出し
   async function callOrchestrationCompletion(token, userInputParams) {
     const url = `${deploymentUrl}/completion`;
     const payload = {
       orchestration_config: orchestrationConfig,
       input_params: userInputParams,
     };

     const res = await axios.post(url, payload, {
       headers: {
         Authorization: `Bearer ${token}`,
         'ai-resource-group': resourceGroupId,
         'Content-Type': 'application/json'
       },
     });

     console.log("✅ 応答:");
     console.dir(res.data, { depth: null });
   }

   // 実行処理
   (async () => {
     try {
       const input = process.argv[2];

       if (!input) {
         console.error("❌ 質問が指定されていません。");
         console.log("✅ 使用方法:");
         console.log('node ./02_orchestration/02_orchestration/01_callOrchCompletion.js <question>');
         console.log('例: node ./02_orchestration/02_orchestration/01_callOrchEndpoint.js "桃から生まれたのは誰？"');
         process.exit(1);
       }

       console.log("🔐 トークン取得中...");
       const token = await getXsuaaToken();

       const inputParams = {
         question: input
       };

       console.log("📡 Orchestration 呼び出し中...");
       await callOrchestrationCompletion(token, inputParams);

     } catch (err) {
       if (err.response) {
         console.error("❌ エラー:", err.response.status, err.response.statusText);
         console.error(err.response.data);
       } else {
         console.error("❌ エラー:", err.message);
       }
     }
   })();
   ```
4. Orchestration経由でGroundingし、LLMの回答（RAG）が返されることを確認
