import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Firebase Admin (only if credentials are present)
if (!admin.apps.length && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

/**
 * Calculate distance between two points in km
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: NextRequest) {
  try {
    // Check if Firebase Admin is properly initialized
    if (!admin.apps.length) {
      console.error('Firebase Admin not initialized - missing credentials');
      return NextResponse.json({ 
        error: 'Server configuration error. Alerts are disabled.' 
      }, { status: 503 });
    }

    const { sighting } = await req.json();

    if (!sighting || !sighting.location) {
      return NextResponse.json({ error: 'Invalid sighting data' }, { status: 400 });
    }

    const { lat, lng } = sighting.location;
    const alertRadius = 2; // 2km radius

    // Get Firebase services
    const db = admin.firestore();
    const messaging = admin.messaging();

    // 1. Fetch all users with notifications enabled
    const usersSnapshot = await db.collection('users')
      .where('notificationsEnabled', '==', true)
      .get();

    const notifications: Promise<any>[] = [];

    usersSnapshot.forEach((userDoc: any) => {
      const userData = userDoc.data();
      const userLocation = userData.lastKnownLocation;

      // If we don't know where the user is, we skip them for now 
      // (or we could store their "Home Zone")
      if (!userLocation) return;

      const distance = calculateDistance(lat, lng, userLocation.lat, userLocation.lng);

      if (distance <= alertRadius) {
        // Prepare notification payload
        const messageBody = `WARNING: ICE Sighting reported near you! (${sighting.vehicle.color} ${sighting.vehicle.type}). See details at melttheice.us`;

        // 2a. Send Push Notification (FCM)
        if (userData.fcmToken) {
          notifications.push(
            messaging.send({
              token: userData.fcmToken,
              notification: {
                title: '⚠️ ICE ALERT',
                body: messageBody,
              },
              webpush: {
                fcmOptions: {
                  link: 'https://melttheice.us',
                },
              },
            }).catch((err: any) => console.error(`FCM error for ${userDoc.id}:`, err))
          );
        }

        // 2b. Send SMS (Twilio) - if preference set or just send both for now
        if (userData.phoneNumber) {
          notifications.push(
            twilioClient.messages.create({
              body: messageBody,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: userData.phoneNumber,
            }).catch((err: any) => console.error(`SMS error for ${userDoc.id}:`, err))
          );
        }
      }
    });

    await Promise.all(notifications);

    return NextResponse.json({ success: true, alertedCount: notifications.length });
  } catch (error: any) {
    console.error('Alert processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
