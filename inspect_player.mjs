
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: 'AIzaSyDMX1EdXlacksOLUhUzYxgT627Ud-nROCU',
    authDomain: 'base-de-datos-noma.firebaseapp.com',
    projectId: 'base-de-datos-noma',
    storageBucket: 'base-de-datos-noma.firebasestorage.app',
    messagingSenderId: '485513400814',
    appId: '1:485513400814:web:c0c052fafebc41a2eafeff',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspect(id) {
    const d = await getDoc(doc(db, "players", id));
    console.log(`Data for ${id}:`, JSON.stringify(d.data(), null, 2));
    process.exit(0);
}

inspect(process.argv[2]).catch(err => {
    console.error(err);
    process.exit(1);
});
