
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

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

const NEW_ACTIONS = {
    movement: [
        { id: 'm1', name: 'Moverse', desc: 'Coste: 🟡 por casilla.' },
        { id: 'm2', name: 'Escalar / Nadar', desc: 'Coste: 🟡 🟡 por casilla.' },
        { id: 'm3', name: 'Levantarse', desc: 'Coste: 🟡' },
        { id: 'm4', name: 'Arrastrarse', desc: 'Coste: 🟡 🟡 por casilla.' },
        { id: 'm5', name: 'Terreno Difícil', desc: 'Coste: + 🟡 por casilla.' }
    ],
    action: [
        { id: 'a1', name: 'Atacar', desc: 'Cuerpo a cuerpo o distancia. Coste del arma.' },
        { id: 'a2', name: 'Lanzar Conjuro', desc: 'Coste del conjuro, medido por: 🟡 + 🔵' },
        { id: 'a3', name: 'Correr (Dash)', desc: '..' },
        { id: 'a4', name: 'Destrabarse', desc: 'Coste: 🟡. Evita ataques de oportunidad.' },
        { id: 'a5', name: 'Esquivar', desc: 'Coste: 🟡. Elimina un dado del ataque.' },
        { id: 'a6', name: 'Ayudar', desc: 'Coste: 🟡 por acción. Levantar, tratar aflicción a un aliado.' },
        { id: 'a7', name: 'Esconderse', desc: 'Coste: 🟡. Prueba de Sigilo.' },
        { id: 'a8', name: 'Esperar', desc: 'Coste: 🟡' },
        { id: 'a9', name: 'Usar Objeto', desc: 'Interactuar con mecanismo/poción.' }
    ],
    bonus: [],
    reaction: []
};

async function updateChars() {
    const chars = ["Yerma", "Yuzuu", "Yuuzu"];
    for (const name of chars) {
        console.log(`Searching for ${name}...`);
        const q = query(collection(db, "classes"), where("name", "==", name));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log(`No character found with name ${name}`);
            continue;
        }

        for (const docSnap of snapshot.docs) {
            console.log(`Updating ${name} (ID: ${docSnap.id})...`);
            const currentData = docSnap.data().actionData || {};
            const updatedActionData = {
                ...currentData,
                movement: NEW_ACTIONS.movement,
                action: NEW_ACTIONS.action
            };

            await updateDoc(doc(db, "classes", docSnap.id), {
                actionData: updatedActionData
            });
            console.log(`Successfully updated ${name}`);
        }
    }
    process.exit(0);
}

updateChars().catch(err => {
    console.error(err);
    process.exit(1);
});
