const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// ファイル読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../credentials/ai_core_sk.json'), 'utf8'));
const gitRepoConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../credentials/git_repo_config.json'), 'utf8'));
const userCredsPath = path.join(__dirname, '../../../credentials/user_defined_variable.json');
const userCreds = JSON.parse(fs.readFileSync(userCredsPath, 'utf8'));

// 認証系
const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;
const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;

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

// アプリケーション作成
async function createApplication(token) {
    const url = `${AI_API_HOST}/v2/admin/applications`;
    
    const payload = {
        applicationName: userCreds.applicationName,
        repositoryUrl: gitRepoConfig.url,
        revision: "HEAD",
        path: userCreds.applicationPath
    };

    console.log('📦 アプリケーション作成ペイロード:', JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ アプリケーション作成に成功しました！');
        console.log(`🆔 Application Name: ${payload.applicationName}`);

        return payload.applicationName;
    } catch (err) {
        console.error('❌ アプリケーション作成エラー:');

        if (err.response) {
            console.error(`📛 ステータス: ${err.response.status}`);
            console.error(`📬 レスポンス: ${JSON.stringify(err.response.data, null, 2)}`);
        } else {
            console.error('🧠 メッセージ:', err.message);
        }

        throw err;
    }
}

// 実行処理
(async () => {
    try {
        console.log('🔐 アクセストークン取得中...');
        const token = await getXsuaaToken();

        console.log('📄 アプリケーションを作成中...');
        const appName = await createApplication(token);

        console.log(`🎉 アプリケーション '${appName}' の作成が完了しました！`);
    } catch (err) {
        console.error('❌ スクリプト実行中のエラー:', err.message);
    }
})();
