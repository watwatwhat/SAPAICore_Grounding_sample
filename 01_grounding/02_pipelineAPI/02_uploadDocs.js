// ========================
// 
// Object Store経由のAmazon S3にグラウンディング対象のドキュメントをアップロードする
// 
// ========================

const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// 🔐 認証情報をJSONファイルから読み込み
const aiCoreCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/ai_core_sk.json'), 'utf8'));
const s3Creds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/object_store_sk.json'), 'utf8'));
const userCreds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../credentials/user_defined_variable.json'), 'utf8'));

// S3 認証情報
const s3Info = {
    bucketName: s3Creds.bucket,
    region: s3Creds.region,
    host: s3Creds.host,
    accessKeyId: s3Creds.access_key_id,
    secretAccessKey: s3Creds.secret_access_key,
    username: s3Creds.username,
};

// AWS S3 クライアントの設定
const s3 = new AWS.S3({
    accessKeyId: s3Info.accessKeyId,
    secretAccessKey: s3Info.secretAccessKey,
    endpoint: s3Info.host, // SAP BTPのObject Storeの場合も有効
    region: s3Info.region,
    signatureVersion: 'v4',
    s3ForcePathStyle: true,
});

// アップロード対象のファイル
const filePath = path.join(__dirname, '../docs/SAP_BTP_Overview.pdf');
const fileContent = fs.readFileSync(filePath);
const fileName = 'SAP_BTP_Overview.pdf';

// アップロードパラメータ
const uploadParams = {
    Bucket: s3Info.bucketName,
    Key: fileName,
    Body: fileContent,
    ContentType: 'application/pdf'
};

// アップロードと署名付きURLの生成
s3.upload(uploadParams, (err, data) => {
    if (err) {
        console.error('❌ アップロード失敗:', err);
        return;
    }

    console.log('✅ アップロード成功:', data.Location);

    // Presigned URL 発行（1時間有効）
    const signedUrl = s3.getSignedUrl('getObject', {
        Bucket: s3Info.bucketName,
        Key: fileName,
        Expires: 3600, // 秒数（例: 3600秒 = 1時間）
    });

    console.log('⏳ 署名付きURL (1時間有効):');
    console.log(signedUrl);
});
