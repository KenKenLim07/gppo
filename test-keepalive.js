// Local test script for debugging keepalive functionality
// Run with: node test-keepalive.js

// Simulate the GitHub Actions environment
process.env.FCM_KEY = process.env.FCM_KEY || '{"test": "mode"}';

console.log('🧪 Testing keepalive script locally...');
console.log('📝 Note: This will only test the script structure, not actual FCM sending');

// Test the script structure
try {
  require('./.github/scripts/sendKeepalivePush.cjs');
  console.log('✅ Script loaded successfully');
} catch (error) {
  console.error('❌ Error loading script:', error.message);
} 