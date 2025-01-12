// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCWXpfQuAB06Ebqms6_TpE_p31CtyfPv1c",
    authDomain: "esports-adda-1f4ca.firebaseapp.com",
    databaseURL: "https://esports-adda-1f4ca-default-rtdb.firebaseio.com",
    projectId: "esports-adda-1f4ca",
    storageBucket: "esports-adda-1f4ca.appspot.com",
    messagingSenderId: "1016111341367",
    appId: "1:1016111341367:web:165be8fd6210b0c49104b2"
};

// Initialize Firebase if not already initialized
if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK not found. Make sure to include the Firebase scripts before this file.');
}

// Get existing Firebase app or initialize new one
let app;
try {
    app = firebase.app();
} catch (e) {
    app = firebase.initializeApp(firebaseConfig);
}

// Export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Export the app and services
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDB = db;
