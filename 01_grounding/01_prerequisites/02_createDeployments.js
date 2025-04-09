const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// 認証情報の読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/ai_core_sk.json'), 'utf8'));
const userCredsPath = path.join(__dirname, '../../credentials/user_defined_variable.json');
const userCreds = JSON.parse(fs.readFileSync(userCredsPath, 'utf8'));

// 認証情報の設定
const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;
const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;

const resourceGroupId = userCreds.resourceGroupId;

// アクセストークンの取得
async function getXsuaaToken() {
    const url = `${xsuaaHostname}/oauth/token`;
    const authHeader = Buffer.from(`${xsuaaClient}:${xsuaaSecret}`).toString('base64');

    const data = qs.stringify({
        grant_type: 'client_credentials',
        client_id: xsuaaClient,
        client_secret: xsuaaSecret,
    });

    const response = await axios.post(url, data, {
        headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    console.log('✅ Access token 取得完了');
    return response.data.access_token;
}

// Configurationの作成
async function createConfiguration(token, modelName, modelVersion) {
    const url = `${AI_API_HOST}/v2/lm/configurations`;

    const payload = {
        name: `${modelName}-configuration`,
        executableId: "azure-openai",
        scenarioId: "foundation-models",
        description: `Configuration for ${modelName} deployment`,
        parameters: {
            modelName: modelName,
            modelVersion: modelVersion
        },
        artifacts: {
            model: {
                artifactName: `${modelName}-model`,
                version: modelVersion
            }
        },
        environment: {
            variables: {
                // 必要に応じて環境変数を追加
            }
        }
    };

    console.log(`📦 ${modelName} のConfigurationペイロード:`, JSON.stringify(payload, null, 2));

    try {
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'AI-Resource-Group': resourceGroupId,
        };

        const response = await axios.post(url, payload, {
            headers: headers
        });

        console.log(`✅ ${modelName} のConfiguration作成成功！`);
        console.log('📄 Configuration ID:', response.data.id);

        // Configuration IDをファイルに保存
        userCreds[`${modelName}_configurationId`] = response.data.id;
        fs.writeFileSync(userCredsPath, JSON.stringify(userCreds, null, 2));

        return response.data.id;
    } catch (err) {
        console.error(`❌ ${modelName} のConfiguration作成エラー:`, err.response?.data || err.message);
        throw err;
    }
}

// Deploymentの作成
async function createDeployment(token, configurationId, modelName) {
    const url = `${AI_API_HOST}/v2/lm/deployments`;

    const payload = {
        configurationId: configurationId,
        deploymentTemplateId: `foundation-models-${modelName}-latest`,
        resourceGroupId: resourceGroupId
    };

    console.log(`📦 ${modelName} のDeploymentペイロード:`, JSON.stringify(payload, null, 2));

    try {
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'AI-Resource-Group': resourceGroupId,
        };

        const response = await axios.post(url, payload, {
            headers: headers
        });

        console.log(`✅ ${modelName} のDeployment作成成功！`);
        console.log('📄 Deployment ID:', response.data.id);

        // Deployment IDをファイルに保存
        userCreds[`${modelName}_deploymentId`] = response.data.id;
        fs.writeFileSync(userCredsPath, JSON.stringify(userCreds, null, 2));

        return response.data.id;
    } catch (err) {
        console.error(`❌ ${modelName} のDeployment作成エラー:`, err.response?.data || err.message);
        throw err;
    }
}

// Deploymentのステータス確認（ポーリング）
async function waitForDeployment(token, deploymentId, interval = 5000) {
    const url = `${AI_API_HOST}/v2/lm/deployments/${deploymentId}`;

    console.log(`⏳ デプロイメント ${deploymentId} のステータスを監視中...`);

    while (true) {
        try {
            const response = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'AI-Resource-Group': resourceGroupId,
                },
            });

            const status = response.data.status;
            console.log(`📄 現在のステータス: ${status}`);

            if (status === 'RUNNING') {
                console.log('🎉 デプロイメントが正常に開始されました！');
                break;
            } else if (status === 'DEAD') {
                console.error('❌ デプロイメントが失敗しました。');
                break;
            }

            // 次のチェックまで待機
            await new Promise(resolve => setTimeout(resolve, interval));
        } catch (err) {
            console.error('❌ ステータス取得エラー:', err.response?.data || err.message);
            throw err;
        }
    }
}

// 実行処理
(async () => {
    try {
        console.log('🔐 アクセストークンを取得中...');
        const token = await getXsuaaToken();

        // デプロイするモデルのリスト
        const models = [
            { name: 'gpt-4o', version: 'latest' },
            { name: 'text-embeddings-ada-002', version: 'latest' }
        ];

        for (const model of models) {
            const configurationIdKey = `${model.name}_configurationId`;
            const deploymentIdKey = `${model.name}_deploymentId`;

            // userCredsから既存のConfiguration IDとDeployment IDを取得
            let configurationId = userCreds[configurationIdKey];
            let deploymentId = userCreds[deploymentIdKey];

            // Configurationが存在しない場合は作成
            if (!configurationId) {
                console.log(`📄 ${model.name} のConfigurationを作成中...`);
                configurationId = await createConfiguration(token, model.name, model.version);
                userCreds[configurationIdKey] = configurationId;
                fs.writeFileSync(userCredsPath, JSON.stringify(userCreds, null, 2));
            } else {
                console.log(`✅ ${model.name} のConfigurationは既に存在します。`);
            }

            // Deploymentが存在しない場合は作成
            if (!deploymentId) {
                console.log(`📄 ${model.name} のDeploymentを作成中...`);
                deploymentId = await createDeployment(token, configurationId, model.name);
                userCreds[deploymentIdKey] = deploymentId;
                fs.writeFileSync(userCredsPath, JSON.stringify(userCreds, null, 2));
            } else {
                console.log(`✅ ${model.name} のDeploymentは既に存在します。`);
            }

            // Deploymentのステータスを監視
            await waitForDeployment(token, deploymentId);
        }

        console.log('🎉 全てのモデルのデプロイメント処理が完了しました！');
    } catch (err) {
        console.error('❌ 実行中にエラーが発生しました:', err.message);
    }
})();