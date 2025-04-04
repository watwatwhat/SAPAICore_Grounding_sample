// ========================
// 
// 生成したパイプラインを管理する（このスクリプトは対話型スクリプトです）
// https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/manage-data-pipelines
// 
// ========================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// 🔐 認証情報を読み込み
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

// 共通リクエスト設定
function getRequestOptions(token) {
    return {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'AI-Resource-Group': resourceGroupId,
        },
    };
}

// Pipeline 一覧取得
async function listPipelines(token) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/pipelines`;
    const response = await axios.get(url, getRequestOptions(token));
    console.log('📄 Pipeline 一覧:');
    console.log(JSON.stringify(response.data, null, 2));
}

// Pipeline 詳細取得
async function getPipeline(token, pipelineId) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/pipelines/${pipelineId}`;
    const response = await axios.get(url, getRequestOptions(token));
    console.log(`📄 Pipeline 詳細 [${pipelineId}]:`);
    console.log(JSON.stringify(response.data, null, 2));
}

// Pipeline ステータス取得
async function getPipelineStatus(token, pipelineId) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/pipelines/${pipelineId}/status`;
    const response = await axios.get(url, getRequestOptions(token));
    console.log(`📊 Pipeline ステータス [${pipelineId}]:`);
    console.log(JSON.stringify(response.data, null, 2));
}

// Pipeline 削除
async function deletePipeline(token, pipelineId) {
    const url = `${AI_API_HOST}/v2/lm/document-grounding/pipelines/${pipelineId}`;
    await axios.delete(url, getRequestOptions(token));
    console.log(`🗑️ Pipeline 削除完了 [${pipelineId}]`);
}

// 実行処理
(async () => {
    try {
        const action = process.argv[2];           // list / get / status / delete
        const pipelineId = process.argv[3];       // オプション：get/status/delete用

        if (!action || !['list', 'get', 'status', 'delete'].includes(action)) {
            console.log('❌ 使用方法:');
            console.log('node 04_managePipeline.js list');
            console.log('node 04_managePipeline.js get <pipelineId>');
            console.log('node 04_managePipeline.js status <pipelineId>');
            console.log('node 04_managePipeline.js delete <pipelineId>');
            return;
        }

        const token = await getXsuaaToken();

        switch (action) {
            case 'list':
                await listPipelines(token);
                break;
            case 'get':
                if (!pipelineId) throw new Error('Pipeline ID が必要です');
                await getPipeline(token, pipelineId);
                break;
            case 'status':
                if (!pipelineId) throw new Error('Pipeline ID が必要です');
                await getPipelineStatus(token, pipelineId);
                break;
            case 'delete':
                if (!pipelineId) throw new Error('Pipeline ID が必要です');
                await deletePipeline(token, pipelineId);
                break;
        }

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
})();
