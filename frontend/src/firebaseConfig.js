import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAoERlJrGzNjEgj_wwtO9TtLdYh6ZZSUIE",
  authDomain: "flutter-gp-dc346.firebaseapp.com",
  projectId: "flutter-gp-dc346",
  storageBucket: "flutter-gp-dc346.firebasestorage.app",
  messagingSenderId: "331425841246",
  appId: "1:331425841246:web:fc0b52b15bc1d7c32fb4cf",
  measurementId: "G-85C39J7SS8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth and Google Provider
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();