const admin = require('firebase-admin');

// Load service account from environment variable (now FCM_KEY)
const serviceAccount = JSON.parse(process.env.FCM_KEY);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// TODO: Replace with your actual device tokens or fetch from your DB
const tokens = [
  'd0cV871rSfafWDTGraGAx3:APA91bH2EW1P3MVCoRcuotlCdVkMr5zTdejclVYDbW3GxP30NhpQ03aBL0qkDLBDTCvVKJJA0yG7I3Kl2uVijGoOaKRMufkrEBOaftv8FrEsGnYCtx9q0Io'
  // Add more tokens here if needed
];

const message = {
  data: { type: 'keepalive' },
  android: { priority: 'high' },
  apns: { headers: { 'apns-priority': '10' } }
};

(async () => {
  console.log('Sending keepalive push to tokens:', tokens);
  for (const token of tokens) {
    try {
      const response = await admin.messaging().send({ ...message, token });
      console.log('Successfully sent message:', response);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
})(); 