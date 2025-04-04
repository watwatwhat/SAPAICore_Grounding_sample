// ========================
// SAP AI Core - Vector Collection Document 管理ツール
// create / update / get / list / delete / search に対応（ファイル読み込み対応）
// ========================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// 認証情報読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/ai_core_sk.json'), 'utf8'));
const userCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/user_defined_variable.json'), 'utf8'));

const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;
const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;
const resourceGroupId = userCreds.resourceGroupId;
const CHUNK_SIZE = 100; // 任意のチャンクサイズ

async function getXsuaaToken() {
    const url = `${xsuaaHostname}/oauth/token`;
    const authHeader = Buffer.from(`${xsuaaClient}:${xsuaaSecret}`).toString('base64');
    const data = qs.stringify({ grant_type: 'client_credentials', client_id: xsuaaClient, client_secret: xsuaaSecret });
    const response = await axios.post(url, data, {
        headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    return response.data.access_token;
}

function getRequestOptions(token) {
    return {
        headers: {
            Authorization: `Bearer ${token}`,
            'AI-Resource-Group': resourceGroupId,
            'Content-Type': 'application/json',
        },
    };
}

async function listDocuments(token, collectionId) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/collections/${collectionId}/documents`;
    const res = await axios.get(url, getRequestOptions(token));
    console.log(JSON.stringify(res.data, null, 2));
}

async function getDocument(token, collectionId, documentId) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/collections/${collectionId}/documents/${documentId}`;
    const res = await axios.get(url, getRequestOptions(token));
    console.log(JSON.stringify(res.data, null, 2));
}

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

async function updateDocument(token, collectionId, documentId, filePath) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/collections/${collectionId}/documents`;
    const rawText = fs.readFileSync(filePath, 'utf8');
    const chunks = [];
    for (let i = 0; i < rawText.length; i += CHUNK_SIZE) {
        const chunkText = rawText.substring(i, i + CHUNK_SIZE);
        chunks.push({
            content: chunkText,
            metadata: [{ key: "index", value: [(i / CHUNK_SIZE + 1).toString()] }]
        });
    }
    const payload = {
        documents: [
            {
                id: documentId,
                metadata: [{ key: "source", value: [path.basename(filePath)] }],
                chunks: chunks
            }
        ]
    };
    const res = await axios.patch(url, payload, getRequestOptions(token));
    console.log('✅ ドキュメント更新成功:\n', JSON.stringify(res.data, null, 2));
}

async function deleteDocument(token, collectionId, documentId) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/vector/collections/${collectionId}/documents/${documentId}`;
    await axios.delete(url, getRequestOptions(token));
    console.log(`🗑️ ドキュメント削除完了 [${documentId}]`);
}

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

(async () => {
    const action = process.argv[2];
    const arg1 = process.argv[3];
    const arg2 = process.argv[4];
    const filePath = process.argv[4];

    const token = await getXsuaaToken();

    switch (action) {
        case 'list':
            await listDocuments(token, arg1);
            break;
        case 'get':
            await getDocument(token, arg1, arg2);
            break;
        case 'create':
            if (!filePath || !fs.existsSync(filePath)) {
                console.error('❌ ファイルが存在しません:', filePath);
                return;
            }
            await createDocument(token, arg1, filePath);
            break;
        case 'update':
            if (!filePath || !fs.existsSync(filePath)) {
                console.error('❌ ファイルが存在しません:', filePath);
                return;
            }
            await updateDocument(token, arg1, arg2, filePath);
            break;
        case 'delete':
            await deleteDocument(token, arg1, arg2);
            break;
        case 'search':
            await vectorSearch(token, arg1, arg2);
            break;
        default:
            console.log('❌ 使用方法:');
            console.log('node 08_manageDocuments.js list <collectionId>');
            console.log('node 08_manageDocuments.js get <collectionId> <documentId>');
            console.log('node 08_manageDocuments.js create <collectionId> <filePath>');
            console.log('node 08_manageDocuments.js update <collectionId> <documentId> <filePath>');
            console.log('node 08_manageDocuments.js delete <collectionId> <documentId>');
            console.log('node 08_manageDocuments.js search "<query>" <collectionId>');
    }
})();