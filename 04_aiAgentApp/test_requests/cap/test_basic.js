const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// JSONファイルから認証情報を読み込む
const credentialsPath = path.join(__dirname, 'credentials', 'ai_agent_variables.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8')).cap;

const { endpoint, user, password } = credentials;

// Basic認証ヘッダーの作成
const basicAuth = Buffer.from(`${user}:${password}`).toString('base64');

// GETリクエスト関数
async function testGetQAhistory() {
    try {
        const response = await axios.get(`${endpoint}/odata/v4/GPT/Qahistory`, {
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Accept': 'application/json'
            }
        });
        console.log('✅ GET成功:', response.data);
    } catch (error) {
        console.error('❌ GET失敗:', error.response?.data || error.message);
    }
}

// POSTリクエスト関数
async function testPostQAhistory() {
    const payload = {
        question: "SAP HANAとは何ですか？",
        answer: "SAP HANAはインメモリデータベース管理システムです。",
        metadata: JSON.stringify({ source: "FAQ", created_by: "admin" })
    };

    try {
        const response = await axios.post(`${endpoint}/odata/v4/GPT/Qahistory`, payload, {
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/json; charset=utf-8'
            }
        });
        console.log('✅ POST成功:', response.data);
    } catch (error) {
        console.error('❌ POST失敗:', error.response?.data || error.message);
    }
}

// ユーザー入力を受け取る関数
function promptUser() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("どの操作を実行しますか？（get / post）: ", async (answer) => {
        if (answer.toLowerCase() === 'get') {
            await testGetQAhistory();
        } else if (answer.toLowerCase() === 'post') {
            await testPostQAhistory();
        } else {
            console.log("❗無効な選択です。'get' または 'post' を入力してください。");
        }
        rl.close();
    });
}

// 実行
promptUser();
