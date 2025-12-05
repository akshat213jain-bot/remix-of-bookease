// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "gulshan-ebank",
  "appId": "1:145007468636:web:c98b29bc273d1122c38699",
  "storageBucket": "gulshan-ebank.firebasestorage.app",
  "apiKey": "AIzaSyD7PnddyMwllVcQOMqQCss4ySc_kGp_Ezk",
  "authDomain": "gulshan-ebank.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "145007468636"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
