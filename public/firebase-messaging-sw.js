importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBMMtABaD6LKq77FOCtaEU94a6wLyh813w",
  authDomain: "melttheice-916f0.firebaseapp.com",
  projectId: "melttheice-916f0",
  storageBucket: "melttheice-916f0.firebasestorage.app",
  messagingSenderId: "1018729790888",
  appId: "1:1018729790888:web:977a9e81a63b4b8a38b19d",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
