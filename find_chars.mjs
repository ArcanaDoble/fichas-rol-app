
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

async function findChars() {
    console.log("Checking 'classes' collection...");
    const classesSnap = await getDocs(collection(db, "classes"));
    classesSnap.docs.forEach(docSnap => {
        const name = (docSnap.data().name || "").toLowerCase();
        if (name.includes("yerma") || name.includes("yuzuu") || name.includes("yuuzu")) {
            console.log(`FOUND in 'classes': ${docSnap.data().name} | ID: ${docSnap.id}`);
        }
    });

    console.log("Checking 'players' collection...");
    const playersSnap = await getDocs(collection(db, "players"));
    playersSnap.docs.forEach(docSnap => {
        const name = (docSnap.data().name || docSnap.id || "").toLowerCase();
        if (name.includes("yerma") || name.includes("yuzuu") || name.includes("yuuzu")) {
            console.log(`FOUND in 'players': ${docSnap.data().name || docSnap.id} | ID: ${docSnap.id}`);
        }
    });
    process.exit(0);
}

findChars().catch(err => {
    console.error(err);
    process.exit(1);
});
