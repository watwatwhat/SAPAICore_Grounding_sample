// ========================
//
// 指定した Secret の情報を取得するスクリプト
// https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/pipeline-api
//
// ========================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// 🔐 認証情報を読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/ai_core_sk.json'), 'utf8'));
const userCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/user_defined_variable.json'), 'utf8'));

// 認証情報
const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;
const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;

const resourceGroupId = userCreds.resourceGroupId;
const secretName = userCreds.secretName; // 取得対象のSecret名

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

    console.log('✅ Access token 取得完了');
    return response.data.access_token;
}

// Secret取得
async function getSecret(token) {
    const url = `${AI_API_HOST}/v2/admin/secrets/${secretName}`;

    console.log(`📡 Secret 取得URL: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'AI-Resource-Group': resourceGroupId,
                // 'AI-Tenant-Scope': 'true'
            }
        });

        console.log('✅ Secret 取得成功！');
        console.log('📄 Secret 情報:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (err) {
        if (err.response) {
            console.error('❌ Secret 取得エラー:', {
                status: err.response.status,
                statusText: err.response.statusText,
                data: err.response.data,
            });
            throw err;
        } else if (err.request) {
            console.error('❌ Secret 取得エラー: No response received', err.request);
            throw err;
        } else {
            console.error('❌ Secret 取得エラー:', err.message);
            throw err;
        }
    }
}

// 実行処理
(async () => {
    try {
        console.log('🔐 アクセストークン取得中...');
        const token = await getXsuaaToken();

        console.log('🔍 Secret 取得中...');
        await getSecret(token);

        console.log('🎉 Secret取得処理 完了！');
    } catch (err) {
        console.error('❌ 実行エラー:', err.response?.data || err.message);
    }
})();
