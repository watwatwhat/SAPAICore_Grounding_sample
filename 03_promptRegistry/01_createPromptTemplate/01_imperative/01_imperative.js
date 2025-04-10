const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// 認証情報の読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../credentials/ai_core_sk.json'), 'utf8'));
const userCredsPath = path.join(__dirname, '../../../credentials/user_defined_variable.json');
const userCreds = JSON.parse(fs.readFileSync(userCredsPath, 'utf8'));

// 認証情報の設定
const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;
const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;
const resourceGroupId = userCreds.resourceGroupId;

// spec.jsonの読み込み
const specPath = path.join(__dirname, './spec.json');
let spec;
try {
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    console.log('✅ spec.json を読み込みました');
} catch (err) {
    console.error('❌ spec.json の読み込みに失敗しました:', err.message);
    process.exit(1);
}

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

// Prompt Template 作成
async function createPromptTemplate(token, templateName) {
    const url = `${AI_API_HOST}/v2/lm/promptTemplates`;

    const payload = {
        name: templateName,
        version: userCreds.promptVersion,
        scenario: userCreds.promptScenarioName,
        spec: spec
    };

    console.log(`📦 Prompt Template ペイロード:`, JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'AI-Resource-Group': resourceGroupId
            }
        });

        const promptId = response.data.id;
        console.log(`✅ Prompt Template 作成成功！ID: ${promptId}`);

        // 📝 IDを userCreds に書き込んで保存
        userCreds.promptTemplateId = promptId;
        fs.writeFileSync(userCredsPath, JSON.stringify(userCreds, null, 2));
        console.log(`💾 promptTemplateId を ${userCredsPath} に保存しました`);

        return promptId;
    } catch (err) {
        console.error('❌ Prompt Template 作成エラーが発生しました。詳細:');

        if (err.response) {
            console.error(`📛 ステータスコード: ${err.response.status}`);
            console.error(`📬 レスポンスボディ: ${JSON.stringify(err.response.data, null, 2)}`);
        } else if (err.request) {
            console.error('📡 リクエストは送信されましたが、レスポンスがありませんでした。');
            console.error(err.request);
        } else {
            console.error('🧠 エラー詳細メッセージ:', err.message);
        }

        console.error('🪵 スタックトレース:');
        console.error(err.stack);

        throw err;
    }
}


// 実行処理
(async () => {
    try {
        console.log('🔐 アクセストークン取得中...');
        const token = await getXsuaaToken();

        const templateName = userCreds.promptTemplateName; // 名前は必要に応じて変更

        console.log(`📄 Prompt Template '${templateName}' を作成中...`);
        await createPromptTemplate(token, templateName);

        console.log('🎉 Prompt Template 作成が完了しました！');
    } catch (err) {
        console.error('❌ スクリプト実行エラー:', err.message);
    }
})();
