// ========================
//
// SAP AI Core - Vector Collection 管理ツール
// list / get / create / delete / creationStatus / deletionStatus に対応
//
// ========================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// 認証情報読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../credentials/ai_core_sk.json'), 'utf8'));
const userCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../credentials/user_defined_variable.json'), 'utf8'));

const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;
const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;
const resourceGroupId = userCreds.resourceGroupId;

// トークン取得
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

    return response.data.access_token;
}

// 共通ヘッダ
function getRequestOptions(token) {
    return {
        headers: {
            Authorization: `Bearer ${token}`,
            'AI-Resource-Group': resourceGroupId,
            'Content-Type': 'application/json',
        },
    };
}

// 一覧取得
async function listCollections(token) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/collections`;
    const res = await axios.get(url, getRequestOptions(token));
    console.log('📚 コレクション一覧:\n', JSON.stringify(res.data, null, 2));
}

// 詳細取得
async function getCollection(token, id) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/collections/${id}`;
    const res = await axios.get(url, getRequestOptions(token));
    console.log(`📘 コレクション詳細 [${id}]:\n`, JSON.stringify(res.data, null, 2));
}

// 作成
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

// 削除
async function deleteCollection(token, id) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/collections/${id}`;
    await axios.delete(url, getRequestOptions(token));
    console.log(`🗑️ コレクション削除要求完了 [${id}]`);
}

// 作成ステータス
async function getCreationStatus(token, id) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/collections/${id}/creationStatus`;
    const res = await axios.get(url, getRequestOptions(token));
    console.log(`📈 作成ステータス [${id}]:\n`, JSON.stringify(res.data, null, 2));
}

// 削除ステータス
async function getDeletionStatus(token, id) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/collections/${id}/deletionStatus`;
    const res = await axios.get(url, getRequestOptions(token));
    console.log(`📉 削除ステータス [${id}]:\n`, JSON.stringify(res.data, null, 2));
}

// 実行部
(async () => {
    const action = process.argv[2];
    const arg1 = process.argv[3];
    const arg2 = process.argv[4];

    if (!action || !['list', 'get', 'create', 'delete', 'creationStatus', 'deletionStatus'].includes(action)) {
        console.log('❌ 使用方法:');
        console.log('  node 07_manageCollection.js list');
        console.log('  node 07_manageCollection.js get <collectionId>');
        console.log('  node 07_manageCollection.js create <title> <embeddingModel>');
        console.log('  node 07_manageCollection.js delete <collectionId>');
        console.log('  node 07_manageCollection.js creationStatus <collectionId>');
        console.log('  node 07_manageCollection.js deletionStatus <collectionId>');
        return;
    }

    try {
        const token = await getXsuaaToken();

        switch (action) {
            case 'list':
                await listCollections(token);
                break;
            case 'get':
                await getCollection(token, arg1);
                break;
            case 'create':
                await createCollection(token, arg1, arg2 || 'text-embedding-model');
                break;
            case 'delete':
                await deleteCollection(token, arg1);
                break;
            case 'creationStatus':
                await getCreationStatus(token, arg1);
                break;
            case 'deletionStatus':
                await getDeletionStatus(token, arg1);
                break;
        }

        console.log('✅ 完了！');
    } catch (err) {
        if (err.response) {
            console.error('❌ エラー:', {
                status: err.response.status,
                statusText: err.response.statusText,
                data: err.response.data,
            });
        } else {
            console.error('❌ 実行エラー:', err.message);
        }
    }
})();
