const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// 認証ファイルのパスを指定
const credentialsPath = path.join(__dirname, '../../credentials/object_store_sk.json');

// ファイルから認証情報を読み込み
const s3Creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// 認証情報の取得
const accessKeyId = s3Creds.access_key_id;
const secretAccessKey = s3Creds.secret_access_key;
const region = s3Creds.region;
const bucketName = s3Creds.bucket;

AWS.config.update({
    accessKeyId,
    secretAccessKey,
    region
});

const s3 = new AWS.S3();

async function checkBucketAccess() {
    try {
        await s3.headBucket({ Bucket: bucketName }).promise();
        console.log(`✅ S3バケット "${bucketName}" は存在し、アクセス可能です`);
    } catch (err) {
        if (err.statusCode === 403) {
            console.error(`🚫 アクセス拒否：S3バケット "${bucketName}" にはアクセスできません（403 Forbidden）`);
        } else if (err.statusCode === 404) {
            console.error(`❌ バケットが存在しません：S3バケット "${bucketName}" は見つかりません（404 Not Found）`);
        } else {
            console.error('❗ 不明なエラー:', err.message);
        }
    }
}

checkBucketAccess();
