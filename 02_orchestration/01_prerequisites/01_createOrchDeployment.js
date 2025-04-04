// ========================
// 【重要】各リソースグループごとに1回の実行で十分です。
// SAP AI Core - Create Orchestration Deployment
// https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-deployment-for-orchestration
// ========================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');
const readline = require('readline');

// 認証情報の読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/ai_core_sk.json'), 'utf8'));
const userDefinedPath = path.join(__dirname, '../../credentials/user_defined_variable.json');
const userCreds = JSON.parse(fs.readFileSync(userDefinedPath, 'utf8'));

const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;
const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;
const resourceGroupId = userCreds.resourceGroupId;

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

// Configuration作成
async function createConfiguration(token) {
  const url = `${AI_API_HOST}/v2/lm/configurations`;
  const payload = {
    name: "orchestration-config",
    executableId: "orchestration",
    scenarioId: "orchestration"
  };

  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'ai-resource-group': resourceGroupId,
      'Content-Type': 'application/json'
    }
  });

  console.log("✅ Configuration 作成完了:", res.data.id);
  return res.data.id;
}

// Deployment作成
async function createDeployment(token, configurationId) {
  const url = `${AI_API_HOST}/v2/lm/deployments`;
  const payload = {
    configurationId
  };

  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'ai-resource-group': resourceGroupId,
      'Content-Type': 'application/json'
    }
  });

  const deploymentId = res.data.id;
  console.log("🚀 Deployment スケジュール完了:", deploymentId);

  // orchDeploymentId を保存
  const currentVars = JSON.parse(fs.readFileSync(userDefinedPath, 'utf8'));
  currentVars.orchDeploymentId = deploymentId;
  fs.writeFileSync(userDefinedPath, JSON.stringify(currentVars, null, 2), 'utf8');
  console.log("💾 orchDeploymentId を user_defined_variable.json に保存しました。");

  return deploymentId;
}

// Deploymentステータス確認（外部からも呼べるように）
async function checkDeploymentStatus(token, deploymentId) {
  const url = `${AI_API_HOST}/v2/lm/deployments/${deploymentId}`;
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'ai-resource-group': resourceGroupId
    }
  });

  const status = res.data.status;
  console.log(`📊 Deployment ステータス: ${status}`);

  if (status === "RUNNING") {
    const deploymentUrl = res.data.deploymentUrl;
    console.log("🌐 Deployment URL:", deploymentUrl);

    // orchDeploymentUrl を保存
    const currentVars = JSON.parse(fs.readFileSync(userDefinedPath, 'utf8'));
    currentVars.orchDeploymentUrl = deploymentUrl;
    fs.writeFileSync(userDefinedPath, JSON.stringify(currentVars, null, 2), 'utf8');
    console.log("💾 orchDeploymentUrl を user_defined_variable.json に保存しました。");

  } else {
    console.log("⏳ まだRUNNINGではありません。数分後に再度確認してください。");
  }
}

// メイン処理（コマンド切り替え可能）
(async () => {
  try {
    const command = process.argv[2];
    let inputId = process.argv[3]; // configId または deploymentId depending on command

    const token = await getXsuaaToken();

    if (command === 'check') {
      if (!inputId) {
        // user_defined_variable.json から orchDeploymentId を参照
        const currentVars = JSON.parse(fs.readFileSync(userDefinedPath, 'utf8'));
        inputId = currentVars.orchDeploymentId;
        if (!inputId) {
          console.log("❌ orchDeploymentId が user_defined_variable.json に見つかりません。");
          return;
        }
      }

      console.log(`🔍 Deploymentステータス確認中（ID: ${inputId}）...`);
      await checkDeploymentStatus(token, inputId);
      return;
    }

    if (command === 'deploy') {
      const currentVars = JSON.parse(fs.readFileSync(userDefinedPath, 'utf8'));
      const existingDeploymentId = currentVars.orchDeploymentId;

      if (existingDeploymentId && existingDeploymentId.trim() !== "") {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        rl.question(`⚠️ すでに orchDeploymentId (${existingDeploymentId}) が存在します。新たに作成を続行しますか？ (y/n): `, async (answer) => {
          rl.close();
          if (answer.toLowerCase() !== 'y') {
            console.log("🛑 デプロイ作成を中止しました。");
            return;
          }

          console.log("🛠️ Configuration 作成中...");
          const configId = await createConfiguration(token);

          console.log("🚀 Deployment 作成中...");
          const deploymentId = await createDeployment(token, configId);

          console.log("⏱️ Deployment ステータス確認中...");
          await new Promise(resolve => setTimeout(resolve, 5000));
          await checkDeploymentStatus(token, deploymentId);
        });

        return; // readline の非同期処理に任せるためここで return
      }

      // orchDeploymentId が存在しない場合（初回）
      console.log("🛠️ Configuration 作成中...");
      const configId = await createConfiguration(token);

      console.log("🚀 Deployment 作成中...");
      const deploymentId = await createDeployment(token, configId);

      console.log("⏱️ Deployment ステータス確認中...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      await checkDeploymentStatus(token, deploymentId);
      return;
    }

    // コマンド不正
    console.log("❌ 使用方法:");
    console.log("node 01_createOrchDeployment.js deploy");
    console.log("node 01_createOrchDeployment.js check");
    console.log("node 01_createOrchDeployment.js check <deploymentId>");

  } catch (err) {
    if (err.response) {
      console.error("❌ エラー:", err.response.status, err.response.statusText);
      console.error(err.response.data);
    } else {
      console.error("❌ エラー:", err.message);
    }
  }
})();
