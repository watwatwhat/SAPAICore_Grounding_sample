const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');

// 🔧 設定ファイル読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/ai_core_sk.json'), 'utf8'));
const userCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/user_defined_variable.json'), 'utf8'));

const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;
const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;

// ✅ アクセストークン取得
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

// 🧠 Prompt Template 使用（substitution）
async function usePromptTemplate(token) {
    const {
        promptTemplateId,
        promptTemplateName,
        promptScenarioName,
        promptVersion
    } = userCreds;

    // 入力パラメータ（登録されたpromptTemplateに対して余計なinputがある分には問題ないが、足りないとエラー400が返ってくる）
    const inputParams = {
        inputExample: userCreds.promptInput_inputExample,
        user_input: userCreds.promptInput_user_input
    };

    let url;
    if (promptTemplateId) {
        url = `${AI_API_HOST}/v2/lm/promptTemplates/${promptTemplateId}/substitution`;
        console.log(`📥 Prompt Template (ID: ${promptTemplateId}) を使用して substitution します`);
    } else {
        url = `${AI_API_HOST}/v2/lm/scenarios/${promptScenarioName}/promptTemplates/${promptTemplateName}/versions/${promptVersion}/substitution`;
        console.log(`📥 Prompt Template (Name: ${promptTemplateName}) を使用して substitution します`);
    }

    try {
        const response = await axios.post(url, {
            inputParams
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Substitution 成功！完成した Prompt:');
        console.log(JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (err) {
        console.error('❌ Substitution 実行中にエラーが発生しました');

        if (err.response) {
            console.error(`📛 ステータス: ${err.response.status}`);
            console.error(`📬 内容: ${JSON.stringify(err.response.data, null, 2)}`);
        } else {
            console.error('🧠 エラー内容:', err.message);
        }

        throw err;
    }
}

// 🚀 実行
(async () => {
    try {
        console.log('🔐 アクセストークン取得中...');
        const token = await getXsuaaToken();

        await usePromptTemplate(token);
    } catch (err) {
        console.error('❌ スクリプト全体の実行でエラー:', err.message);
    }
})();
