// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD0vJZYyHLQFFYVEoYCwxLNgk9yAUCr3QA",
  authDomain: "gymmaster-4eee5.firebaseapp.com",
  projectId: "gymmaster-4eee5",
  storageBucket: "gymmaster-4eee5.firebasestorage.app",
  messagingSenderId: "388471952523",
  appId: "1:388471952523:web:450fc750074662bac6b08e",
  measurementId: "G-B77Z52MWTS"
};

// Inicializa Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exporta db y funciones necesarias a nivel global
window.db = db;
window.firestore = {
  collection,
  doc,
  getDocs,
  setDoc
};

