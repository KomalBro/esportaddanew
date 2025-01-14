// Wait for Firebase SDK to load
let firebaseInitialized = false;

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

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
}

// Export the config
window.firebaseConfig = firebaseConfig;

// Initialize services after ensuring Firebase is initialized
function getFirebaseServices() {
    if (typeof firebase !== 'undefined') {
        const auth = firebase.auth();
        const firestore = firebase.firestore();
        let database = null;

        // Export services
        window.auth = auth;
        window.db = firestore;
    }
}

// Try to get services immediately if Firebase is already initialized
getFirebaseServices();

// Also try again when the window loads
window.addEventListener('load', getFirebaseServices);

// Constants
const FIREBASE_CONSTANTS = {
    COLLECTIONS: {
        USERS: 'users',
        GAMES: 'games',
        TOURNAMENTS: 'tournaments',
        TOURNAMENT_REGISTRATIONS: 'tournament_registrations',
        TRANSACTIONS: 'transactions',
        WITHDRAWALS: 'withdrawals',
        ACTIVITIES: 'activities',
        SUPPORT_TICKETS: 'support_tickets',
        SETTINGS: 'settings'
    },
    
    TOURNAMENT_TYPES: {
        SOLO: 'solo',
        DUO: 'duo',
        SQUAD: 'squad'
    },
    
    TOURNAMENT_STATUS: {
        UPCOMING: 'upcoming',
        LIVE: 'live',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    },
    
    TRANSACTION_TYPES: {
        DEPOSIT: 'deposit',
        WITHDRAWAL: 'withdrawal',
        TOURNAMENT_ENTRY: 'tournament_entry',
        TOURNAMENT_WINNING: 'tournament_winning'
    },
    
    WALLET_TYPES: {
        DEPOSIT: 'deposit_balance',
        WINNINGS: 'winning_balance'
    },
    
    ACTIVITY_TYPES: {
        LOGIN: 'login',
        REGISTER: 'register',
        TOURNAMENT_JOIN: 'tournament_join',
        TOURNAMENT_COMPLETE: 'tournament_complete',
        WITHDRAWAL_REQUEST: 'withdrawal_request',
        SUPPORT_TICKET: 'support_ticket'
    },
    
    TICKET_STATUS: {
        OPEN: 'open',
        IN_PROGRESS: 'in_progress',
        RESOLVED: 'resolved',
        CLOSED: 'closed'
    }
};

window.FIREBASE_CONSTANTS = FIREBASE_CONSTANTS;
