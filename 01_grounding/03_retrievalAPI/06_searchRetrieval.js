// ========================
//
// Retrieval Search Call
// https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/retrieval-search-call
//
// ========================

// すべてのリポジトリで検索（おすすめ）：
// node 06_searchRetrieval.js "What is SAP BTP?"
// 特定のリポジトリIDで検索：
// node 06_searchRetrieval.js "What is SAP BTP?" 137f3100-9171-48fb-b8d4-f93804bf7bac

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// 認証情報の読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/ai_core_sk.json'), 'utf8'));
const userCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/user_defined_variable.json'), 'utf8'));

const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;
const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;
const resourceGroupId = userCreds.resourceGroupId;

// アクセストークン取得
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

// Retrieval Search 呼び出し
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
                // 以下、必要に応じて追加可能：
                // dataRepositoryMetadata: [{ key: "type", value: ["custom"] }],
                // documentMetadata: [{ key: "url", value: ["http://example.com"] }],
                // chunkMetadata: [{ key: "index", value: ["1"] }]
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

// 実行処理
(async () => {
    const userQuery = process.argv[2];          // 例: "What is SAP BTP?"
    const repositoryId = process.argv[3] || '*'; // 任意：特定のrepositoryId or "*"（デフォルト）

    if (!userQuery) {
        console.log('❌ 使用方法: node 07_searchRetrieval.js "<query>" [repositoryId]');
        return;
    }

    try {
        console.log('🔐 トークン取得中...');
        const token = await getXsuaaToken();

        console.log(`🔍 検索実行中: "${userQuery}" 対象: ${repositoryId}`);
        await searchRetrieval(token, userQuery, repositoryId);

        console.log('✅ 検索完了！');
    } catch (err) {
        console.error('❌ 実行エラー:', err.message);
    }
})();
