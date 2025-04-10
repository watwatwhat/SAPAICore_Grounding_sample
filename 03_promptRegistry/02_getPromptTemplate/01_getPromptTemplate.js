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

    console.log('✅ Access token 取得完了');
    return response.data.access_token;
}

// すべての Prompt Templates を取得
async function getAllPromptTemplates(token) {
    const url = `${AI_API_HOST}/v2/lm/promptTemplates`;

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                'AI-Resource-Group': resourceGroupId
            }
        });

        const templates = response.data?.resources || [];

        if (templates.length === 0) {
            console.log('📭 登録されているPrompt Templateはありません。');
        } else {
            console.log(`📦 登録済みPrompt Templates（${templates.length}件）:`);
            templates.forEach((t, index) => {
                console.log(`\n[${index + 1}]`);
                console.log(`🆔 ID: ${t.id}`);
                console.log(`📛 Name: ${t.name}`);
                console.log(`📄 Scenario: ${t.scenario}`);
                console.log(`🔢 Version: ${t.version}`);
                console.log(`🕒 Created: ${t.creationTimestamp}`);
                console.log(`🧭 Managed By: ${t.managedBy}`);
                console.log(`🟢 Head Version?: ${t.isVersionHead}`);
            });
        }

        return templates;
    } catch (err) {
        console.error('❌ Prompt Templates の取得中にエラー:');

        if (err.response) {
            console.error(`📛 ステータス: ${err.response.status}`);
            console.error(`📬 内容: ${JSON.stringify(err.response.data, null, 2)}`);
        } else {
            console.error('🧠 エラー:', err.message);
        }

        throw err;
    }
}

// 実行
(async () => {
    try {
        console.log('🔐 アクセストークンを取得中...');
        const token = await getXsuaaToken();

        console.log('📥 Prompt Templates を全件取得します...');
        await getAllPromptTemplates(token);
    } catch (err) {
        console.error('❌ スクリプト実行中にエラー:', err.message);
    }
})();
