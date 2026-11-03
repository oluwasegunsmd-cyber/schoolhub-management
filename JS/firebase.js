import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBPoQRjROGiPXCqByMhrACS5TIyn0rHVe8",
  authDomain: "schoolhub-management.firebaseapp.com",
  projectId: "schoolhub-management",
  storageBucket: "schoolhub-management.firebasestorage.app",
  messagingSenderId: "423341982010",
  appId: "1:423341982010:web:577d03bf8d682b3b4a5003"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);