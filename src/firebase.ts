import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAk4_YYQzg9iVfehe5RzX6jCa07jaTVLNo",
  authDomain: "gen-lang-client-0946017819.firebaseapp.com",
  projectId: "gen-lang-client-0946017819",
  storageBucket: "gen-lang-client-0946017819.firebasestorage.app",
  messagingSenderId: "338540336724",
  appId: "1:338540336724:web:969fb8e61f467ef9f4ffc1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Use the custom database ID provided in the config
const db = getFirestore(app, "ai-studio-bankstatementana-568ce69f-30c5-4771-9a0c-8fa8ac94317f");

const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged };
export type { User };
