import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import twilio from 'twilio';

// Only initialize Twilio if credentials are present
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Helper function to initialize Firebase Admin only when needed
function getFirebaseAdmin() {
  if (!admin.apps.length) {
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return null;
    }
    
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
      return null;
    }
  }
  
  return admin.apps.length > 0 ? admin : null;
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
    // Initialize Firebase Admin if needed
    const firebaseAdmin = getFirebaseAdmin();
    
    if (!firebaseAdmin) {
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
    const db = firebaseAdmin.firestore();
    const messaging = firebaseAdmin.messaging();

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
        // Get user's language preference (default to English)
        const userLang = userData.language || 'en';
        
        // Prepare localized notification messages
        const alertTitle = userLang === 'es' ? '⚠️ ALERTA DE ICE' : '⚠️ ICE ALERT';
        const alertWarning = userLang === 'es' 
          ? 'ADVERTENCIA: ¡Avistamiento de ICE reportado cerca de ti!' 
          : 'WARNING: ICE Sighting reported near you!';
        const vehicleInfo = `${sighting.vehicle.color} ${sighting.vehicle.type}`;
        const detailsLink = userLang === 'es' 
          ? 'Ver detalles en melttheice.us' 
          : 'See details at melttheice.us';
        
        const messageBody = `${alertWarning} (${vehicleInfo}). ${detailsLink}`;

        // 2a. Send Push Notification (FCM)
        if (userData.fcmToken) {
          notifications.push(
            messaging.send({
              token: userData.fcmToken,
              notification: {
                title: alertTitle,
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
        if (userData.phoneNumber && twilioClient) {
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
