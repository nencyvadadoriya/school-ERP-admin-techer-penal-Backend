const webpush = require('web-push');

const setupWebPush = () => {
  const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
  const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

  if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(
      'mailto:nencyvadadoriya8@gmail.com',
      publicVapidKey,
      privateVapidKey
    );
    console.log('Web Push VAPID keys set');
  } else {
    console.warn('VAPID keys not found in .env. Push notifications might not work.');
  }
};

const sendPushNotification = async (subscription, payload) => {
  if (!subscription) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('Push notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error);
    if (error.statusCode === 410) {
      // Subscription has expired or is no longer valid
      return { expired: true };
    }
  }
  return { expired: false };
};

module.exports = {
  setupWebPush,
  sendPushNotification
};
