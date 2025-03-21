// Simple script to test AWS S3 upload functionality only
require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIAXGZAMJ6FTF4J5AFA',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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',
  region: process.env.AWS_REGION || 'eu-north-1'
});

// Create S3 service object
const s3 = new AWS.S3();

// Bucket name
const bucketName = process.env.AWS_BUCKET_NAME || 'sigma.skibidi-bym123blee.cgftbeee.mera.ghar';

console.log('Testing S3 upload with these settings:');
console.log('- S3 Bucket:', bucketName);
console.log('- AWS Region:', AWS.config.region);
console.log('- Access Key ID ends with:', AWS.config.credentials.accessKeyId.slice(-4));

// Test uploading a small text file
async function testUpload() {
  try {
    const testParams = {
      Bucket: bucketName,
      Key: `test-upload-${Date.now()}.txt`,
      Body: 'This is a test file to verify S3 upload functionality',
      ContentType: 'text/plain'
    };
    
    console.log('Attempting to upload a test file directly...');
    const result = await s3.putObject(testParams).promise();
    
    console.log('\nSUCCESS: Test file uploaded to S3!');
    console.log('ETag:', result.ETag);
    return true;
  } catch (error) {
    console.error('\nERROR: Failed to upload test file to S3');
    console.error('Error Type:', error.code);
    console.error('Error Message:', error.message);
    
    if (error.code === 'AccessDenied') {
      console.log('\nThe AWS user does not have permission to upload objects to this bucket.');
      console.log('Make sure your IAM user has the s3:PutObject permission for this bucket.');
    }
    
    return false;
  }
}

// Test uploading with presigned URL
async function testPresignedUrl() {
  try {
    const key = `test-presigned-${Date.now()}.txt`;
    console.log('\nAttempting to generate a presigned URL for uploading...');
    
    const params = {
      Bucket: bucketName,
      Key: key,
      ContentType: 'text/plain',
      Expires: 60 // 1 minute
    };
    
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    console.log('\nSUCCESS: Generated presigned URL');
    console.log('URL (first 60 chars):', uploadUrl.substring(0, 60) + '...');
    console.log('\nThis URL can be used to upload a file via HTTP PUT request');
    return true;
  } catch (error) {
    console.error('\nERROR: Failed to generate presigned URL');
    console.error('Error Type:', error.code);
    console.error('Error Message:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  try {
    // Try direct upload first
    const uploadSuccess = await testUpload();
    
    // Then try to generate a presigned URL for upload
    await testPresignedUrl();
    
    console.log('\nTest complete.');
  } catch (error) {
    console.error('Unexpected error during tests:', error);
  }
}

// Execute tests
runTests(); 