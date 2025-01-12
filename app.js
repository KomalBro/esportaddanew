// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA5gsG2MpkF3ILYWIj7BNrqp7e7b9j4O_k",
    authDomain: "esportadda.firebaseapp.com",
    projectId: "esportadda",
    storageBucket: "esportadda.appspot.com",
    messagingSenderId: "1072943662269",
    appId: "1:1072943662269:web:5a3d3d9646c98afbcf0c2c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Cache for games and tournaments
const gamesCache = new Map();
const tournamentsCache = new Map();
let currentUser = null;
let selectedTournament = null;

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData();
        showSection('games');
    } else {
        window.location.href = 'login.html';
    }
});

// Navigation Functions
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific content
        switch(sectionId) {
            case 'games':
                loadGames();
                break;
            case 'tournaments':
                loadTournaments();
                break;
            case 'profile':
                loadProfile();
                break;
        }
    }
}

// Games Functions
async function loadGames() {
    try {
        const gamesContainer = document.getElementById('games-container');
        gamesContainer.innerHTML = '<div class="loading">Loading games...</div>';
        
        const snapshot = await db.collection('games').where('status', '==', 'active').get();
        
        if (snapshot.empty) {
            gamesContainer.innerHTML = '<div class="no-data">No games available</div>';
            return;
        }

        gamesContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const game = doc.data();
            gamesCache.set(doc.id, game);
            
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            gameCard.innerHTML = `
                <img src="${game.imageUrl || 'placeholder.jpg'}" alt="${game.name}" class="game-image">
                <div class="game-content">
                    <h3 class="game-title">${game.name}</h3>
                    <p class="game-description">${game.description || 'No description available'}</p>
                    <button class="btn btn-outline" onclick="viewGameTournaments('${doc.id}')">View Tournaments</button>
                </div>
            `;
            gamesContainer.appendChild(gameCard);
        });
    } catch (error) {
        console.error('Error loading games:', error);
        showNotification('Error loading games', 'error');
    }
}

// Tournaments Functions
async function loadTournaments() {
    try {
        const tournamentsContainer = document.getElementById('tournaments-container');
        tournamentsContainer.innerHTML = '<div class="loading">Loading tournaments...</div>';
        
        const snapshot = await db.collection('tournaments')
            .where('status', 'in', ['upcoming', 'active'])
            .orderBy('startDate')
            .get();
        
        if (snapshot.empty) {
            tournamentsContainer.innerHTML = '<div class="no-data">No tournaments available</div>';
            return;
        }

        tournamentsContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const tournament = doc.data();
            tournamentsCache.set(doc.id, tournament);
            
            const tournamentCard = document.createElement('div');
            tournamentCard.className = 'tournament-card';
            tournamentCard.innerHTML = `
                <div class="tournament-info">
                    <h3>${tournament.name}</h3>
                    <div class="tournament-meta">
                        <div class="meta-item">
                            <i class="fas fa-gamepad"></i>
                            <span>${tournament.game || 'Game not specified'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-coins"></i>
                            <span>Entry: ₹${tournament.entryFee}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-trophy"></i>
                            <span>Prize: ₹${tournament.prizePool}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${tournament.players?.length || 0}/${tournament.maxPlayers} Players</span>
                        </div>
                    </div>
                    <p><i class="fas fa-calendar"></i> Starts: ${new Date(tournament.startDate).toLocaleString()}</p>
                </div>
                <button class="btn btn-primary" onclick="showTournamentDetails('${doc.id}')">Join Now</button>
            `;
            tournamentsContainer.appendChild(tournamentCard);
        });
    } catch (error) {
        console.error('Error loading tournaments:', error);
        showNotification('Error loading tournaments', 'error');
    }
}

async function viewGameTournaments(gameId) {
    showSection('tournaments');
    const tournamentsContainer = document.getElementById('tournaments-container');
    tournamentsContainer.innerHTML = '<div class="loading">Loading tournaments...</div>';
    
    try {
        const snapshot = await db.collection('tournaments')
            .where('gameId', '==', gameId)
            .where('status', 'in', ['upcoming', 'active'])
            .orderBy('startDate')
            .get();
        
        if (snapshot.empty) {
            tournamentsContainer.innerHTML = '<div class="no-data">No tournaments available for this game</div>';
            return;
        }

        tournamentsContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const tournament = doc.data();
            tournamentsCache.set(doc.id, tournament);
            
            const tournamentCard = document.createElement('div');
            tournamentCard.className = 'tournament-card';
            // Same tournament card HTML as in loadTournaments()
            tournamentCard.innerHTML = `
                <div class="tournament-info">
                    <h3>${tournament.name}</h3>
                    <div class="tournament-meta">
                        <div class="meta-item">
                            <i class="fas fa-gamepad"></i>
                            <span>${tournament.game || 'Game not specified'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-coins"></i>
                            <span>Entry: ₹${tournament.entryFee}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-trophy"></i>
                            <span>Prize: ₹${tournament.prizePool}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${tournament.players?.length || 0}/${tournament.maxPlayers} Players</span>
                        </div>
                    </div>
                    <p><i class="fas fa-calendar"></i> Starts: ${new Date(tournament.startDate).toLocaleString()}</p>
                </div>
                <button class="btn btn-primary" onclick="showTournamentDetails('${doc.id}')">Join Now</button>
            `;
            tournamentsContainer.appendChild(tournamentCard);
        });
    } catch (error) {
        console.error('Error loading game tournaments:', error);
        showNotification('Error loading tournaments', 'error');
    }
}

