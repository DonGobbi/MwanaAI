/**
 * Simple test script to verify Firebase authentication integration
 * Run this script with: node tests/auth-test.js
 */

require('dotenv').config();
const { auth, admin } = require('../config/firebase');

async function testFirebaseAuth() {
  console.log('🔥 Testing Firebase Authentication Integration');
  console.log('--------------------------------------------');
  
  try {
    // 1. Test Firebase Admin SDK initialization
    console.log('1. Testing Firebase Admin SDK initialization...');
    const projectId = admin.app().options.projectId;
    console.log(`✅ Firebase Admin SDK initialized successfully (Project ID: ${projectId})`);
    
    // 2. Test user creation
    console.log('\n2. Testing user creation...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'Test123456';
    
    try {
      const userRecord = await auth.createUser({
        email: testEmail,
        password: testPassword,
        displayName: 'Test User',
      });
      
      console.log(`✅ Test user created successfully (UID: ${userRecord.uid})`);
      
      // 3. Test custom token creation
      console.log('\n3. Testing custom token creation...');
      const customToken = await auth.createCustomToken(userRecord.uid);
      console.log(`✅ Custom token created successfully: ${customToken.substring(0, 20)}...`);
      
      // 4. Test user retrieval
      console.log('\n4. Testing user retrieval...');
      const retrievedUser = await auth.getUser(userRecord.uid);
      console.log(`✅ User retrieved successfully: ${retrievedUser.displayName} (${retrievedUser.email})`);
      
      // 5. Clean up - delete test user
      console.log('\n5. Cleaning up - deleting test user...');
      await auth.deleteUser(userRecord.uid);
      console.log(`✅ Test user deleted successfully`);
      
    } catch (error) {
      console.error(`❌ Error during user operations: ${error.message}`);
      if (error.code === 'auth/email-already-exists') {
        console.log('Note: This may be due to rate limiting or a test user that was not properly cleaned up.');
      }
    }
    
    console.log('\n✅ Firebase Authentication integration test completed');
    
  } catch (error) {
    console.error(`❌ Firebase initialization error: ${error.message}`);
    console.error(error);
  }
}

testFirebaseAuth().catch(console.error);
