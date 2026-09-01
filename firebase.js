// ============================================================
// FIREBASE SETUP FILE
// This file connects your React app to Firebase (Google's cloud).
// You usually set this up ONCE and don't touch it much after.
// ============================================================

// initializeApp = "start Firebase with my project settings"
import { initializeApp } from "firebase/app"

// getAuth = get the login system (email/password, etc.)
import { getAuth } from "firebase/auth"

// getFirestore = get the database (where posts are saved)
import { getFirestore } from "firebase/firestore"

// firebaseConfig = your project's ID card
// You copy this from Firebase Console → Project Settings → Your apps → Web app
// It tells Firebase WHICH project to connect to (yours is "react-backen")
const firebaseConfig = {
  apiKey: "AIzaSyBBAhaGFY5NktKBi_Ws5gCyt1MMdUqulz8",
  authDomain: "passion2life-mvp.firebaseapp.com",
  projectId: "passion2life-mvp",
  storageBucket: "passion2life-mvp.firebasestorage.app",
  messagingSenderId: "170840910344",
  appId: "1:170840910344:web:fbc784e7372be934ccbfbd",
  measurementId: "G-BE09QK5K7H"
};

// Start Firebase using the config above
const app = initializeApp(firebaseConfig)

// auth = use this in App.jsx for login, register, logout
export const auth = getAuth(app)

// db = use this in App.jsx for saving/loading posts
export const db = getFirestore(app)



