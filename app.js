// Get Firebase instances
const auth = firebase.auth();
const db = firebase.firestore();

// Cache for games and tournaments
const gamesCache = new Map();
const tournamentsCache = new Map();
let currentUser = null;
let selectedTournament = null;

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

// Logout function
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (!user && !window.location.pathname.includes('login.html')) {
        // Only redirect to login if we're not already on the login page
        window.location.href = 'login.html';
        return;
    }
    
    if (user) {
        currentUser = user;
        loadUserData();
        showSection('games');
    }
});

// Games Functions
async function loadGames() {
    try {
        const gamesContainer = document.getElementById('games-container');
        if (!gamesContainer) return;
        
        gamesContainer.innerHTML = '<div class="loading">Loading games...</div>';
        
        const snapshot = await db.collection('games')
            .where('active', '==', true)
            .get();
        
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
                <img src="${game.icon || 'placeholder.jpg'}" alt="${game.name}" class="game-image">
                <div class="game-content">
                    <h3 class="game-title">${game.name}</h3>
                    <p class="game-description">Platform: ${game.platform || 'All Platforms'}</p>
                    <button class="btn btn-primary" onclick="viewGameTournaments('${doc.id}')">View Tournaments</button>
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
        if (!tournamentsContainer) return;
        
        tournamentsContainer.innerHTML = '<div class="loading">Loading tournaments...</div>';
        
        const now = firebase.firestore.Timestamp.now();
        const snapshot = await db.collection('tournaments')
            .where('status', '==', 'active')
            .orderBy('startDate', 'asc')
            .get();
        
        if (snapshot.empty) {
            tournamentsContainer.innerHTML = '<div class="no-data">No active tournaments available</div>';
            return;
        }

        tournamentsContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const tournament = doc.data();
            tournamentsCache.set(doc.id, tournament);
            
            const startDate = tournament.startDate ? new Date(tournament.startDate.seconds * 1000) : new Date();
            const currentPlayers = tournament.currentPlayers || 0;
            const maxPlayers = tournament.maxPlayers || 0;
            
            const tournamentCard = document.createElement('div');
            tournamentCard.className = 'tournament-card';
            tournamentCard.innerHTML = `
                <div class="tournament-info">
                    <h3>${tournament.name}</h3>
                    <div class="tournament-meta">
                        <div class="meta-item">
                            <i class="fas fa-gamepad"></i>
                            <span>${tournament.game}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${startDate.toLocaleString()}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${currentPlayers}/${maxPlayers} Players</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-ticket-alt"></i>
                            <span>Entry: ₹${tournament.entryFee}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-trophy"></i>
                            <span>Prize: ₹${tournament.prizePool}</span>
                        </div>
                    </div>
                    <p>${tournament.rules || 'No specific rules'}</p>
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
    try {
        const game = gamesCache.get(gameId);
        if (!game) {
            showNotification('Game not found', 'error');
            return;
        }

        const tournamentsContainer = document.getElementById('tournaments-container');
        if (!tournamentsContainer) return;
        
        tournamentsContainer.innerHTML = '<div class="loading">Loading tournaments...</div>';
        
        const snapshot = await db.collection('tournaments')
            .where('game', '==', game.name)
            .where('status', '==', 'active')
            .orderBy('startDate', 'asc')
            .get();
        
        if (snapshot.empty) {
            tournamentsContainer.innerHTML = `<div class="no-data">No active tournaments for ${game.name}</div>`;
            return;
        }

        tournamentsContainer.innerHTML = `
            <div class="hero-section">
                <h1 class="hero-title">${game.name} Tournaments</h1>
                <p class="hero-subtitle">Join tournaments and compete with players worldwide</p>
            </div>
            <div id="tournaments-list"></div>
        `;

        const tournamentsList = document.getElementById('tournaments-list');
        snapshot.forEach(doc => {
            const tournament = doc.data();
            tournamentsCache.set(doc.id, tournament);
            
            const startDate = tournament.startDate ? new Date(tournament.startDate.seconds * 1000) : new Date();
            const currentPlayers = tournament.currentPlayers || 0;
            const maxPlayers = tournament.maxPlayers || 0;
            
            const tournamentCard = document.createElement('div');
            tournamentCard.className = 'tournament-card';
            tournamentCard.innerHTML = `
                <div class="tournament-info">
                    <h3>${tournament.name}</h3>
                    <div class="tournament-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${startDate.toLocaleString()}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-users"></i>
                            <span>${currentPlayers}/${maxPlayers} Players</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-ticket-alt"></i>
                            <span>Entry: ₹${tournament.entryFee}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-trophy"></i>
                            <span>Prize: ₹${tournament.prizePool}</span>
                        </div>
                    </div>
                    <p>${tournament.rules || 'No specific rules'}</p>
                </div>
                <button class="btn btn-primary" onclick="registerForTournament('${doc.id}')">Join Now</button>
            `;
            tournamentsList.appendChild(tournamentCard);
        });

        // Show tournaments section
        showSection('tournaments');
    } catch (error) {
        console.error('Error loading game tournaments:', error);
        showNotification('Error loading tournaments', 'error');
    }
}

// Show tournament details
async function showTournamentDetails(tournamentId) {
    try {
        const tournament = tournamentsCache.get(tournamentId);
        if (!tournament) {
            const doc = await db.collection('tournaments').doc(tournamentId).get();
            if (!doc.exists) {
                showNotification('Tournament not found', 'error');
                return;
            }
            tournament = doc.data();
        }

        const modal = document.getElementById('tournamentModal');
        const modalContent = modal.querySelector('#tournament-details');
        
        modalContent.innerHTML = `
            <h3>${tournament.name}</h3>
            <p><strong>Game:</strong> ${tournament.game}</p>
            <p><strong>Entry Fee:</strong> ₹${tournament.entryFee}</p>
            <p><strong>Prize Pool:</strong> ₹${tournament.prizePool}</p>
            <p><strong>Players:</strong> ${tournament.currentPlayers || 0}/${tournament.maxPlayers}</p>
            <p><strong>Start Date:</strong> ${new Date(tournament.startDate.seconds * 1000).toLocaleString()}</p>
            <p><strong>Rules:</strong> ${tournament.rules || 'No specific rules'}</p>
        `;
        
        modal.style.display = 'block';
        selectedTournament = tournamentId;
    } catch (error) {
        console.error('Error showing tournament details:', error);
        showNotification('Error loading tournament details', 'error');
    }
}

// Register for tournament
async function registerForTournament(tournamentId) {
    if (!currentUser) {
        showNotification('Please log in to register for tournaments', 'error');
        return;
    }

    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        const tournamentRef = db.collection('tournaments').doc(tournamentId);

        const result = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const tournamentDoc = await transaction.get(tournamentRef);

            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            if (!tournamentDoc.exists) {
                throw new Error('Tournament not found');
            }

            const userData = userDoc.data();
            const tournamentData = tournamentDoc.data();
            const currentPlayers = tournamentData.currentPlayers || 0;

            // Check tournament capacity
            if (currentPlayers >= tournamentData.maxPlayers) {
                throw new Error('Tournament is full');
            }

            // Check if user has already registered
            const registrations = await db.collection('tournament_registrations')
                .where('userId', '==', currentUser.uid)
                .where('tournamentId', '==', tournamentId)
                .get();

            if (!registrations.empty) {
                throw new Error('Already registered for this tournament');
            }

            // Check user balance
            if (userData.balance < tournamentData.entryFee) {
                throw new Error('Insufficient balance');
            }

            // Create registration document
            const registrationRef = db.collection('tournament_registrations').doc();
            const registrationData = {
                userId: currentUser.uid,
                tournamentId: tournamentId,
                registeredAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'registered',
                entryFee: tournamentData.entryFee
            };

            // Update tournament players count
            transaction.update(tournamentRef, {
                currentPlayers: firebase.firestore.FieldValue.increment(1)
            });

            // Deduct entry fee from user balance
            transaction.update(userRef, {
                balance: firebase.firestore.FieldValue.increment(-tournamentData.entryFee)
            });

            // Create transaction record
            const transactionRef = db.collection('transactions').doc();
            const transactionData = {
                userId: currentUser.uid,
                tournamentId: tournamentId,
                amount: -tournamentData.entryFee,
                type: 'tournament_entry',
                status: 'success',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                description: `Entry fee for tournament: ${tournamentData.name}`
            };

            // Set registration and transaction documents
            transaction.set(registrationRef, registrationData);
            transaction.set(transactionRef, transactionData);

            return {
                tournamentName: tournamentData.name,
                entryFee: tournamentData.entryFee
            };
        });

        showNotification(`Successfully registered for ${result.tournamentName}. Entry fee: ₹${result.entryFee}`, 'success');
        loadUserData(); // Refresh user data
        viewGameTournaments(selectedTournament.gameId); // Refresh tournament view
    } catch (error) {
        console.error('Error registering for tournament:', error);
        showNotification(error.message, 'error');
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
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) {
            // Create user document if it doesn't exist
            await db.collection('users').doc(currentUser.uid).set({
                email: currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                balance: 0,
                gamesPlayed: 0,
                totalWinnings: 0,
                username: currentUser.email.split('@')[0]
            });
        }
        
        const userData = userDoc.data();
        if (userData) {
            // Update profile UI
            const profileContainer = document.getElementById('profile-container');
            if (profileContainer) {
                profileContainer.innerHTML = `
                    <div class="profile-card">
                        <h2>${userData.username || userData.email}</h2>
                        <div class="wallet-section">
                            <h3>Wallet Balance: ₹${userData.balance || 0}</h3>
                            <button class="btn btn-primary" onclick="showAddMoneyModal()">Add Money</button>
                        </div>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <i class="fas fa-gamepad"></i>
                                <span>Games Played: ${userData.gamesPlayed || 0}</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-trophy"></i>
                                <span>Total Winnings: ₹${userData.totalWinnings || 0}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Error loading user data', 'error');
    }
}

