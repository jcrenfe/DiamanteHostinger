import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Configuración de tu proyecto Firebase
export const firebaseConfig = {
    apiKey: "AIzaSyDNWHYREyyCz8-tXEVrSbCIr0bFa8MrnzU",
    authDomain: "diamante-f70f4.firebaseapp.com",
    projectId: "diamante-f70f4",
    storageBucket: "diamante-f70f4.appspot.com",
    messagingSenderId: "257504398244",
    appId: "1:257504398244:web:65afd7a599dad8434a4f31"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// IMPORTANTE: Restauramos el ID de la base de datos "diamante-bd"
export const db = getFirestore(app, "diamante-bd");
export const storage = getStorage(app);
export const functions = getFunctions(app, "europe-southwest1");

// Solo el backend (Functions) usa el emulador local
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    connectFunctionsEmulator(functions, "localhost", 5001);
}

