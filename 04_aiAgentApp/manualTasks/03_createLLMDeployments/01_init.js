// フル統合スクリプト: Resource Group作成 + モデルデプロイ + 状態確認
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const qs = require('qs');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../../cap/.env') });

// ----- 共通設定読み込み -----
const userCredsPath = path.join(__dirname, '../../../credentials/user_defined_variable.json');
let userCreds = JSON.parse(fs.readFileSync(userCredsPath, 'utf8'));
const resourceGroupId = userCreds.resourceGroupId;
const secretName = userCreds.secretName;

const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
const aiCore = vcapServices.aicore[0];
const creds = aiCore.credentials;
const xsuaaHostname = creds.url;
const xsuaaClient = creds.clientid;
const xsuaaSecret = creds.clientsecret;
const AI_API_HOST = creds.serviceurls.AI_API_URL;

// ----- ユーティリティ関数 -----
function isValidResourceGroupId(id) {
  const pattern = /^[a-zA-Z0-9]([a-zA-Z0-9.-]{1,251})[a-zA-Z0-9]$/;
  return id.length >= 3 && id.length <= 253 && pattern.test(id);
}

function promptInput(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(message, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}

function logAxiosError(err) {
  console.error('❌ Request error:');
  if (err.response) {
    console.error(`🚨 ${err.response.status}:`, err.response.data);
  } else {
    console.error(err.message);
  }
}

async function getXsuaaToken() {
  const url = `${xsuaaHostname}/oauth/token`;
  const authHeader = Buffer.from(`${xsuaaClient}:${xsuaaSecret}`).toString('base64');
  const data = qs.stringify({ grant_type: 'client_credentials' });

  const res = await axios.post(url, data, {
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return res.data.access_token;
}

// ----- Resource Group 関連処理 -----
async function checkExistingResourceGroup(token) {
  const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;
  try {
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

async function createResourceGroup(token) {
  const url = `${AI_API_HOST}/v2/admin/resourceGroups`;
  const payload = { resourceGroupId };
  await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  console.log('✅ Resource Group creation initiated...');
}

async function deleteResourceGroup(token) {
  const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;
  await axios.delete(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('🗑️ Resource Group deleted');
}

async function patchGroundingLabel(token) {
  const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;
  const payload = {
    labels: [{ key: 'ext.ai.sap.com/document-grounding', value: 'true' }]
  };
  await axios.patch(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  console.log('🔧 Grounding label patched. Loading status. wait for a second...');
}

async function waitForResourceGroupReady(token) {
  const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;
  for (let i = 0; i < 12; i++) {
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    const status = res.data.status;
    console.log(`⏳ Status: ${status}`);
    if (status === 'PROVISIONED') return;
    if (status === 'ERROR') throw new Error('Resource Group failed');
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Timeout waiting for Resource Group');
}

// ----- モデルデプロイ処理 -----
async function createConfiguration(token, modelName, modelVersion) {
  const url = `${AI_API_HOST}/v2/lm/configurations`;
  const payload = {
    name: `${modelName}-configuration`,
    executableId: 'azure-openai',
    scenarioId: 'foundation-models',
    parameters: { modelName, modelVersion },
    artifacts: { model: { artifactName: `${modelName}-model`, version: modelVersion } },
    environment: { variables: {} }
  };
  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'AI-Resource-Group': resourceGroupId
    }
  });
  userCreds[`${modelName}_configurationId`] = res.data.id;
  fs.writeFileSync(userCredsPath, JSON.stringify(userCreds, null, 2));
  console.log('✅ Configuration created:', res.data.id);
  return res.data.id;
}

async function createDeployment(token, configurationId, modelName) {
  const url = `${AI_API_HOST}/v2/lm/deployments`;
  const payload = {
    configurationId,
    deploymentTemplateId: `foundation-models-${modelName}-latest`,
    resourceGroupId
  };
  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'AI-Resource-Group': resourceGroupId
    }
  });
  userCreds[`${modelName}_deploymentId`] = res.data.id;
  fs.writeFileSync(userCredsPath, JSON.stringify(userCreds, null, 2));
  console.log('✅ Deployment created:', res.data.id);
  console.log('🔍 Now inspecting deployment status. Wait for it to be ready...');

  return res.data.id;
}

async function waitForDeployment(token, deploymentId) {
  const url = `${AI_API_HOST}/v2/lm/deployments/${deploymentId}`;
  for (let i = 0; i < 30; i++) {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}`, 'AI-Resource-Group': resourceGroupId }
    });
    const status = res.data.status;
    console.log(`📄 Deployment Status: ${status}`);
    if (status === 'RUNNING') return;
    if (status === 'DEAD') throw new Error('Deployment failed');
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Timeout waiting for deployment');
}

// ----- メイン処理フロー -----
(async () => {
  try {
    const mode = await promptInput('🔧 モード選択: 1) ResourceGroup作成, 2) モデルデプロイ, 3) 状態確認 [1/2/3]: ');
    const token = await getXsuaaToken();

    if (mode === '1') {
      if (!isValidResourceGroupId(resourceGroupId)) throw new Error('❌ Invalid resourceGroupId format.');

      const rg = await checkExistingResourceGroup(token);
      if (!rg) {
        await createResourceGroup(token);
        await waitForResourceGroupReady(token);
        console.log('⚠️ PATCHは自動では行いません。再実行で対応してください。');
      } else {
        console.log('ℹ️ 既存Resource Groupの状態:', rg.status);
        if (rg.status === 'ERROR') {
          const confirm = await promptInput('❌ 状態がERRORです。削除して終了しますか？ [yes/no]: ');
          if (confirm === 'yes') {
            await deleteResourceGroup(token);
            console.log('🛑 リソースグループの削除をリクエストしました。しばらくしてから再実行してください。');
            process.exit(0);
          }
        } else {
          const hasGrounding = rg.labels?.some(l => l.key === 'ext.ai.sap.com/document-grounding');
          if (!hasGrounding) {
            const patchChoice = await promptInput('✏️ Groundingを有効化しますか？ [yes/no]: ');
            if (patchChoice === 'yes') {
              await patchGroundingLabel(token);
              await new Promise(r => setTimeout(r, 5000));
              await waitForResourceGroupReady(token);
            }
          } else {
            await waitForResourceGroupReady(token);
            console.log('✅ Grounding済み。処理完了。');
          }
        }
      }
    } else if (mode === '2') {
      const models = [
        { name: 'gpt-4o', version: 'latest' },
        { name: 'text-embeddings-ada-002', version: 'latest' }
      ];
      for (const model of models) {
        const confKey = `${model.name}_configurationId`;
        const depKey = `${model.name}_deploymentId`;
        let configurationId = userCreds[confKey];
        let deploymentId = userCreds[depKey];

        if (!configurationId) configurationId = await createConfiguration(token, model.name, model.version);
        if (!deploymentId) deploymentId = await createDeployment(token, configurationId, model.name);

        await waitForDeployment(token, deploymentId);
        console.log(`🎉 ${model.name} のデプロイ完了！`);
      }
    } else if (mode === '3') {
      const rg = await checkExistingResourceGroup(token);
      if (!rg) {
        console.log('⚠️ Resource Group が存在しません。');
      } else {
        console.log(`🔎 現在のResource Groupステータス: ${rg.status}`);
        if (rg.statusMessage) console.log(`📝 メッセージ: ${rg.statusMessage}`);
        if (rg.labels) console.log(`🏷️ ラベル: ${JSON.stringify(rg.labels, null, 2)}`);
      }
    } else {
      console.log('🚫 無効な入力です。1, 2 または 3 を選んでください。');
    }
  } catch (err) {
    logAxiosError(err);
    console.error('🔥 エラー発生により処理中断。');
    process.exit(1);
  }
})();