function showTournamentDetails(tournamentId) {
    const tournament = tournamentsCache.get(tournamentId);
    if (!tournament) {
        showNotification('Tournament not found', 'error');
        return;
    }

    selectedTournament = tournamentId;
    const modal = document.getElementById('tournamentModal');
    const detailsContainer = document.getElementById('tournament-details');
    
    detailsContainer.innerHTML = `
        <h3>${tournament.name}</h3>
        <div class="tournament-meta">
            <p><strong>Game:</strong> ${tournament.game || 'Not specified'}</p>
            <p><strong>Entry Fee:</strong> ₹${tournament.entryFee}</p>
            <p><strong>Prize Pool:</strong> ₹${tournament.prizePool}</p>
            <p><strong>Players:</strong> ${tournament.players?.length || 0}/${tournament.maxPlayers}</p>
            <p><strong>Start Date:</strong> ${new Date(tournament.startDate).toLocaleString()}</p>
        </div>
        <div class="tournament-rules">
            <h4>Tournament Rules</h4>
            <p>${tournament.rules || 'No specific rules provided.'}</p>
        </div>
    `;
    
    modal.style.display = 'block';
    
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

async function registerForTournament() {
    if (!selectedTournament || !currentUser) {
        showNotification('Unable to register for tournament', 'error');
        return;
    }

    try {
        const tournamentRef = db.collection('tournaments').doc(selectedTournament);
        const tournament = tournamentsCache.get(selectedTournament);
        
        // Check if user is already registered
        if (tournament.players?.includes(currentUser.uid)) {
            showNotification('You are already registered for this tournament', 'info');
            return;
        }
        
        // Check if tournament is full
        if (tournament.players?.length >= tournament.maxPlayers) {
            showNotification('Tournament is full', 'error');
            return;
        }

        // Add user to tournament players
        await tournamentRef.update({
            players: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
        });

        showNotification('Successfully registered for tournament!', 'success');
        document.getElementById('tournamentModal').style.display = 'none';
        loadTournaments(); // Refresh tournaments list
    } catch (error) {
        console.error('Error registering for tournament:', error);
        showNotification('Error registering for tournament', 'error');
    }
}

// Profile Functions
async function loadProfile() {
    if (!currentUser) return;

    const profileContainer = document.getElementById('profile-container');
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data() || {};
        
        profileContainer.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <img src="${userData.photoURL || 'https://via.placeholder.com/150'}" alt="Profile" class="profile-image">
                    <h2>${userData.displayName || 'User'}</h2>
                    <p>${userData.email}</p>
                </div>
                <div class="profile-stats">
                    <div class="stat-item">
                        <span class="stat-value">${userData.tournamentsPlayed || 0}</span>
                        <span class="stat-label">Tournaments Played</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${userData.tournamentsWon || 0}</span>
                        <span class="stat-label">Tournaments Won</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">₹${userData.totalEarnings || 0}</span>
                        <span class="stat-label">Total Earnings</span>
                    </div>
                </div>
                <div class="profile-details">
                    <h3>Account Details</h3>
                    <p><strong>Username:</strong> ${userData.username || 'Not set'}</p>
                    <p><strong>Phone:</strong> ${userData.phone || 'Not set'}</p>
                    <p><strong>Member Since:</strong> ${new Date(userData.createdAt?.toDate()).toLocaleDateString()}</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Error loading profile data', 'error');
    }
}

// User Data Functions
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) {
            // Create user document if it doesn't exist
            await db.collection('users').doc(currentUser.uid).set({
                email: currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                tournamentsPlayed: 0,
                tournamentsWon: 0,
                totalEarnings: 0
            });
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
        showNotification('Error signing out', 'error');
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Show games section by default
    showSection('games');
});
