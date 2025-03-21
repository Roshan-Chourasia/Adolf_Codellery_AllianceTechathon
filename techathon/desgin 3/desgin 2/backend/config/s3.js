const AWS = require('aws-sdk');
require('dotenv').config();

// Extract AWS credentials from environment variables
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'AKIAXGZAMJ6FTF4J5AFA';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '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';
const region = process.env.AWS_REGION || 'eu-north-1';
const bucketName = process.env.AWS_BUCKET_NAME || 'sigma.skibidi-bym123blee.cgftbeee.mera.ghar';

console.log('AWS Config:', {
    accessKeyId: accessKeyId ? 'Set' : 'Not set',
    secretAccessKey: secretAccessKey ? 'Set' : 'Not set',
    region,
    bucketName
});

// Configure AWS
AWS.config.update({
    accessKeyId,
    secretAccessKey,
    region
});

// Create S3 instance
const s3 = new AWS.S3();

// CloudFront domain (if configured)
const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN;

// Generate signed URL for file upload
const generateUploadUrl = async (key, fileType, expiresIn = 600) => {
    const params = {
        Bucket: bucketName,
        Key: key,
        ContentType: fileType,
        Expires: expiresIn // URL expires in specified seconds (default 10 minutes)
    };

    try {
        console.log(`Generating presigned URL for: ${key}`);
        const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
        return {
            uploadUrl: uploadUrl,
            key: key,
            fileType: fileType
        };
    } catch (error) {
        console.error('Error generating upload URL:', error);
        throw error;
    }
};

// Get file URL
const getFileUrl = (key) => {
    if (CLOUDFRONT_DOMAIN) {
        return `https://${CLOUDFRONT_DOMAIN}/${key}`;
    } else {
        return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    }
};

// Get a presigned URL for reading a file (useful for private files)
const getReadUrl = async (key, expiresIn = 3600) => {
    const params = {
        Bucket: bucketName,
        Key: key,
        Expires: expiresIn // URL expires in specified seconds (default 1 hour)
    };

    try {
        const readUrl = await s3.getSignedUrlPromise('getObject', params);
        return readUrl;
    } catch (error) {
        console.error('Error generating read URL:', error);
        throw error;
    }
};

// Check if a file exists
const fileExists = async (key) => {
    try {
        await s3.headObject({
            Bucket: bucketName,
            Key: key
        }).promise();
        return true;
    } catch (error) {
        if (error.code === 'NotFound') {
            return false;
        }
        throw error;
    }
};

// Delete file from S3
const deleteFile = async (key) => {
    const params = {
        Bucket: bucketName,
        Key: key
    };

    try {
        await s3.deleteObject(params).promise();
        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};

// Test S3 connection by checking if we can generate a presigned URL
const testConnection = async () => {
    try {
        // We'll just test generating a presigned URL, which doesn't require bucket access
        const testKey = `test-connection-${Date.now()}.txt`;
        await generateUploadUrl(testKey, 'text/plain', 10);
        console.log('S3 connection successful (presigned URL generation working)');
        return true;
    } catch (error) {
        console.error('S3 connection test failed:', error);
        return false;
    }
};

// Run connection test immediately
testConnection();

module.exports = {
    s3,
    bucketName,
    region,
    generateUploadUrl,
    getFileUrl,
    getReadUrl,
    fileExists,
    deleteFile,
    testConnection
}; 