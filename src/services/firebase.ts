// firebase.ts

// Import the functions you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // optional, if using auth
import { getStorage } from "firebase/storage"; // optional, if using storage
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA5ld_osYs-e3CrX2CSmY9AhYn0tdWcO7c",
  authDomain: "gppo-tracker.firebaseapp.com",
  projectId: "gppo-tracker",
  storageBucket: "gppo-tracker.appspot.com", // ⚠️ small fix here
  messagingSenderId: "94348613341",
  appId: "1:94348613341:web:f1425ef4fc759d6c986d34",
  measurementId: "G-BPYW0103Y8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Optional: only get analytics if it's supported (to avoid issues in SSR environments)
let analytics: ReturnType<typeof getAnalytics> | undefined;
isSupported().then((yes) => {
  if (yes) analytics = getAnalytics(app);
});

// Export useful Firebase services
export const db = getFirestore(app);       // Firestore
export const auth = getAuth(app);          // Firebase Auth
export const storage = getStorage(app);    // Cloud Storage
export const realtimeDb = getDatabase(app, "https://gppo-tracker-default-rtdb.asia-southeast1.firebasedatabase.app");
export { app, analytics };
 