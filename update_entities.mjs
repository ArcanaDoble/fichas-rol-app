
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";

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

async function updateEntities() {
    const names = ["Yerma", "Yuzuu", "Yuuzu"];
    const collections = ["players", "classes"];

    for (const colName of collections) {
        console.log(`Scanning collection: ${colName}`);
        const snapshot = await getDocs(collection(db, colName));

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const docName = data.name || docSnap.id;

            // Check if name matches any of our targets (case insensitive)
            const match = names.find(n => docName.toLowerCase() === n.toLowerCase());

            if (match) {
                console.log(`Updating ${docName} (ID: ${docSnap.id}) in ${colName}...`);

                // Preserve existing items in bonus/reaction if any, but strictly update movement/action
                const currentActionData = data.actionData || {};

                const updatedActionData = {
                    ...currentActionData,
                    movement: NEW_ACTIONS.movement,
                    action: NEW_ACTIONS.action,
                    // Keep existing bonus/reaction if they exist, else empty
                    bonus: currentActionData.bonus || [],
                    reaction: currentActionData.reaction || []
                };

                await updateDoc(doc(db, colName, docSnap.id), {
                    actionData: updatedActionData
                });
                console.log(`SUCCESS: Updated ${docName}`);
            }
        }
    }
    process.exit(0);
}

updateEntities().catch(err => {
    console.error(err);
    process.exit(1);
});
