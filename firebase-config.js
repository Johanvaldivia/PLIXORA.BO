// =============================================================
// ⚙️  CONFIGURACIÓN DE FIREBASE - PLIXORA.BO
// =============================================================
// INSTRUCCIONES PASO A PASO:
//
// 1. Ve a https://console.firebase.google.com/
// 2. Inicia sesión con tu cuenta de Google
// 3. Haz clic en "Crear un proyecto"
// 4. Ponle el nombre: plixora-ventas
// 5. Desactiva Google Analytics (no lo necesitas) → Crear proyecto
// 6. Ya dentro del proyecto, haz clic en el ícono "</>  Web"
// 7. Pon el nombre de la app: plixora-bo → clic en "Registrar app"
// 8. Verás un bloque de código con tus datos. COPIA cada valor
//    y pégalo en los campos de abajo (solo el texto entre comillas).
//
// TAMBIÉN NECESITAS ACTIVAR FIRESTORE:
// 1. En el menú izquierdo, haz clic en "Firestore Database"
// 2. Haz clic en "Crear base de datos"
// 3. Selecciona "Comenzar en modo de prueba" → Siguiente → Listo
// 
// 4. LUEGO REEMPLAZA LAS REGLAS DE FIRESTORE CON ESTO:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     // Solo usuarios autenticados pueden leer/escribir
//     match /{document=**} {
//       allow read, write: if request.auth != null;
//     }
//   }
// }
// =============================================================

const firebaseConfig = {
    apiKey:            "AIzaSyDHtkR0VmeODXB_x2Jyyv-Id75G7r7L3IA",
    authDomain:        "plixora-ventas.firebaseapp.com",
    projectId:         "plixora-ventas",
    storageBucket:     "plixora-ventas.firebasestorage.app",
    messagingSenderId: "731331909277",
    appId:             "1:731331909277:web:4fb6e3ceb99f149215e674"
};

// =============================================================
// ⚠️  NO MODIFIQUES NADA MÁS ABAJO DE ESTA LÍNEA
// =============================================================

// Detectar si el usuario ya llenó sus datos
const FIREBASE_CONFIGURED = !Object.values(firebaseConfig).some(v => v.startsWith("PEGA_"));

if (FIREBASE_CONFIGURED) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase conectado correctamente.");
} else {
    console.warn("⚠️ Firebase no configurado. Usando almacenamiento local solamente. Abre el archivo firebase-config.js y sigue las instrucciones.");
}
