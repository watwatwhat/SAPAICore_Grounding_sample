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

// 🔐 認証情報をJSONファイルから読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/ai_core_sk.json'), 'utf8'));
const s3Creds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/object_store_sk.json'), 'utf8'));
const userCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/user_defined_variable.json'), 'utf8'));

// XSUAA 認証情報
const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;

// AI Core ホスト
const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;
const resourceGroupId = userCreds.resourceGroupId;
const secretName = userCreds.secretName;

// S3 認証情報
const s3Info = {
    bucketName: s3Creds.bucket,
    region: s3Creds.region,
    host: s3Creds.host,
    accessKeyId: s3Creds.access_key_id,
    secretAccessKey: s3Creds.secret_access_key,
    username: s3Creds.username,
};

// XSUAAトークン取得
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
            'Authorization': `Basic ${authHeader}`,
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
            throw err;
        }
    }
}

// S3 Secret 作成
async function createS3Secret(token) {
    const url = `${AI_API_HOST}/v2/admin/secrets`;
    const payload = {
        name: secretName,
        data: {
            url: Buffer.from(`https://${s3Info.bucketName}.s3.${s3Info.region}.amazonaws.com`).toString('base64'),
            authentication: "Tm9BdXRoZW50aWNhdGlvbg==",
            description: Buffer.from('Generic secret for accessing S3 bucket for grounding').toString('base64'),
            access_key_id: Buffer.from(s3Info.accessKeyId).toString('base64'),
            secret_access_key: Buffer.from(s3Info.secretAccessKey).toString('base64'),
            bucket: Buffer.from(s3Info.bucketName).toString('base64'),
            host: Buffer.from(s3Info.host).toString('base64'),
            region: Buffer.from(s3Info.region).toString('base64'),
            username: Buffer.from(s3Info.username).toString('base64'),
        },
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

    try {
        await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'AI-Resource-Group': resourceGroupId,
            },
        });
        console.log('✅ S3 Secret created');
    } catch (err) {
        if (err.response && err.response.status === 409) {
            console.log('ℹ️ S3 Secret already exists');
        } else {
            throw err;
        }
    }
}

// 実行メイン処理
(async () => {
    try {

        // 0. GET_XSUAA_TOKEN
        // SAP AI Coreのインスタンスにアクセスするための認証トークンを取得する
        console.log('🔐 Getting access token...');
        const token = await getXsuaaToken();

        // 1. Create A Resource Group For Grounding
        // SAP AI Coreのインスタンスに演習用のリソースグループを追加する
        // https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-resource-group-for-ai-data-management
        console.log('📦 Creating resource group...');
        await createResourceGroup(token);

        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        // リソースグループ作成後に少し待つ（例：10秒）
        console.log('⏳ Waiting for resource group propagation for 10s...');
        await delay(10000);

        // 2. Grounding Generic Secrets for AWS S3
        // SAP AI CoreのインスタンスにAmazon S3 へのアクセスに用いる認証情報を登録する
        // https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/grounding-generic-secrets-for-aws-s3
        console.log('🔐 Creating S3 secret...');
        await createS3Secret(token);

        console.log('🎉 All setup completed successfully!');
    } catch (err) {
        console.error('❌ Error:', err.response ? err.response.data : err.message);
    }
})();
