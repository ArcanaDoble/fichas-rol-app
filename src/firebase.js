import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Permite usar variables de entorno para ocultar las claves. Si no se
// proporcionan (por ejemplo en entornos de pruebas o desarrollo rápido),
// se utilizan las credenciales por defecto del proyecto para no perder
// la conexión con la misma base de datos.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyDMX1EdXlacksOLUhUzYxgT627Ud-nROCU',
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'base-de-datos-noma.firebaseapp.com',
  projectId:
    process.env.REACT_APP_FIREBASE_PROJECT_ID || 'base-de-datos-noma',
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ||
    'base-de-datos-noma.firebasestorage.app',
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '485513400814',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:485513400814:web:c0c052fafebc41a2eafeff',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-05P2J4RLY8',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
