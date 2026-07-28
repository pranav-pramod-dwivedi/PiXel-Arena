import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCt9F5QpOWjr1GF5-17c6z_Wqlp5i3hlMY",
  authDomain: "pixel-a932c.firebaseapp.com",
  projectId: "pixel-a932c",
  storageBucket: "pixel-a932c.firebasestorage.app",
  messagingSenderId: "851054579024",
  appId: "1:851054579024:web:51ed9b265428cf1414b055",
  measurementId: "G-BNY5DFY8DJ",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };