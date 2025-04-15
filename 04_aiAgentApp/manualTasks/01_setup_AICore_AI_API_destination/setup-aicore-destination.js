const { execSync } = require('child_process');
const axios = require('axios');
const qs = require('querystring');

// === 設定値 ===
const aicoreServiceInstance = 'default_aicore';
const aicoreServiceKeyName = 'aicore_service-key';
const destinationInstance = 'aiagentsample-destination';
const destinationServiceKeyName = 'destination_service-key';
const destinationName = 'AICore_AI_API';

function log(message, type = 'log') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;
    if (type === 'warn') console.warn(`${prefix} ⚠️ ${message}`);
    else if (type === 'error') console.error(`${prefix} ❌ ${message}`);
    else console.log(`${prefix} ${message}`);
}

// === サービスキー作成関数 ===
function createServiceKey(instanceName, keyName) {
    try {
        log(`🔧 サービスキー作成中: ${keyName} for ${instanceName}`);
        execSync(`cf create-service-key ${instanceName} ${keyName}`, { stdio: 'inherit' });
    } catch {
        log(`サービスキー ${keyName} はすでに存在するか作成に失敗しました`, 'warn');
    }
}

// === サービスキー取得関数（credentialsだけ返す） ===
function getServiceKey(instanceName, keyName) {
    log(`[getServiceKey] Getting service key: ${keyName}`);
    const output = execSync(`cf service-key ${instanceName} ${keyName}`).toString();
    const jsonStart = output.indexOf('{');
    if (jsonStart === -1) throw new Error('[getServiceKey] JSONデータが見つかりませんでした。');
    const credentials = JSON.parse(output.slice(jsonStart)).credentials;

    const redacted = {
        ...credentials,
        clientsecret: '****',
        clientid: credentials.clientid?.substring(0, 10) + '...',
        url: credentials.url,
        uri: credentials.uri,
        tokenurl: credentials.tokenurl
    };
    log(`[getServiceKey] サービスキー情報（マスク済）:\n${JSON.stringify(redacted, null, 2)}`);
    return credentials;
}

// === アクセストークン取得関数（Destination用） ===
async function getAccessToken(destKey) {
    const tokenUrl = `${destKey.url}/oauth/token`;
    log(`🔐 [getAccessToken] Requesting token from: ${tokenUrl}`);

    const body = qs.stringify({
        grant_type: 'client_credentials',
        client_id: destKey.clientid,
        client_secret: destKey.clientsecret
    });

    try {
        const res = await axios.post(tokenUrl, body, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        log('✅ [getAccessToken] Token取得成功');
        log(`🔑 [getAccessToken] access_token: ${res.data.access_token.slice(0, 10)}...${res.data.access_token.slice(-5)}`);
        return res.data.access_token;
    } catch (err) {
        log('[getAccessToken] トークン取得に失敗', 'error');
        if (err.response) {
            log(`status: ${err.response.status}`, 'error');
            log(`data: ${JSON.stringify(err.response.data, null, 2)}`, 'error');
        } else {
            log(err.message, 'error');
        }
        throw err;
    }
}

// === Destination の存在確認関数 ===
async function checkIfDestinationExists(destKey, accessToken, destinationName) {
    const apiUrl = `${destKey.uri}/destination-configuration/v1/destinations/${encodeURIComponent(destinationName)}`;
    log(`🔎 [checkIfDestinationExists] Checking existence of "${destinationName}" at: ${apiUrl}`);

    try {
        await axios.get(apiUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        log(`✅ [checkIfDestinationExists] Destination "${destinationName}" は存在します`);
        return true;
    } catch (err) {
        if (err.response?.status === 404) {
            log(`⚠️ [checkIfDestinationExists] Destination "${destinationName}" は存在しません`, 'warn');
            return false;
        } else {
            log(`[checkIfDestinationExists] 予期しないエラー: ${err.message}`, 'error');
            throw err;
        }
    }
}

// === Destination 作成 or 更新関数 ===
async function createOrUpdateDestination(destKey, accessToken, aicoreKey) {
    const baseUrl = destKey.uri;
    const url = `${baseUrl}/destination-configuration/v1/instanceDestinations`;

    const destinationPayload = {
        Name: destinationName,
        Type: "HTTP",
        ProxyType: "Internet",
        URL: aicoreKey.serviceurls.AI_API_URL,
        Authentication: "OAuth2ClientCredentials",
        clientId: aicoreKey.clientid,
        clientSecret: aicoreKey.clientsecret,
        tokenServiceURL: `${aicoreKey.url}/oauth/token`,
        Description: "Destination to AI Core"
    };

    const exists = await checkIfDestinationExists(destKey, accessToken, destinationName);
    const method = exists ? 'put' : 'post';

    log(`📡 [createOrUpdateDestination] Sending ${method.toUpperCase()} to ${url}`);
    log(`[createOrUpdateDestination] Payload:\n${JSON.stringify(destinationPayload, null, 2)}`);

    try {
        const res = await axios({
            method,
            url: url,
            data: destinationPayload,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        log(`✅ Destination ${exists ? '更新' : '作成'}成功: HTTP ${res.status}`);
    } catch (err) {
        log(`${method.toUpperCase()} ${url} に失敗しました`, 'error');
        if (err.response) {
            log(`status: ${err.response.status}`, 'error');
            log(`data: ${JSON.stringify(err.response.data, null, 2)}`, 'error');
        } else {
            log(err.message, 'error');
        }
        throw err;
    }
}

// === メイン処理 ===
(async () => {
    try {
        createServiceKey(aicoreServiceInstance, aicoreServiceKeyName);
        createServiceKey(destinationInstance, destinationServiceKeyName);

        const aicoreKey = getServiceKey(aicoreServiceInstance, aicoreServiceKeyName);
        const destKey = getServiceKey(destinationInstance, destinationServiceKeyName);

        const accessToken = await getAccessToken(destKey);
        await createOrUpdateDestination(destKey, accessToken, aicoreKey);
    } catch (err) {
        log(`❌ 処理中にエラーが発生しました: ${err.message || err}`, 'error');
    }
})();
