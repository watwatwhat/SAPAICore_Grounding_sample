const path = require('path');
const fs = require('fs');
const axios = require('axios');
const qs = require('qs');
const { jwtDecode } = require('jwt-decode');

require('dotenv').config({ path: path.join(__dirname, '../../cap/.env') });

console.log('📂 Loading user-defined credentials...');
const userCredsPath = path.join(__dirname, '../../../credentials/user_defined_variable.json');
let userCreds;
try {
    userCreds = JSON.parse(fs.readFileSync(userCredsPath, 'utf8'));
    console.log('✅ Loaded user credentials:', userCreds);
} catch (e) {
    console.error('❌ Failed to load user_defined_variable.json:', e.message);
    process.exit(1);
}

const resourceGroupId = userCreds.resourceGroupId;

// VCAP_SERVICESからAI Coreの情報を取得
console.log('📂 Loading VCAP_SERVICES from .env...');
let vcapServicesRaw = process.env.VCAP_SERVICES;
console.log('🧾 Raw VCAP_SERVICES (truncated):', vcapServicesRaw?.substring(0, 300) || '(not found)');

let vcapServices;
try {
    vcapServices = JSON.parse(vcapServicesRaw);
    console.log('✅ Parsed VCAP_SERVICES successfully.');
} catch (e) {
    console.error('❌ Failed to parse VCAP_SERVICES from .env:', e.message);
    process.exit(1);
}

const aiCore = vcapServices.aicore?.[0];
if (!aiCore) {
    console.error('❌ aicore service not found in VCAP_SERVICES');
    process.exit(1);
}

const creds = aiCore.credentials;
console.log('🔍 AI Core credentials loaded:');
console.log(`- xsuaaHostname: ${creds.url}`);
console.log(`- clientid: ${creds.clientid}`);
console.log(`- clientsecret: ${'*'.repeat(creds.clientsecret.length)}`); // Masked
console.log(`- AI_API_URL: ${creds.serviceurls?.AI_API_URL}`);

const xsuaaHostname = creds.url;
const xsuaaClient = creds.clientid;
const xsuaaSecret = creds.clientsecret;
const AI_API_HOST = creds.serviceurls.AI_API_URL;

async function getXsuaaToken() {
    console.log('🔐 Requesting XSUAA token...');
    const url = `${xsuaaHostname}/oauth/token`;
    const authHeader = Buffer.from(`${xsuaaClient}:${xsuaaSecret}`).toString('base64');

    const data = qs.stringify({
        grant_type: 'client_credentials',
        client_id: xsuaaClient,
        client_secret: xsuaaSecret,
    });

    try {
        const response = await axios.post(url, data, {
            headers: {
                Authorization: `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        const token = response.data.access_token;
        console.log('✅ Fetched access_token.');
        console.log('🔑 JWT Access Token (truncated):', token.substring(0, 30) + '...');

        try {
            const decoded = jwtDecode(token);
            console.log('🧬 Decoded JWT (payload):', decoded);
        } catch (e) {
            console.warn('⚠️ Failed to decode JWT:', e.message);
        }

        return token;
    } catch (err) {
        console.error('❌ Failed to fetch access_token.');
        logAxiosError(err);
        throw err;
    }
}

async function createResourceGroup(token) {
    const url = `${AI_API_HOST}/v2/admin/resourceGroups`;
    console.log(`📦 Creating resource group "${resourceGroupId}" at ${url}...`);

    const payload = {
        resourceGroupId,
        labels: [
            {
                key: 'ext.ai.sap.com/document-grounding',
                value: 'true',
            },
        ],
    };

    try {
        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        console.log('✅ Resource Group created:', response.status, response.data);
    } catch (err) {
        if (err.response?.status === 409) {
            console.log('ℹ️ Resource Group already exists (409 Conflict).');
        } else {
            console.error('❌ Failed to create resource group.');
            logAxiosError(err);
            throw err;
        }
    }
}

async function verifyResourceGroup(token) {
    const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;
    console.log(`🔍 Verifying existence of resource group "${resourceGroupId}" at ${url}...`);

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const { status, statusText, data } = response;
        const { resourceGroupId: rgId, status: rgStatus, statusMessage, labels = [] } = data;

        console.log('📨 Full verification response summary:');
        console.log(`- HTTP Status: ${status} ${statusText}`);
        console.log(`- Resource Group ID: ${rgId}`);
        console.log(`- Status: ${rgStatus}`);
        if (statusMessage) console.log(`- Status Message: ${statusMessage}`);
        if (labels.length > 0) {
            console.log(`- Labels:`);
            labels.forEach((label, index) => {
                console.log(`    [${index + 1}] ${label.key} = ${label.value}`);
            });
        } else {
            console.log(`- Labels: (none)`);
        }

        if (status === 200 && rgId === resourceGroupId) {
            if (rgStatus === 'ACTIVE') {
                console.log(`✅ Resource Group "${rgId}" is verified and active.`);
            } else {
                console.warn(`⚠️ Resource Group "${rgId}" is in non-active state: "${rgStatus}".`);
                throw new Error(`Resource Group is not ACTIVE: ${rgStatus}`);
            }
        } else {
            throw new Error('Unexpected verification response structure.');
        }
    } catch (err) {
        console.error(`❌ Failed to verify resource group "${resourceGroupId}".`);
        logAxiosError(err);
        throw err;
    }
}

// 共通エラーログ関数
function logAxiosError(err) {
    if (err.response) {
        console.error(`📛 Response Error: ${err.response.status} ${err.response.statusText}`);
        console.error('📨 Response data:', err.response.data);
    } else if (err.request) {
        console.error('📡 No response received. Request was:', err.request);
    } else {
        console.error('🧠 Error setting up request:', err.message);
    }
}

// 実行部分
(async () => {
    try {
        const token = await getXsuaaToken();
        await createResourceGroup(token);
        await verifyResourceGroup(token);
        console.log('🎉 All steps completed successfully!');
    } catch (err) {
        console.error('❌ Execution failed:', err.message);
    }
})();
