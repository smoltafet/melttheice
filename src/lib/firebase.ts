import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBMMtABaD6LKq77FOCtaEU94a6wLyh813w",
  authDomain: "melttheice-916f0.firebaseapp.com",
  databaseURL: "https://melttheice-916f0-default-rtdb.firebaseio.com",
  projectId: "melttheice-916f0",
  storageBucket: "melttheice-916f0.firebasestorage.app",
  messagingSenderId: "1018729790888",
  appId: "1:1018729790888:web:977a9e81a63b4b8a38b19d",
  measurementId: "G-87G46WJ3K7"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firestore
export const db: Firestore = getFirestore(app);

// Initialize Analytics (only in browser)
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
