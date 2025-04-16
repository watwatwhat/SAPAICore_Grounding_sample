const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../cap/.env') });

const axios = require('axios');
const qs = require('qs');
const fs = require('fs');

// ユーザー定義変数の読み込み
const userCredsPath = path.join(__dirname, '../../../credentials/user_defined_variable.json');
const userCreds = JSON.parse(fs.readFileSync(userCredsPath, 'utf8'));
console.log(`ユーザー定義変数:`);
console.log(userCreds);
const resourceGroupId = userCreds.resourceGroupId;

// VCAP_SERVICESからAI Coreの情報を取得
const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
const aiCore = vcapServices.aicore[0];
const creds = aiCore.credentials;

const xsuaaHostname = creds.url;
const xsuaaClient = creds.clientid;
const xsuaaSecret = creds.clientsecret;
const AI_API_HOST = creds.serviceurls.AI_API_URL;

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

    console.log('✅ Fetched access_token!');
    return response.data.access_token;
}

// リソースグループ作成
async function createResourceGroup(token) {
    const url = `${AI_API_HOST}/v2/admin/resourceGroups`;

    const payload = {
        resourceGroupId,
        labels: [
            {
                key: 'ext.ai.sap.com/document-grounding',
                value: 'true',
            },
        ],
    };

    try {
        await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        console.log('✅ Resource Group created!');
    } catch (err) {
        if (err.response && err.response.status === 409) {
            console.log('ℹ️ Resource Group already exists');
        } else {
            console.error('❌ Failed to create resource group:', err.response?.data || err.message);
            throw err;
        }
    }
}

// 作成後の検証：リソースグループの存在確認
async function verifyResourceGroup(token) {
    const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200 && response.data.resourceGroupId === resourceGroupId) {
            console.log(`✅ Resource Group "${resourceGroupId}" is verified and active.`);
        } else {
            console.warn(`⚠️ Resource Group "${resourceGroupId}" response was unexpected:`, response.data);
        }
    } catch (err) {
        console.error(`❌ Resource Group "${resourceGroupId}" could not be verified:`, err.response?.data || err.message);
        throw err;
    }
}

// 実行
(async () => {
    try {
        console.log('🔐 Getting access token...');
        const token = await getXsuaaToken();

        console.log('📦 Creating resource group...');
        await createResourceGroup(token);

        console.log('🔍 Verifying resource group...');
        await verifyResourceGroup(token);

        console.log('🎉 All steps completed successfully!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
})();