// Add money to wallet
async function addMoneyToWallet(amount) {
    if (!currentUser) {
        showNotification('Please log in to add money', 'error');
        return;
    }

    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        
        // Create a transaction
        const transactionRef = db.collection('transactions').doc();
        const transactionData = {
            userId: currentUser.uid,
            amount: amount,
            type: 'deposit',
            status: 'success',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            description: 'Wallet money added'
        };

        await db.runTransaction(async (transaction) => {
            // Update user balance
            transaction.update(userRef, {
                balance: firebase.firestore.FieldValue.increment(amount)
            });
            
            // Create transaction record
            transaction.set(transactionRef, transactionData);
        });

        showNotification(`Successfully added ₹${amount} to your wallet`, 'success');
        loadUserData(); // Refresh user data
    } catch (error) {
        console.error('Error adding money:', error);
        showNotification('Error adding money to wallet', 'error');
    }
}

// Show add money modal
function showAddMoneyModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Add Money to Wallet</h2>
            <div class="amount-options">
                <button class="amount-btn" data-amount="100">₹100</button>
                <button class="amount-btn" data-amount="200">₹200</button>
                <button class="amount-btn" data-amount="500">₹500</button>
                <button class="amount-btn" data-amount="1000">₹1000</button>
            </div>
            <div class="custom-amount">
                <input type="number" id="customAmount" placeholder="Enter custom amount" min="100" max="10000">
                <button class="btn btn-primary" onclick="addCustomAmount()">Add Amount</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Add event listeners
    modal.querySelector('.close').onclick = () => {
        modal.style.display = 'none';
        modal.remove();
    };
    
    modal.querySelectorAll('.amount-btn').forEach(btn => {
        btn.onclick = () => {
            const amount = parseInt(btn.dataset.amount);
            addMoneyToWallet(amount);
            modal.style.display = 'none';
            modal.remove();
        };
    });
    
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
            modal.remove();
        }
    };
}

// Add custom amount
function addCustomAmount() {
    const input = document.getElementById('customAmount');
    const amount = parseInt(input.value);
    
    if (isNaN(amount) || amount < 100 || amount > 10000) {
        showNotification('Please enter an amount between ₹100 and ₹10000', 'error');
        return;
    }
    
    addMoneyToWallet(amount);
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.style.display = 'none';
        modal.remove();
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

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Show games section by default
    showSection('games');
});
