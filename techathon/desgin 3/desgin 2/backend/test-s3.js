// Simple script to test AWS S3 connectivity
require('dotenv').config();
const AWS = require('aws-sdk');
const path = require('path');

// Log environment variables for debugging (don't log secret in production)
console.log('Testing AWS S3 connectivity with these credentials:');
console.log('AWS_ACCESS_KEY_ID length:', process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.length : 'not set');
console.log('AWS_SECRET_ACCESS_KEY set:', process.env.AWS_SECRET_ACCESS_KEY ? 'yes (hidden)' : 'not set');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME);

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIAXGZAMJ6FTF4J5AFA',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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',
  region: process.env.AWS_REGION || 'eu-north-1'
});

// Create S3 service object
const s3 = new AWS.S3();

// Get current time
const currentTime = new Date().toISOString();
console.log('Current time:', currentTime);

// Check if bucket exists
const testBucket = process.env.AWS_BUCKET_NAME || 'sigma.skibidi-bym123blee.cgftbeee.mera.ghar';
console.log(`Testing access to bucket: ${testBucket}`);

// Function to list objects in bucket
async function listObjects() {
  try {
    console.log('Attempting to list objects...');
    const data = await s3.listObjectsV2({ 
      Bucket: testBucket,
      MaxKeys: 5
    }).promise();
    
    console.log('Success! Connection to S3 is working.');
    console.log(`Found ${data.Contents.length} objects in bucket.`);
    console.log('First few objects:');
    data.Contents.forEach((obj, i) => {
      if (i < 3) { // Show only first 3
        console.log(` - ${obj.Key} (${Math.round(obj.Size/1024)} KB)`);
      }
    });
    return true;
  } catch (error) {
    console.error('Error accessing S3:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'RequestTimeTooSkewed') {
      console.error('\nYour computer clock is out of sync with AWS servers.');
      console.error('Please update your system time to match internet time.');
    } else if (error.code === 'NoSuchBucket') {
      console.error('\nThe bucket does not exist or you don\'t have permission to access it.');
    } else if (error.code === 'InvalidAccessKeyId') {
      console.error('\nThe AWS Access Key ID is invalid.');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('\nThe AWS Secret Access Key is invalid.');
    }
    return false;
  }
}

// Create a test file
async function testPutObject() {
  try {
    console.log('\nAttempting to create a test file in S3...');
    const testParams = {
      Bucket: testBucket,
      Key: `test-file-${Date.now()}.txt`,
      Body: 'This is a test file to verify S3 upload functionality',
      ContentType: 'text/plain'
    };
    
    const result = await s3.putObject(testParams).promise();
    console.log('Test file uploaded successfully!');
    console.log('ETag:', result.ETag);
    return true;
  } catch (error) {
    console.error('Error uploading test file:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  try {
    const listSuccess = await listObjects();
    if (listSuccess) {
      await testPutObject();
    }
    console.log('\nTest complete.');
  } catch (error) {
    console.error('Unexpected error during tests:', error);
  }
}

// Execute tests
runTests(); 