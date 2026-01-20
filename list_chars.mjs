
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

async function listChars() {
    console.log("Listing characters...");
    const snapshot = await getDocs(collection(db, "classes"));
    snapshot.docs.forEach(docSnap => {
        console.log(`- ${docSnap.data().name} (ID: ${docSnap.id})`);
    });
    process.exit(0);
}

listChars().catch(err => {
    console.error(err);
    process.exit(1);
});
