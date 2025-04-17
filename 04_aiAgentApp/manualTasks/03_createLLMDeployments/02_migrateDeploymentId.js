const fs = require('fs');
const path = require('path');

// ファイルパスの定義
const userDefinedPath = path.join(__dirname, '../../../credentials/user_defined_variable.json');
const cdsrcPath = path.join(__dirname, '../../cap/.cdsrc.json');

console.log('📂 ファイルパスを確認中...');
console.log(`🔹 user_defined_variable.json: ${userDefinedPath}`);
console.log(`🔹 .cdsrc.json: ${cdsrcPath}`);

try {
  // JSONファイルを読み込み
  console.log('📥 JSONファイルを読み込み中...');
  const userDefined = JSON.parse(fs.readFileSync(userDefinedPath, 'utf8'));
  const cdsrc = JSON.parse(fs.readFileSync(cdsrcPath, 'utf8'));

  // デプロイメントIDの取得
  const gpt4oDeploymentId = userDefined['gpt-4o_deploymentId'];
  const embeddingDeploymentId = userDefined['text-embeddings-ada-002_deploymentId'];

  console.log(`🔧 gpt-4o_deploymentId: ${gpt4oDeploymentId}`);
  console.log(`🔧 text-embeddings-ada-002_deploymentId: ${embeddingDeploymentId}`);

  // URL置き換え処理
  cdsrc.requires.GENERATIVE_AI_HUB.CHAT_MODEL_DEPLOYMENT_URL = `v2/inference/deployments/${gpt4oDeploymentId}`;
  cdsrc.requires.GENERATIVE_AI_HUB.EMBEDDING_MODEL_DEPLOYMENT_URL = `v2/inference/deployments/${embeddingDeploymentId}`;

  console.log('✍️ 置換後のURL:');
  console.log(`   CHAT_MODEL_DEPLOYMENT_URL: ${cdsrc.requires.GENERATIVE_AI_HUB.CHAT_MODEL_DEPLOYMENT_URL}`);
  console.log(`   EMBEDDING_MODEL_DEPLOYMENT_URL: ${cdsrc.requires.GENERATIVE_AI_HUB.EMBEDDING_MODEL_DEPLOYMENT_URL}`);

  // JSONファイルを書き込み
  fs.writeFileSync(cdsrcPath, JSON.stringify(cdsrc, null, 2), 'utf8');
  console.log('✅ .cdsrc.json を正常に更新しました。');

} catch (error) {
  console.error('❌ エラーが発生しました:', error.message);
  process.exit(1);
}
