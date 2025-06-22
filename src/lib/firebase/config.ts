
// src/lib/firebase/config.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth'; // Added getAuth

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAg1JUZIHXYwMPP_SGB-RqxP4PEYVQVC9c",
  authDomain: "nailstudio-ai.firebaseapp.com",
  projectId: "nailstudio-ai",
  storageBucket: "nailstudio-ai.firebasestorage.app",
  messagingSenderId: "595554072460",
  appId: "1:595554072460:web:12bfe91870637d3d3cc8a9",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional, for Google Analytics
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth; // Added Auth instance

// Initialize Firebase
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]; // Use the existing app if already initialized
}

db = getFirestore(app);
auth = getAuth(app); // Initialize Auth

export { app, db, auth };
