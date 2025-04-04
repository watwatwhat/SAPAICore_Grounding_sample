// ========================
// SAP AI Core - Call Orchestration Completion Endpoint
// Orchestrationの設定ファイルを利用して、オーケストレーションベースのGroundingレスポンスを取得する
// https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/content-filtering-on-output
// ========================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// 認証情報とユーザ設定の読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/ai_core_sk.json'), 'utf8'));
const userCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/user_defined_variable.json'), 'utf8'));
const orchestrationConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'ModelOrchConfig.json'), 'utf8'));

const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;
const resourceGroupId = userCreds.resourceGroupId;
const deploymentUrl = userCreds.orchDeploymentUrl;

if (!deploymentUrl) {
  console.error("❌ user_defined_variable.json に orchDeploymentUrl が設定されていません。追加してください。例: 'orchDeploymentUrl': 'https://your-endpoint.ai.sap.com/...' ");
  process.exit(1);
}

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

// Orchestrationエンドポイント呼び出し
async function callOrchestrationCompletion(token, userInputParams) {
  const url = `${deploymentUrl}/completion`;
  const payload = {
    orchestration_config: orchestrationConfig,
    input_params: userInputParams,
  };

  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'ai-resource-group': resourceGroupId,
      'Content-Type': 'application/json'
    },
  });

  console.log("✅ 応答:");
  console.dir(res.data, { depth: null });
}

// 実行処理
(async () => {
  try {
    const input = process.argv[2];

    if (!input) {
      console.error("❌ 質問が指定されていません。");
      console.log("✅ 使用方法:");
      console.log('node ./02_orchestration/02_orchestration/01_callOrchCompletion.js <question>');
      console.log('例: node ./02_orchestration/02_orchestration/01_callOrchEndpoint.js "桃から生まれたのは誰？"');
      process.exit(1);
    }

    console.log("🔐 トークン取得中...");
    const token = await getXsuaaToken();

    const inputParams = {
      question: input
    };

    console.log("📡 Orchestration 呼び出し中...");
    await callOrchestrationCompletion(token, inputParams);

  } catch (err) {
    if (err.response) {
      console.error("❌ エラー:", err.response.status, err.response.statusText);
      console.error(err.response.data);
    } else {
      console.error("❌ エラー:", err.message);
    }
  }
})();