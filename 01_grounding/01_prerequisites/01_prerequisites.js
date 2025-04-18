// ========================
// 
// SAP AI CoreやObject Storeとの紐付けを準備する
// https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-resource-group-for-ai-data-management
// 
// ========================
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const qs = require('qs');
const readline = require('readline');

// Resource Group ID バリデーション関数
function isValidResourceGroupId(id) {
    const minLength = 3;
    const maxLength = 253;
    const validPattern = /^[a-zA-Z0-9]([a-zA-Z0-9.-]{1,251})[a-zA-Z0-9]$/;

    if (typeof id !== 'string') {
        return { valid: false, reason: 'ID must be a string' };
    }
    if (id.length < minLength || id.length > maxLength) {
        return { valid: false, reason: `Length must be between ${minLength} and ${maxLength}` };
    }
    if (!validPattern.test(id)) {
        return {
            valid: false,
            reason:
                'ID must start and end with a letter or digit, and only contain letters, digits, hyphens (-), and periods (.) in between',
        };
    }
    return { valid: true };
}

// 認証情報の読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/ai_core_sk.json'), 'utf8'));
const s3Creds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/object_store_sk.json'), 'utf8'));
const userCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/user_defined_variable.json'), 'utf8'));

const xsuaaHostname = aiCoreCreds.url;
const xsuaaClient = aiCoreCreds.clientid;
const xsuaaSecret = aiCoreCreds.clientsecret;

const AI_API_HOST = aiCoreCreds.serviceurls.AI_API_URL;
const resourceGroupId = userCreds.resourceGroupId;
const secretName = userCreds.secretName;

// Resource Group ID バリデーション実行
const validation = isValidResourceGroupId(resourceGroupId);
if (!validation.valid) {
    console.error(`❌ Invalid resourceGroupId "${resourceGroupId}": ${validation.reason}`);
    process.exit(1);
}

const s3Info = {
    bucketName: s3Creds.bucket,
    region: s3Creds.region,
    host: s3Creds.host,
    accessKeyId: s3Creds.access_key_id,
    secretAccessKey: s3Creds.secret_access_key,
    username: s3Creds.username,
};

async function getXsuaaToken() {
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
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        console.log('✅ Fetched access_token!');
        return response.data.access_token;
    } catch (err) {
        logAxiosError(err);
        throw err;
    }
}

async function checkExistingResourceGroup(token) {
    const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const { status, statusMessage, labels } = response.data;
        console.log(`ℹ️ Resource Group "${resourceGroupId}" already exists.`);
        console.log(`🔎 Status: ${status}`);
        if (statusMessage) {
            console.log(`📝 Message: ${statusMessage}`);
        }
        return { exists: true, status, statusMessage, labels };
    } catch (err) {
        if (err.response && err.response.status === 404) {
            console.log('ℹ️ No existing resource group found. Proceeding with creation...');
            return { exists: false };
        } else {
            logAxiosError(err);
            throw err;
        }
    }
}

async function patchResourceGroupWithGroundingLabel(token) {
    const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;
    const payload = {
        labels: [
            {
                key: 'ext.ai.sap.com/document-grounding',
                value: 'true',
            }
        ]
    };

    try {
        const response = await axios.patch(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        console.log('🔧 Patched resource group to enable document-grounding!');
        console.log('🔍 Response:', response.data);
    } catch (err) {
        logAxiosError(err);
        throw new Error('❌ Failed to patch resource group with grounding label.');
    }
}

async function promptUserContinue(message = 'Do you want to continue anyway? (yes/no): ') {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => {
        rl.question(`⚠️  ${message}`, answer => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes');
        });
    });
}

async function deleteResourceGroup(token) {
    const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;
    try {
        const response = await axios.delete(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        console.log('🗑️ Resource Group deleted.');
        console.log('🔍 Response:', response.data);
    } catch (err) {
        logAxiosError(err);
        throw new Error('❌ Failed to delete Resource Group.');
    }
}

async function createResourceGroup(token) {
    const url = `${AI_API_HOST}/v2/admin/resourceGroups`;
    const payload = { resourceGroupId };

    console.log(payload);

    try {
        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        console.log('✅ Resource Group creation initialized!');
        console.log('🔍 Response:', response.data);
    } catch (err) {
        logAxiosError(err);
        throw err;
    }
}

async function getResourceGroupStatus(token) {
    const url = `${AI_API_HOST}/v2/admin/resourceGroups/${resourceGroupId}`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const { status, statusMessage } = response.data;
        console.log(`🔎 Current status: ${status}`);
        if (statusMessage) {
            console.log(`📝 Message: ${statusMessage}`);
        }
        return { status, statusMessage };
    } catch (err) {
        logAxiosError(err);
        throw err;
    }
}

