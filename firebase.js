// firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

// 1️⃣ Your Firebase config (from .env.local)
const firebaseConfig = {
  apiKey:             process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:         process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId:  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:              process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 2️⃣ Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 3️⃣ Set up a single invisible ReCAPTCHA container
let recaptchaVerifier;
export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (typeof window === 'undefined') return;
  if (recaptchaVerifier) return recaptchaVerifier;

  recaptchaVerifier = new RecaptchaVerifier(
    containerId,
    { size: 'invisible' },
    auth
  );
  return recaptchaVerifier;
}

// 4️⃣ Send OTP
export function sendOtp(phoneNumber) {
  const verifier = setupRecaptcha();
  if (!verifier) {
    throw new Error('Recaptcha container not initialized');
  }
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

