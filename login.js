// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCWXpfQuAB06Ebqms6_TpE_p31CtyfPv1c",
    authDomain: "esports-adda-1f4ca.firebaseapp.com",
    projectId: "esports-adda-1f4ca",
    storageBucket: "esports-adda-1f4ca.appspot.com",
    messagingSenderId: "1016111341367",
    appId: "1:1016111341367:web:165be8fd6210b0c49104b2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        // Sign in user
        await auth.signInWithEmailAndPassword(email, password);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Login error:', error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
}

// Handle Register
async function handleRegister(e) {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        // Create user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Create user document
        await db.collection('users').doc(user.uid).set({
            email: email,
            balance: 0,
            tournamentsPlayed: 0,
            tournamentsWon: 0,
            totalWinnings: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        window.location.href = 'index.html';
    } catch (error) {
        console.error('Registration error:', error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
}

// Event Listeners
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
    if (user) {
        window.location.href = 'index.html';
    }
});
