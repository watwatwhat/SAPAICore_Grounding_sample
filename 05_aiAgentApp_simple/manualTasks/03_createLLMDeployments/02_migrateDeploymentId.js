const fs = require('fs');
const path = require('path');

// ファイルパスの定義
const userDefinedPath = path.join(__dirname, '../../../credentials/user_defined_variable.json');
const cdsrcPath = path.join(__dirname, '../../cap/.cdsrc.json');
const envPath = path.join(__dirname, '../../python/.env');

console.log('📂 ファイルパスを確認中...');
console.log(`🔹 user_defined_variable.json: ${userDefinedPath}`);
console.log(`🔹 .cdsrc.json: ${cdsrcPath}`);
console.log(`🔹 .env: ${envPath}`);

try {
  // JSONファイルを読み込み
  console.log('📥 JSONファイルを読み込み中...');
  const userDefined = JSON.parse(fs.readFileSync(userDefinedPath, 'utf8'));
  const cdsrc = JSON.parse(fs.readFileSync(cdsrcPath, 'utf8'));
  let envText = fs.readFileSync(envPath, 'utf8');

  // デプロイメントIDとバージョンの取得
  const chatModelDeploymentId = userDefined['chatModel_deploymentId'];
  const embeddingModelDeploymentId = userDefined['embeddingModel_deploymentId'];
  const chatModelDeploymentVersion = userDefined['chatModelVersion'];
  const embeddingModelDeploymentVersion = userDefined['embeddingModelVersion'];
  const chatModelName = userDefined['chatModelName'] || 'gpt-4o';
  const embeddingModelName = userDefined['embeddingModelName'] || 'text-embedding-ada-002';

  // .cdsrc.json 更新
  cdsrc.requires.GENERATIVE_AI_HUB.CHAT_MODEL_DEPLOYMENT_URL = `v2/inference/deployments/${chatModelDeploymentId}`;
  cdsrc.requires.GENERATIVE_AI_HUB.EMBEDDING_MODEL_DEPLOYMENT_URL = `v2/inference/deployments/${embeddingModelDeploymentId}`;
  cdsrc.requires.GENERATIVE_AI_HUB.CHAT_MODEL_API_VERSION = chatModelDeploymentVersion;
  cdsrc.requires.GENERATIVE_AI_HUB.EMBEDDING_MODEL_API_VERSION = embeddingModelDeploymentVersion;

  // .cdsrc.json 書き込み
  fs.writeFileSync(cdsrcPath, JSON.stringify(cdsrc, null, 2), 'utf8');
  console.log('✅ .cdsrc.json を正常に更新しました。');

  // .env の値を置き換え（正規表現で既存行を置き換え）
  envText = envText
    .replace(/^EMBEDDING_DEPLOYMENT_ID=.*/m, `EMBEDDING_DEPLOYMENT_ID=${embeddingModelDeploymentId}`)
    .replace(/^EMBEDDING_API_VERSION=.*/m, `EMBEDDING_API_VERSION=${embeddingModelDeploymentVersion}`)
    .replace(/^CHAT_MODEL_NAME=.*/m, `CHAT_MODEL_NAME=${chatModelName}`)
    .replace(/^EMBEDDING_MODEL_NAME=.*/m, `EMBEDDING_MODEL_NAME=${embeddingModelName}`);

  // .env 書き込み
  fs.writeFileSync(envPath, envText, 'utf8');
  console.log('✅ .env を正常に更新しました。');

} catch (error) {
  console.error('❌ エラーが発生しました:', error.message);
  process.exit(1);
}
