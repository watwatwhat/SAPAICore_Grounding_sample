// ========================
//
// ドキュメントグラウンディング用のデータリポジトリ情報を取得するスクリプト
// https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/get-a-repository
//
// ========================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// 認証情報の読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../credentials/ai_core_sk.json'), 'utf8'));
const userCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../credentials/user_defined_variable.json'), 'utf8'));

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

// リポジトリ取得
async function getRepositories(token, repositoryId = null) {
    const url = repositoryId
        ? `${AI_API_HOST}/v2/lm/document-grounding/retrieval/dataRepositories/${repositoryId}`
        : `${AI_API_HOST}/v2/lm/document-grounding/retrieval/dataRepositories`;

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                'AI-Resource-Group': resourceGroupId,
                'Content-Type': 'application/json',
            },
        });

        console.log('📦 リポジトリ情報:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (err) {
        if (err.response) {
            console.error('❌ エラー:', {
                status: err.response.status,
                statusText: err.response.statusText,
                data: err.response.data,
            });
        } else {
            console.error('❌ エラー:', err.message);
        }
    }
}

// 実行処理
(async () => {
    const repositoryId = process.argv[2]; // 任意：repositoryIdを指定する場合

    try {
        console.log('🔐 トークン取得中...');
        const token = await getXsuaaToken();

        console.log(repositoryId ? `🔍 特定リポジトリを取得中: ${repositoryId}` : '📥 全リポジトリを取得中...');
        await getRepositories(token, repositoryId);
        console.log('✅ 完了！');
    } catch (err) {
        console.error('❌ 実行時エラー:', err.message);
    }
})();
