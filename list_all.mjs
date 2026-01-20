
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function listAll() {
    console.log("--- CLASSES ---");
    const classesSnap = await getDocs(collection(db, "classes"));
    classesSnap.docs.forEach(d => console.log(`C: ${d.data().name} (${d.id})`));

    console.log("--- PLAYERS ---");
    const playersSnap = await getDocs(collection(db, "players"));
    playersSnap.docs.forEach(d => console.log(`P: ${d.data().name || d.id} (${d.id})`));
    process.exit(0);
}

listAll().catch(err => {
    console.error(err);
    process.exit(1);
});
