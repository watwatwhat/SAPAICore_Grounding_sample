const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// === 設定読み込み ===
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../credentials/ai_core_sk.json'), 'utf8'));
const gitRepoConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../credentials/git_repo_config.json'), 'utf8'));

const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;
const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;

// === アクセストークン取得 ===
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

// === Gitリポジトリ登録 ===
async function registerGitRepository(token) {
    const url = `${AI_API_HOST}/v2/admin/repositories`;

    const payload = {
        url: gitRepoConfig.url,
        username: gitRepoConfig.username,
        password: gitRepoConfig.password
    };

    console.log('📦 Gitリポジトリ登録ペイロード:', JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Gitリポジトリの登録が成功しました');
        return true;
    } catch (err) {
        if (err.response && err.response.status === 409) {
            console.warn('⚠️ 既に同じリポジトリが登録されています（409 Conflict）');
            return true; // 登録済みとしてOK扱い
        }

        console.error('❌ Gitリポジトリの登録エラー:');
        if (err.response) {
            console.error(`📛 ステータスコード: ${err.response.status}`);
            console.error(`📬 レスポンス: ${JSON.stringify(err.response.data, null, 2)}`);
        } else if (err.request) {
            console.error('📡 リクエスト送信済みだがレスポンスなし');
        } else {
            console.error('🧠 エラーメッセージ:', err.message);
        }
        throw err;
    }
}

// === 登録済みリポジトリの確認 ===
async function verifyRepositoryRegistered(token) {
    const url = `${AI_API_HOST}/v2/admin/repositories`;

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const repositories = response.data?.resources || [];
        const found = repositories.find(repo => repo.url === gitRepoConfig.url);

        if (found) {
            console.log(`✅ 登録済みのリポジトリを確認できました：${found.url}`);
            console.log(`📄 Repository ID: ${found.id}`);
        } else {
            console.error(`❌ 登録されたはずのリポジトリが見つかりませんでした: ${gitRepoConfig.url}`);
        }
    } catch (err) {
        console.error('❌ 登録リポジトリの確認中にエラーが発生しました:');
        console.error(err.response?.data || err.message);
    }
}

// === 実行 ===
(async () => {
    try {
        console.log('🔐 アクセストークン取得中...');
        const token = await getXsuaaToken();

        console.log('📤 Gitリポジトリを登録中...');
        const success = await registerGitRepository(token);

        if (success) {
            console.log('🔍 リポジトリ登録確認を実行します...');
            await verifyRepositoryRegistered(token);
        }

        console.log('🎉 完了：Gitリポジトリの登録および確認が終了しました');
    } catch (err) {
        console.error('❌ スクリプト実行中に致命的なエラーが発生しました:', err.message);
    }
})();
