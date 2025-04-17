const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../python/.env') });

const { executeHttpRequest } = require('@sap-cloud-sdk/core');
const { getDestination } = require('@sap-cloud-sdk/connectivity');
const readline = require('readline');

const DESTINATION_NAME = 'aiagentsample-deepdiveXXX-ai-agent-srv'; // Destination サービスで設定した名前

// /chat エンドポイントへの POST リクエスト
async function callChatEndpoint() {
    try {
        const destination = await getDestination({ destinationName: DESTINATION_NAME });
        const response = await executeHttpRequest(destination, {
            method: 'POST',
            url: '/chat',
            headers: { 'Content-Type': 'application/json' },
            data: {
                question: "SAP HANAとは何ですか？"
            }
        });
        console.log('✅ /chat エンドポイントへのリクエスト成功:', response.data);
    } catch (err) {
        console.error('❌ /chat エンドポイントへのリクエスト失敗:', err.message);
    }
}

// /chain エンドポイントへの POST リクエスト
async function callChainEndpoint() {
    try {
        const destination = await getDestination({ destinationName: DESTINATION_NAME });
        const response = await executeHttpRequest(destination, {
            method: 'POST',
            url: '/chain',
            headers: { 'Content-Type': 'application/json' },
            data: {
                question: "SAP BTP Hackathonについて質問です。SAP AI Launchpadに「Generative AI Hub」のメニューが表示されていないのですが、考えられる原因はなんですか？",
                mode: "SAP",
                history: []
            }
        });
        console.log('✅ /chain エンドポイントへのリクエスト成功:', response.data);
    } catch (err) {
        console.error('❌ /chain エンドポイントへのリクエスト失敗:', err.message);
    }
}

// CLI で操作選択
function promptUser() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("どのエンドポイントを呼び出しますか？（chat / chain）: ", async (answer) => {
        if (answer.toLowerCase() === 'chat') {
            await callChatEndpoint();
        } else if (answer.toLowerCase() === 'chain') {
            await callChainEndpoint();
        } else {
            console.log("❗無効な選択です。'chat' または 'chain' を入力してください。");
        }
        rl.close();
    });
}

// 実行
promptUser();
