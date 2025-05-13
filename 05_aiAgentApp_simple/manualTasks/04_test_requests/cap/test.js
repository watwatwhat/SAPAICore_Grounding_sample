const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../cap/.env') });

const { executeHttpRequest } = require('@sap-cloud-sdk/core');
const { getDestination } = require("@sap-cloud-sdk/connectivity");
const readline = require('readline');

const DESTINATION_NAME = 'aiagentsample-simple-deepdiveXXX-cap-srv';

async function callGetFromDestination() {
    try {
        const capDestination = await getDestination({ destinationName: DESTINATION_NAME });
        const response = await executeHttpRequest(capDestination, {
            method: 'GET',
            url: '/odata/v4/GPT/QahistoryView'
        });
        console.log('✅ GET成功:', response.data);
    } catch (err) {
        console.error('❌ GET失敗:', err.message);
    }
}

async function callPostToDestination() {
    const dataList = [
        {
            question: "SAP HANAとは何ですか？",
            answer: "SAP HANAはインメモリデータベース管理システムです。",
            metadata: JSON.stringify({ source: "FAQ", created_by: "admin" })
        },
        {
            question: "SAP AI LaunchpadでGenerative AI Hubが表示されないのはなぜ？",
            answer: "表示されていない原因としては、権限がない、もしくは接続しているSAP AI CoreのインスタンスのプランがExtendedでない可能性があります。",
            metadata: JSON.stringify({ source: "Documentation", created_by: "admin" })
        },
        {
            question: "SAP CAPとは？",
            answer: "SAP Cloud Application Programming Model（CAP）は、効率的なクラウドアプリ開発を支援するフレームワークです。",
            metadata: JSON.stringify({ source: "Guide", created_by: "admin" })
        },
        {
            question: "ODataとは？",
            answer: "ODataはRESTベースのデータアクセスプロトコルです。",
            metadata: JSON.stringify({ source: "Documentation", created_by: "admin" })
        }
    ];

    try {
        const capDestination = await getDestination({ destinationName: DESTINATION_NAME });

        for (const [index, data] of dataList.entries()) {
            const response = await executeHttpRequest(capDestination, {
                method: 'POST',
                url: '/odata/v4/GPT/QahistoryView',
                headers: { 'Content-Type': 'application/json' },
                data: data
            });
            console.log(`✅ POST成功（${index + 1}件目）:`, response.data);
        }
    } catch (err) {
        console.error('❌ POST失敗:', err.message);
    }
}

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

promptUser();
