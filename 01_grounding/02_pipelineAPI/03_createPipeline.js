// ========================
// 
// ドキュメントに対してベクトルか処理を施すためのパイプラインを生成する
// https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/pipeline-api
// 
// ========================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// 🔐 認証情報を読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/ai_core_sk.json'), 'utf8'));
const s3Creds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/object_store_sk.json'), 'utf8'));
const userCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/user_defined_variable.json'), 'utf8'));

// 認証情報
const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;
const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;

const resourceGroupId = userCreds.resourceGroupId;
const secretName = userCreds.secretName;

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

// Pipeline 作成
async function createS3Pipeline(token) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/pipelines`;

    const payload = {
        type: "S3",
        configuration: {
            destination: secretName
        }
        // metadataも使う場合はこちらを追加
        // metadata: {
        //     destination: secretName
        // }
    };

    console.log('📦 payload 内容:', JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'AI-Resource-Group': resourceGroupId,
            },
        });

        console.log('✅ Pipeline 作成成功！');
        console.log('📄 Pipeline ID:', response.data.id);
        return response.data;
    } catch (err) {
        if (err.response) {
            console.error('❌ Pipeline 作成エラー:', {
                status: err.response.status,
                statusText: err.response.statusText,
                data: err.response.data,
            });
        } else if (err.request) {
            console.error('❌ Pipeline 作成エラー: No response received', err.request);
        } else {
            console.error('❌ Pipeline 作成エラー:', err.message);
        }
    }
}

// 実行処理
(async () => {
    try {
        console.log('🔐 アクセストークン取得中...');
        const token = await getXsuaaToken();

        console.log('📄 Pipeline 作成中...');
        await createS3Pipeline(token);

        console.log('🎉 インデックス用Pipeline作成 完了！');
    } catch (err) {
        console.error('❌ 実行エラー:', err.response?.data || err.message);
    }
})();
