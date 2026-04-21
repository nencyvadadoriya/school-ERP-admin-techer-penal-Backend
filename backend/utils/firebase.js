const admin = require('firebase-admin');
const path = require('path');

const setupFirebase = () => {
  try {
    // Check if service account file exists or use environment variables
    // For now, we'll assume the user will provide a serviceAccountKey.json
    // or we'll use environment variables if they prefer.
    
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../config/serviceAccountKey.json');
    const fs = require('fs');
    
    if (fs.existsSync(serviceAccountPath)) {
      admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath))
      });
      console.log('Firebase Admin SDK initialized using JSON file');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized using environment variable');
      } catch (parseError) {
        console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_JSON:', parseError.message);
      }
    } else {
      console.warn('Firebase service account key not found. Please provide FIREBASE_SERVICE_ACCOUNT_JSON in .env or place serviceAccountKey.json in config/');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
  }
};

const sendFirebaseNotification = async (tokens, payload) => {
  if (!tokens || tokens.length === 0) return;
  
  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    tokens: Array.isArray(tokens) ? tokens : [tokens],
  };

  console.log('FCM Message Payload:', JSON.stringify(message, null, 2));

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log(`${response.successCount} messages were sent successfully`);
    
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      console.log('List of tokens that caused failures: ' + failedTokens);
    }
    return response;
  } catch (error) {
    console.error('Error sending Firebase notification:', error);
    throw error;
  }
};

module.exports = {
  setupFirebase,
  sendFirebaseNotification
};
