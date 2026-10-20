import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import twilio from 'twilio';
import {
  buildAlertMessage,
  isAlertableSighting,
  parseAlertSighting,
  planAlerts,
} from '@/lib/alerts';

// Only initialize Twilio if credentials are present
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Log Twilio initialization status
if (twilioClient) {
  console.log('✅ Twilio client initialized successfully');
  console.log('📱 Twilio phone number:', process.env.TWILIO_PHONE_NUMBER);
} else {
  console.warn('⚠️ Twilio client not initialized - missing credentials');
  console.warn('Missing:', {
    accountSid: !process.env.TWILIO_ACCOUNT_SID,
    authToken: !process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: !process.env.TWILIO_PHONE_NUMBER
  });
}

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

    // Validate the payload up front: a malformed sighting is a 400,
    // never a 500 raised halfway through the recipient loop.
    const sighting = parseAlertSighting(await req.json());
    if (!sighting) {
      return NextResponse.json({ error: 'Invalid sighting data' }, { status: 400 });
    }

    // A retried or replayed report of an old sighting must not
    // re-alert everyone nearby.
    if (!isAlertableSighting(sighting)) {
      console.log('⏭️ Sighting is stale or future-dated; skipping alerts');
      return NextResponse.json({ success: true, alertedCount: 0, skipped: 'stale-sighting' });
    }

    // Get Firebase services
    const db = firebaseAdmin.firestore();
    const messaging = firebaseAdmin.messaging();

    // 1. Fetch all users with notifications enabled
    const usersSnapshot = await db.collection('users')
      .where('notificationsEnabled', '==', true)
      .get();

    console.log(`📊 Found ${usersSnapshot.size} user(s) with notifications enabled`);

    // 2. Plan recipients purely (radius, channels, language) — the
    // decision logic lives in @/lib/alerts and is unit tested there.
    const users = usersSnapshot.docs.map((userDoc: any) => ({
      id: userDoc.id,
      data: userDoc.data() as Record<string, unknown>,
    }));
    const recipients = planAlerts(users, sighting);

    // 3. Perform the sends for the plan.
    const notifications: Promise<any>[] = [];
    let smsAttempts = 0;
    let fcmAttempts = 0;

    for (const recipient of recipients) {
      const message = buildAlertMessage(sighting, recipient.language);

      // 3a. Send Push Notification (FCM)
      if (recipient.fcmToken) {
        fcmAttempts++;
        console.log(`📲 Sending FCM to user ${recipient.userId}`);
        notifications.push(
          messaging.send({
            token: recipient.fcmToken,
            notification: {
              title: message.title,
              body: message.body,
            },
            webpush: {
              fcmOptions: {
                link: 'https://melttheice.us',
              },
            },
          }).then(() => {
            console.log(`✅ FCM sent successfully to user ${recipient.userId}`);
          }).catch((err: any) => {
            console.error(`❌ FCM error for ${recipient.userId}:`, err.message);
          })
        );
      }

      // 3b. Send SMS (Twilio)
      if (recipient.phoneNumber) {
        if (twilioClient) {
          smsAttempts++;
          console.log(`📱 Attempting SMS to ${recipient.phoneNumber} (user ${recipient.userId})`);
          notifications.push(
            twilioClient.messages.create({
              body: message.body,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: recipient.phoneNumber,
            }).then((message: any) => {
              console.log(`✅ SMS sent successfully to ${recipient.phoneNumber}, SID: ${message.sid}`);
            }).catch((err: any) => {
              console.error(`❌ SMS error for ${recipient.phoneNumber} (user ${recipient.userId}):`, {
                code: err.code,
                message: err.message,
                status: err.status
              });
            })
          );
        } else {
          console.warn(`⚠️ Twilio client not available for user ${recipient.userId}`);
        }
      }
    }

    await Promise.all(notifications);

    console.log(`✨ Alert processing complete:`, {
      totalNotifications: notifications.length,
      fcmAttempts,
      smsAttempts,
      usersInRange: recipients.length
    });

    return NextResponse.json({
      success: true,
      alertedCount: notifications.length,
      fcmAttempts,
      smsAttempts
    });
  } catch (error: any) {
    console.error('Alert processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