async function waitForResourceGroupReady(token, retries = 12, delayMs = 5000) {
    for (let i = 0; i < retries; i++) {
        const { status, statusMessage } = await getResourceGroupStatus(token);
        if (status === 'PROVISIONED') {
            console.log('✅ Resource Group is READY!');
            return;
        }
        if (status === 'ERROR') {
            console.error('❌ Resource Group status is ERROR');
            console.error(`📝 Error Message: ${statusMessage || 'No message provided'}`);
            throw new Error('Resource Group creation failed with status ERROR.');
        }
        console.log(`⏳ Waiting for READY... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    throw new Error('⛔ Resource Group did not become READY in time.');
}

async function createS3Secret(token) {
    const url = `${AI_API_HOST}/v2/admin/secrets`;
    console.log(`🔑 S3 Secret loaded ${JSON.stringify(s3Info)}`);

    const payload = {
        name: secretName,
        data: {
            url: Buffer.from(`https://${s3Info.bucketName}.s3.${s3Info.region}.amazonaws.com`).toString('base64'),
            authentication: "Tm9BdXRoZW50aWNhdGlvbg==",
            description: Buffer.from('Generic secret for accessing S3 bucket for grounding').toString('base64'),
            access_key_id: Buffer.from(s3Info.accessKeyId).toString('base64'),
            secret_access_key: Buffer.from(s3Info.secretAccessKey).toString('base64'),
            bucket: Buffer.from(s3Info.bucketName).toString('base64'),
            host: Buffer.from(s3Info.host).toString('base64'),
            region: Buffer.from(s3Info.region).toString('base64'),
            username: Buffer.from(s3Info.username).toString('base64'),
        },
        labels: [
            {
                key: 'ext.ai.sap.com/document-grounding',
                value: 'true',
            },
            {
                key: 'ext.ai.sap.com/documentRepositoryType',
                value: 'S3',
            },
        ],
    };

    try {
        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'AI-Resource-Group': resourceGroupId,
            },
        });
        console.log('✅ S3 Secret created');
        console.log('🔍 Response:', response.data);
    } catch (err) {
        if (err.response && err.response.status === 409) {
            console.log('ℹ️ S3 Secret already exists');
        } else {
            logAxiosError(err);
            throw err;
        }
    }
}

function logAxiosError(err) {
    console.error('❌ Error occurred during request:');
    if (err.config) {
        console.error(`📍 URL: ${err.config.url}`);
        console.error(`📦 Method: ${err.config.method}`);
        console.error(`📤 Data: ${JSON.stringify(err.config.data, null, 2)}`);
    }
    if (err.response) {
        console.error(`🚨 Status: ${err.response.status}`);
        console.error(`📨 Headers: ${JSON.stringify(err.response.headers, null, 2)}`);
        console.error(`📨 Data: ${JSON.stringify(err.response.data, null, 2)}`);
    } else {
        console.error(`⚠️ Message: ${err.message}`);
    }
}


(async () => {
    try {
        console.log('🔐 Getting access token...');
        const token = await getXsuaaToken();

        const { exists, status, statusMessage, labels } = await checkExistingResourceGroup(token);

        if (exists) {
            if (status === 'ERROR') {
                console.warn(`❌ Resource Group is in ERROR state. Status message: ${statusMessage || 'None'}`);
                const confirmDelete = await promptUserContinue('⚠️ Do you want to delete it? (yes/no): ');
                if (confirmDelete) {
                    await deleteResourceGroup(token);
                    console.log('👋 Exiting after deletion. Please rerun the script to create it again.');
                    process.exit(0);
                } else {
                    console.log('🚫 Aborted by user.');
                    return;
                }
            }

            const hasGrounding = labels?.some(l => l.key === 'ext.ai.sap.com/document-grounding');
            if (!hasGrounding) {
                console.log('ℹ️ Resource Group does NOT have document-grounding label.');
                const choice = await new Promise(resolve => {
                    const rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });
                    rl.question('❓ What would you like to do?\n 1) PATCH to enable grounding\n 2) DELETE and exit\n 3) Skip and exit\nChoose [1/2/3]: ', answer => {
                        rl.close();
                        resolve(answer.trim());
                    });
                });

                if (choice === '1') {
                    await patchResourceGroupWithGroundingLabel(token);
                    console.log('⏳ Waiting 5 seconds before status monitoring...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    console.log('⏳ Monitoring status after PATCH...');
                    await waitForResourceGroupReady(token);
                    await createS3Secret(token);
                    console.log('🎉 Setup completed with patching!');
                } else if (choice === '2') {
                    await deleteResourceGroup(token);
                    console.log('👋 Exiting after deletion. Please rerun the script to create it again.');
                    process.exit(0);
                } else {
                    console.log('🚫 Skipped by user. Exiting.');
                    return;
                }
            } else {
                console.log('✅ Resource Group already has document-grounding label.');
                await waitForResourceGroupReady(token);
                await createS3Secret(token);
                console.log('🎉 All setup completed successfully!');
            }
        } else {
            await createResourceGroup(token);
            console.log('✅ Resource Group created.');
            console.log('⏳ Monitoring resource group status...');
            await waitForResourceGroupReady(token);
            console.log('⚠️ PATCH is not automatically applied. Please rerun the script to enable grounding if desired.');
        }
    } catch (err) {
        console.error('🔥 Setup failed.');
    }
})();

