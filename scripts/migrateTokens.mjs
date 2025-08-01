import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteField,
} from 'firebase/firestore';

// Basic Firebase configuration. Replace with environment variables as needed.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateTokens() {
  const pagesSnap = await getDocs(collection(db, 'pages'));

  for (const page of pagesSnap.docs) {
    const data = page.data();
    if (!Array.isArray(data.tokens) || data.tokens.length === 0) continue;

    const tokensCol = collection(doc(db, 'pages', page.id), 'tokens');
    const tokensSnap = await getDocs(tokensCol);
    if (!tokensSnap.empty) continue;

    console.log(`Migrating tokens for page ${page.id}`);

    await Promise.all(
      data.tokens.map((tk) => setDoc(doc(tokensCol, String(tk.id)), tk))
    );

    await updateDoc(doc(db, 'pages', page.id), { tokens: deleteField() });
  }

  console.log('Migration complete');
}

migrateTokens().catch((err) => {
  console.error('Migration failed', err);
});

