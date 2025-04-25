// ========================
// 
// SAP AI CoreやObject Storeとの紐付けを準備する
// https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-resource-group-for-ai-data-management
// 
// ========================
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');
const readline = require('readline');

// Resource Group ID バリデーション関数
function isValidResourceGroupId(id) {
    const minLength = 3;
    const maxLength = 253;
    const validPattern = /^[a-zA-Z0-9]([a-zA-Z0-9.-]{1,251})[a-zA-Z0-9]$/;

    if (typeof id !== 'string') {
        return { valid: false, reason: 'IDは文字列である必要があります。' };
    }
    if (id.length < minLength || id.length > maxLength) {
        return { valid: false, reason: `長さは${minLength}〜${maxLength}文字である必要があります。` };
    }
    if (!validPattern.test(id)) {
        return {
            valid: false,
            reason: 'IDは英数字で始まり・終わり、途中にハイフン(-)とピリオド(.)を含むことができます。',
        };
    }
    return { valid: true };
}

const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/ai_core_sk.json'), 'utf8'));
const s3Creds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/object_store_sk.json'), 'utf8'));
const userCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/user_defined_variable.json'), 'utf8'));

const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;

const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;
const resourceGroupId = userCreds.resourceGroupId;
const secretName = userCreds.secretName;

const validation = isValidResourceGroupId(resourceGroupId);
if (!validation.valid) {
    console.error(`❌ 無効なresourceGroupId "${resourceGroupId}": ${validation.reason}`);
    process.exit(1);
}

const s3Info = {
    bucketName: s3Creds.bucket,
    region: s3Creds.region,
    host: s3Creds.host,
    accessKeyId: s3Creds.access_key_id,
    secretAccessKey: s3Creds.secret_access_key,
    username: s3Creds.username,
};

async function getXsuaaToken() {
    const url = `${xsuaaHostname}/oauth/token`;
    const authHeader = Buffer.from(`${xsuaaClient}:${xsuaaSecret}`).toString('base64');

    const data = qs.stringify({
        grant_type: 'client_credentials',
        client_id: xsuaaClient,
        client_secret: xsuaaSecret,
    });

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        console.log('✅ アクセストークンを取得しました！');
        return response.data.access_token;
    } catch (err) {
        logAxiosError(err);
        throw err;
    }
}

async function checkExistingResourceGroup(token) {
    const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const { status, statusMessage, labels } = response.data;
        console.log(`ℹ️ Resource Group "${resourceGroupId}" はすでに存在します。`);
        console.log(`🔎 ステータス: ${status}`);
        if (statusMessage) {
            console.log(`📝 メッセージ: ${statusMessage}`);
        }
        return { exists: true, status, statusMessage, labels };
    } catch (err) {
        if (err.response && err.response.status === 404) {
            console.log('ℹ️ Resource Groupが存在しないため、作成を続行します...');
            return { exists: false };
        } else {
            logAxiosError(err);
            throw err;
        }
    }
}

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

async function waitForResourceGroupDeletion(token, retries = 10, delayMs = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            await axios.get(`${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            console.log(`⏳ Resource Groupはまだ存在します... (${i + 1}/${retries})`);
        } catch (err) {
            if (err.response && err.response.status === 404) {
                console.log('✅ Resource Groupは正常に削除されました！');
                return;
            }
            logAxiosError(err);
            throw err;
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    throw new Error('⛔ Resource Groupは想定時間内に削除されませんでした。');
}

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

async function waitForResourceGroupReady(token, retries = 12, delayMs = 5000) {
    for (let i = 0; i < retries; i++) {
        const { status, statusMessage } = await getResourceGroupStatus(token);
        if (status === 'PROVISIONED') {
            console.log('✅ Resource Groupの準備が完了しました！');
            return;
        }
        if (status === 'ERROR') {
            console.error('❌ Resource GroupのステータスがERRORです');
            console.error(`📝 エラーメッセージ: ${statusMessage || 'なし'}`);
            throw new Error('Resource Groupの作成に失敗しました。');
        }
        console.log(`⏳ 準備が完了するのを待機中... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    throw new Error('⛔ Resource Groupは時間内に準備完了になりませんでした。');
}

async function getResourceGroupStatus(token) {
    const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const { status, statusMessage } = response.data;
        console.log(`🔎 現在のステータス: ${status}`);
        if (statusMessage) {
            console.log(`📝 メッセージ: ${statusMessage}`);
        }
        return { status, statusMessage };
    } catch (err) {
        logAxiosError(err);
        throw err;
    }
}

