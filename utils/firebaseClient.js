// utils/firebaseClient.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB5yHXTx6TxerJncWgNlXQXgGOd_pdskhQ",
  authDomain: "warehouse-manager-67fe8.firebaseapp.com",
  projectId: "warehouse-manager-67fe8",
  messagingSenderId: "922248613147",
  appId: "1:922248613147:web:68731071330b32950457be"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export { auth };

