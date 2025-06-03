import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDMX1EdXlacksOLUhUzYxgT627Ud-nROCU",
  authDomain: "base-de-datos-noma.firebaseapp.com",
  projectId: "base-de-datos-noma",
  storageBucket: "base-de-datos-noma.appspot.com",
  messagingSenderId: "485513400814",
  appId: "1:485513400814:web:c0c052fafebc41a2eafeff",
  measurementId: "G-05P2J4RLY8",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
