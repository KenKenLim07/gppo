const admin = require('firebase-admin');

// Load service account from environment variable (now FCM_KEY)
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FCM_KEY);
  console.log('✅ FCM_KEY loaded successfully');
} catch (error) {
  console.error('❌ Error parsing FCM_KEY:', error.message);
  process.exit(1);
}

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

// TODO: Replace with your actual device tokens or fetch from your DB
const tokens = [
  'd0cV871rSfafWDTGraGAx3:APA91bH2EW1P3MVCoRcuotlCdVkMr5zTdejclVYDbW3GxP30NhpQ03aBL0qkDLBDTCvVKJJA0yG7I3Kl2uVijGoOaKRMufkrEBOaftv8FrEsGnYCtx9q0Io'
  // Add more tokens here if needed
];

const message = {
  notification: {
    title: 'Keepalive',
    body: 'Please update your location by opening the Guimaras Patrol.'
  },
  data: { type: 'keepalive' },
  android: { priority: 'high' },
  apns: { headers: { 'apns-priority': '10' } }
};

(async () => {
  console.log('🚀 Starting keepalive push process...');
  console.log('📱 Sending keepalive push to tokens:', tokens);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const token of tokens) {
    try {
      const response = await admin.messaging().send({ ...message, token });
      console.log('✅ Successfully sent message to token:', token.substring(0, 20) + '...');
      console.log('📄 Response:', response);
      successCount++;
    } catch (error) {
      console.error('❌ Error sending message to token:', token.substring(0, 20) + '...');
      console.error('🔍 Error details:', error.message);
      errorCount++;
    }
  }
  
  console.log('📊 Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📱 Total tokens: ${tokens.length}`);
  
  if (errorCount > 0) {
    console.log('⚠️  Some messages failed to send. Check the error details above.');
    process.exit(1);
  } else {
    console.log('🎉 All keepalive messages sent successfully!');
  }
})(); 