async function createS3Secret(token) {
    const url = `${AI_API_HOST}/v2/admin/secrets`;
    console.log(`🔑 S3シークレットを読み込み中 ...`);

    const secretData = {
        // url: Buffer.from(`https://${s3Info.bucketName}.s3.${s3Info.region}.amazonaws.com`).toString('base64'),
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

function logAxiosError(err) {
    console.error('❌ リクエスト中にエラーが発生しました:');
    if (err.config) {
        console.error(`📍 URL: ${err.config.url}`);
        console.error(`📦 メソッド: ${err.config.method}`);
        console.error(`📤 データ: ${JSON.stringify(err.config.data, null, 2)}`);
    }
    if (err.response) {
        console.error(`🚨 ステータス: ${err.response.status}`);
        console.error(`📨 ヘッダー: ${JSON.stringify(err.response.headers, null, 2)}`);
        console.error(`📨 データ: ${JSON.stringify(err.response.data, null, 2)}`);
    } else {
        console.error(`⚠️ メッセージ: ${err.message}`);
    }
}

(async () => {
    try {
        console.log('🔐 アクセストークンを取得しています...');
        const token = await getXsuaaToken();

        const { exists, status, statusMessage, labels } = await checkExistingResourceGroup(token);

        if (exists) {
            if (status === 'ERROR') {
                console.warn(`❌ Resource GroupがERROR状態です。ステータスメッセージ: ${statusMessage || 'なし'}`);
                const confirmDelete = await promptUserContinue('⚠️ 削除しますか？ (yes/no): ');
                if (confirmDelete) {
                    await deleteResourceGroup(token);
                    console.log('🕵️ 削除の完了を確認中...');
                    await waitForResourceGroupDeletion(token);
                    console.log('👋 削除完了しました。再実行して作成してください。');
                    process.exit(0);
                } else {
                    console.log('🚫 ユーザーにより中断されました。');
                    return;
                }
            }

            const hasGrounding = labels?.some(l => l.key === 'ext.ai.sap.com/document-grounding');
            if (!hasGrounding) {
                console.log('ℹ️ Resource Groupにはdocument-groundingラベルが付与されていません。');
                const choice = await new Promise(resolve => {
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });
                    rl.question('❓ 次の操作を選択してください:\n 1) Groundingを有効化 (PATCH)\n 2) 削除して終了\n 3) 何もしないで終了\n選択してください [1/2/3]: ', answer => {
                        rl.close();
                        resolve(answer.trim());
                    });
                });

                if (choice === '1') {
                    await patchResourceGroupWithGroundingLabel(token);
                    console.log('⏳ PATCH後にステータス監視まで5秒待機...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    console.log('⏳ PATCH後のステータスを監視中...');
                    await waitForResourceGroupReady(token);
                    await createS3Secret(token);
                    console.log('🎉 PATCHを含めたセットアップが完了しました！');
                } else if (choice === '2') {
                    await deleteResourceGroup(token);
                    console.log('🕵️ 削除の完了を確認中...');
                    await waitForResourceGroupDeletion(token);
                    console.log('👋 削除完了しました。再実行して作成してください。');
                    process.exit(0);
                } else {
                    console.log('🚫 ユーザーによりスキップされました。終了します。');
                    return;
                }
            } else {
                console.log('✅ Resource Groupにはすでにdocument-groundingラベルが付与されています。');
                await waitForResourceGroupReady(token);
                await createS3Secret(token);
                console.log('🎉 セットアップが正常に完了しました！');
            }
        } else {
            await createResourceGroup(token);
            console.log('✅ Resource Groupを作成しました。');
            console.log('⏳ Resource Groupのステータスを監視中...');
            await waitForResourceGroupReady(token);
            console.log('⚠️ Groundingの有効化(PATCH)は自動では行われません。必要に応じて再実行してください。');
        }
    } catch (err) {
        console.error('🔥 セットアップに失敗しました。');
    }
})();
