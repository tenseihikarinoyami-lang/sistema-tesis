const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "thesisforge-ai-obelisco",
  appId: "1:292652358618:web:8e1c988b172048f386fee3",
  storageBucket: "thesisforge-ai-obelisco.firebasestorage.app",
  apiKey: "AIzaSyBx_CyVRzdSh-KkCJ5xyWrzFE-QY_CO-X0",
  authDomain: "thesisforge-ai-obelisco.firebaseapp.com",
  messagingSenderId: "292652358618",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function setupAdmin() {
  const email = "admin@obelisco.ai";
  const password = "admin123";
  
  try {
    console.log("Creando usuario administrador...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await setDoc(doc(db, "users", user.uid), {
      email: email,
      role: "admin",
      displayName: "Administrador Principal",
      createdAt: new Date().toISOString()
    });
    
    console.log("¡Administrador creado con éxito!");
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("El usuario ya existe. Actualizando permisos...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: email,
        role: "admin",
        displayName: "Administrador Principal",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log("¡Permisos de administrador actualizados!");
    } else {
      console.error("Error:", error.message);
    }
  }
  process.exit();
}

setupAdmin();
