const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../../cap/.env') });

const { executeHttpRequest } = require('@sap-cloud-sdk/core');
const { getDestination } = require("@sap-cloud-sdk/connectivity");
const readline = require('readline');

// Destination名を指定（BTP Cockpitで設定している名前）
const DESTINATION_NAME = 'aiagentsample-simple-deepdiveXXX-cap-srv';

// GETリクエスト
async function callGetFromDestination() {
    try {
        const capDestination = await getDestination({ destinationName: DESTINATION_NAME });
        const response = await executeHttpRequest(capDestination,
            {
                method: 'GET',
                url: '/odata/v4/GPT/QahistoryView'
            }
        );
        console.log('✅ GET成功:', response.data);
    } catch (err) {
        console.error('❌ GET失敗:', err.message);
    }
}

// POSTリクエスト
async function callPostToDestination() {
    try {
        const capDestination = await getDestination({ destinationName: DESTINATION_NAME });
        const response = await executeHttpRequest(capDestination,
            {
                method: 'POST',
                url: '/odata/v4/GPT/QahistoryView',
                headers: { 'Content-Type': 'application/json' },
                data: {
                    question: "SAP HANAとは何ですか？",
                    answer: "SAP HANAはインメモリデータベース管理システムです。",
                    metadata: JSON.stringify({ source: "FAQ", created_by: "admin" })
                }
            }
        );
        console.log('✅ POST成功:', response.data);
    } catch (err) {
        console.error('❌ POST失敗:', err.message);
    }
}

// CLIで操作選択
function promptUser() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("どの操作を実行しますか？（get / post）: ", async (answer) => {
        if (answer.toLowerCase() === 'get') {
            await callGetFromDestination();
        } else if (answer.toLowerCase() === 'post') {
            await callPostToDestination();
        } else {
            console.log("❗無効な選択です。'get' または 'post' を入力してください。");
        }
        rl.close();
    });
}

// 実行
promptUser();
