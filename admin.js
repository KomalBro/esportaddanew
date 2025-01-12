// Firebase configuration
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

// Get Firestore instance
const db = firebase.firestore();

// Cache for data
let gamesCache = new Map();
let tournamentsCache = new Map();
let usersCache = new Map();

// Batch size for queries
const BATCH_SIZE = 10;

// Load data in batches
async function loadGamesInBatches() {
    try {
        const gamesRef = db.collection('games');
        const querySnapshot = await gamesRef.limit(BATCH_SIZE).get();
        
        const gamesList = document.getElementById('games-list');
        if (!gamesList) {
            console.error('Games list element not found');
            return;
        }
        
        gamesList.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const game = doc.data();
            gamesCache.set(doc.id, game);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${game.imageUrl || ''}" alt="${game.name}" style="width: 50px; height: 50px;"></td>
                <td>${game.name}</td>
                <td>${game.description || ''}</td>
                <td>
                    <span class="status-badge ${game.status || 'active'}">${game.status || 'active'}</span>
                </td>
                <td>
                    <button class="action-btn" onclick="editGame('${doc.id}')">Edit</button>
                    <button class="action-btn" onclick="toggleGameStatus('${doc.id}', '${game.status || 'active'}')">
                        ${game.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            `;
            gamesList.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading games:", error);
        showNotification('Error loading games', 'error');
    }
}

async function loadTournamentsInBatches() {
    try {
        const tournamentsRef = db.collection('tournaments');
        const querySnapshot = await tournamentsRef.limit(BATCH_SIZE).get();
        
        const tournamentsList = document.getElementById('tournaments-list');
        if (!tournamentsList) {
            console.error('Tournaments list element not found');
            return;
        }
        
        tournamentsList.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const tournament = doc.data();
            tournamentsCache.set(doc.id, tournament);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tournament.name}</td>
                <td>${tournament.game || ''}</td>
                <td>₹${tournament.entryFee}</td>
                <td>₹${tournament.prizePool}</td>
                <td>${tournament.players?.length || 0}/${tournament.maxPlayers}</td>
                <td>${new Date(tournament.startDate).toLocaleString()}</td>
                <td>
                    <span class="status-badge ${tournament.status}">${tournament.status}</span>
                </td>
                <td>
                    <button class="action-btn" onclick="editTournament('${doc.id}')">Edit</button>
                    <button class="action-btn" onclick="viewTournamentDetails('${doc.id}')">View</button>
                </td>
            `;
            tournamentsList.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading tournaments:", error);
        showNotification('Error loading tournaments', 'error');
    }
}

// Game Management Functions
function editGame(gameId) {
    console.log('Editing game:', gameId);
    const modal = document.getElementById('editGameModal');
    if (!modal) {
        showNotification('Edit game modal not found', 'error');
        return;
    }
    
    modal.style.display = "block";

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = "none";

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    const form = document.getElementById('editGameForm');
    if (!form) {
        showNotification('Edit game form not found', 'error');
        return;
    }

    // Load current game data
    db.collection('games').doc(gameId).get().then((docSnapshot) => {
        if (docSnapshot.exists) {
            const game = docSnapshot.data();
            document.getElementById('editGameName').value = game.name || '';
            document.getElementById('editGameImage').value = game.imageUrl || '';
            document.getElementById('editGameDescription').value = game.description || '';
        } else {
            console.error('Game not found');
            showNotification('Game not found', 'error');
        }
    }).catch((error) => {
        console.error("Error loading game:", error);
        showNotification('Error loading game data', 'error');
    });

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const gameData = {
            name: document.getElementById('editGameName').value,
            imageUrl: document.getElementById('editGameImage').value,
            description: document.getElementById('editGameDescription').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('games').doc(gameId).update(gameData);
            showNotification('Game updated successfully!', 'success');
            modal.style.display = "none";
            loadGames();
        } catch (error) {
            console.error("Error updating game:", error);
            showNotification('Error updating game', 'error');
        }
    };
}

// Tournament Management Functions
function editTournament(tournamentId) {
    console.log('Editing tournament:', tournamentId);
    const modal = document.getElementById('editTournamentModal');
    if (!modal) {
        showNotification('Edit tournament modal not found', 'error');
        return;
    }
    
    modal.style.display = "block";

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = "none";

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Load games for the select dropdown
    const gameSelect = document.getElementById('editTournamentGame');
    if (!gameSelect) {
        showNotification('Game select not found', 'error');
        return;
    }

    // First load games
    db.collection('games').get().then((querySnapshot) => {
        gameSelect.innerHTML = '<option value="">Select a game</option>';
        querySnapshot.forEach((doc) => {
            const game = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = game.name;
            gameSelect.appendChild(option);
        });

        // Then load tournament data
        return db.collection('tournaments').doc(tournamentId).get();
    }).then((docSnapshot) => {
        if (docSnapshot.exists) {
            const tournament = docSnapshot.data();
            document.getElementById('editTournamentName').value = tournament.name || '';
            document.getElementById('editTournamentGame').value = tournament.gameId || '';
            document.getElementById('editEntryFee').value = tournament.entryFee || '';
            document.getElementById('editPrizePool').value = tournament.prizePool || '';
            document.getElementById('editMaxPlayers').value = tournament.maxPlayers || '';
            document.getElementById('editStartDate').value = tournament.startDate || '';
            document.getElementById('editTournamentRules').value = tournament.rules || '';
        } else {
            console.error('Tournament not found');
            showNotification('Tournament not found', 'error');
        }
    }).catch((error) => {
        console.error("Error loading data:", error);
        showNotification('Error loading data', 'error');
    });

    const form = document.getElementById('editTournamentForm');
    if (!form) {
        showNotification('Edit tournament form not found', 'error');
        return;
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const tournamentData = {
            name: document.getElementById('editTournamentName').value,
            gameId: document.getElementById('editTournamentGame').value,
            entryFee: Number(document.getElementById('editEntryFee').value),
            prizePool: Number(document.getElementById('editPrizePool').value),
            maxPlayers: Number(document.getElementById('editMaxPlayers').value),
            startDate: document.getElementById('editStartDate').value,
            rules: document.getElementById('editTournamentRules').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('tournaments').doc(tournamentId).update(tournamentData);
            showNotification('Tournament updated successfully!', 'success');
            modal.style.display = "none";
            loadTournaments();
        } catch (error) {
            console.error("Error updating tournament:", error);
            showNotification('Error updating tournament', 'error');
        }
    };
}

function viewTournamentDetails(tournamentId) {
    console.log('Viewing tournament:', tournamentId);
    db.collection('tournaments').doc(tournamentId).get().then((docSnapshot) => {
        if (!docSnapshot.exists) {
            showNotification('Tournament not found', 'error');
            return;
        }

        const tournament = docSnapshot.data();
        const modal = document.getElementById('viewTournamentModal');
        if (!modal) {
            showNotification('Modal not found', 'error');
            return;
        }

        const modalContent = modal.querySelector('.modal-content');
        modalContent.innerHTML = `
            <span class="close">&times;</span>
            <h2>Tournament Details</h2>
            <div class="tournament-details">
                <p><strong>Name:</strong> ${tournament.name || 'N/A'}</p>
                <p><strong>Game:</strong> ${tournament.game || 'N/A'}</p>
                <p><strong>Entry Fee:</strong> ₹${tournament.entryFee || 0}</p>
                <p><strong>Prize Pool:</strong> ₹${tournament.prizePool || 0}</p>
                <p><strong>Players:</strong> ${tournament.players?.length || 0}/${tournament.maxPlayers || 0}</p>
                <p><strong>Start Date:</strong> ${new Date(tournament.startDate).toLocaleString()}</p>
                <p><strong>Status:</strong> <span class="status-badge ${tournament.status || 'upcoming'}">${tournament.status || 'upcoming'}</span></p>
                <p><strong>Rules:</strong> ${tournament.rules || 'No rules specified'}</p>
            </div>
        `;

        modal.style.display = "block";

        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => modal.style.display = "none";

        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        };
    }).catch((error) => {
        console.error("Error loading tournament details:", error);
        showNotification('Error loading tournament details', 'error');
    });
}

// Load games function
async function loadGames() {
    console.log('Loading games');
    try {
        const gamesList = document.getElementById('games-list');
        if (!gamesList) {
            console.error('Games list element not found');
            return;
        }

        gamesList.innerHTML = '<tr><td colspan="5">Loading games...</td></tr>';
        
        const gamesRef = db.collection('games');
        const snapshot = await gamesRef.get();
        
        if (snapshot.empty) {
            gamesList.innerHTML = '<tr><td colspan="5">No games found</td></tr>';
            return;
        }

        gamesList.innerHTML = '';
        snapshot.forEach(doc => {
            const game = doc.data();
            gamesCache.set(doc.id, game);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${game.imageUrl || ''}" alt="${game.name}" style="width: 50px; height: 50px;"></td>
                <td>${game.name}</td>
                <td>${game.description || ''}</td>
                <td>
                    <span class="status-badge ${game.status || 'active'}">${game.status || 'active'}</span>
                </td>
                <td>
                    <button class="action-btn" onclick="editGame('${doc.id}')">Edit</button>
                    <button class="action-btn" onclick="toggleGameStatus('${doc.id}', '${game.status || 'active'}')">
                        ${game.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            `;
            gamesList.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading games:', error);
        showNotification('Error loading games', 'error');
    }
}

// Load tournaments function
async function loadTournaments() {
    console.log('Loading tournaments');
    try {
        const tournamentsList = document.getElementById('tournaments-list');
        if (!tournamentsList) {
            console.error('Tournaments list element not found');
            return;
        }

        tournamentsList.innerHTML = '<tr><td colspan="8">Loading tournaments...</td></tr>';
        
        const tournamentsRef = db.collection('tournaments');
        const snapshot = await tournamentsRef.get();
        
        if (snapshot.empty) {
            tournamentsList.innerHTML = '<tr><td colspan="8">No tournaments found</td></tr>';
            return;
        }

        tournamentsList.innerHTML = '';
        snapshot.forEach(doc => {
            const tournament = doc.data();
            tournamentsCache.set(doc.id, tournament);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tournament.name}</td>
                <td>${tournament.game || ''}</td>
                <td>₹${tournament.entryFee}</td>
                <td>₹${tournament.prizePool}</td>
                <td>${tournament.players?.length || 0}/${tournament.maxPlayers}</td>
                <td>${new Date(tournament.startDate).toLocaleString()}</td>
                <td>
                    <span class="status-badge ${tournament.status}">${tournament.status}</span>
                </td>
                <td>
                    <button class="action-btn" onclick="editTournament('${doc.id}')">Edit</button>
                    <button class="action-btn" onclick="viewTournamentDetails('${doc.id}')">View</button>
                </td>
            `;
            tournamentsList.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading tournaments:', error);
        showNotification('Error loading tournaments', 'error');
    }
}

// Initialize admin panel
async function initializeAdmin() {
    try {
        // Check if user is logged in and is admin
        const user = await new Promise((resolve, reject) => {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) resolve(user);
                else reject('No user logged in');
            });
        });

        if (user.email !== 'admin@esportadda.com') {
            console.error('User is not an admin');
            window.location.href = 'login.html?type=admin';
            return;
        }

        console.log('Admin access granted');

        // Setup navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.getAttribute('data-section');
                if (section) {
                    showSection(section);
                }
            });
        });

        // Add logout handler
        const logoutBtn = document.getElementById('logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                firebase.auth().signOut().then(() => {
                    window.location.href = 'login.html';
                }).catch((error) => {
                    console.error('Error signing out:', error);
                });
            });
        }

        // Show initial section
        showSection('dashboard');
    } catch (error) {
        console.error('Error initializing admin panel:', error);
        window.location.href = 'login.html?type=admin';
    }
}

// Show section function
function showSection(sectionName) {
    console.log('Showing section:', sectionName);
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionName + 'Section');
    if (selectedSection) {
        selectedSection.style.display = 'block';
    } else {
        console.error('Section not found:', sectionName + 'Section');
    }
    
    // Add active class to selected nav item
    const selectedNavItem = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (selectedNavItem) {
        selectedNavItem.classList.add('active');
    }
    
    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsers();
            break;
        case 'games':
            loadGames();
            break;
        case 'tournaments':
            loadTournaments();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'withdrawals':
            loadWithdrawals();
            break;
        case 'activities':
            loadActivities();
            break;
        case 'support':
            loadSupportTickets();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Initialize admin panel when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing admin panel');
    initializeAdmin();
});

// Load dashboard data
async function loadDashboardData() {
    try {
        const stats = {
            totalUsers: 0,
            activeGames: 0,
            activeTournaments: 0,
            pendingWithdrawals: 0,
            totalTransactions: 0,
            openTickets: 0
        };

        // Get total users
        const usersSnapshot = await db.collection('users').get();
        stats.totalUsers = usersSnapshot.size;

        // Get active games
        const gamesSnapshot = await db.collection('games').where('active', '==', true).get();
        stats.activeGames = gamesSnapshot.size;

        // Get active tournaments
        const tournamentsSnapshot = await db.collection('tournaments').where('status', '==', 'active').get();
        stats.activeTournaments = tournamentsSnapshot.size;

        // Get pending withdrawals
        const withdrawalsSnapshot = await db.collection('withdrawals').where('status', '==', 'pending').get();
        stats.pendingWithdrawals = withdrawalsSnapshot.size;

        // Get total transactions for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const transactionsSnapshot = await db.collection('transactions')
            .where('createdAt', '>=', today)
            .get();
        stats.totalTransactions = transactionsSnapshot.size;

        // Get open support tickets
        const ticketsSnapshot = await db.collection('support_tickets').where('status', '==', 'open').get();
        stats.openTickets = ticketsSnapshot.size;

        // Update dashboard UI
        Object.keys(stats).forEach(key => {
            const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (element) {
                element.textContent = stats[key];
            }
        });

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

// Load users
async function loadUsers() {
    try {
        const usersSnapshot = await db.collection('users').get();
        const usersTableBody = document.querySelector('#users-table tbody');
        usersTableBody.innerHTML = '';
        
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>₹${user.balance || 0}</td>
                <td>${user.gamesPlayed || 0}</td>
                <td>₹${user.totalWinnings || 0}</td>
                <td>
                    <button onclick="viewUserDetails('${doc.id}')" class="action-btn">View</button>
                    <button onclick="toggleUserStatus('${doc.id}', ${!user.isBlocked})" class="action-btn ${user.isBlocked ? 'unblock' : 'block'}">
                        ${user.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users', 'error');
    }
}

// Load transactions
async function loadTransactions() {
    try {
        const transactionsSnapshot = await db.collection('transactions')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        
        const transactionsTableBody = document.querySelector('#transactions-table tbody');
        transactionsTableBody.innerHTML = '';
        
        transactionsSnapshot.forEach(doc => {
            const transaction = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.userId}</td>
                <td>${transaction.type}</td>
                <td>₹${transaction.amount}</td>
                <td><span class="status ${transaction.status.toLowerCase()}">${transaction.status}</span></td>
                <td>${transaction.timestamp.toDate().toLocaleString()}</td>
                <td>
                    <button onclick="viewTransactionDetails('${doc.id}')" class="action-btn">View</button>
                </td>
            `;
            transactionsTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading transactions:', error);
        showNotification('Error loading transactions', 'error');
    }
}

// Load withdrawals
async function loadWithdrawals() {
    try {
        const withdrawalsSnapshot = await db.collection('withdrawals')
            .orderBy('timestamp', 'desc')
            .get();
        
        const withdrawalsTableBody = document.querySelector('#withdrawals-table tbody');
        withdrawalsTableBody.innerHTML = '';
        
        withdrawalsSnapshot.forEach(doc => {
            const withdrawal = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${withdrawal.userId}</td>
                <td>₹${withdrawal.amount}</td>
                <td>${withdrawal.paymentMethod}</td>
                <td><span class="status ${withdrawal.status.toLowerCase()}">${withdrawal.status}</span></td>
                <td>${withdrawal.timestamp.toDate().toLocaleString()}</td>
                <td>
                    <button onclick="viewWithdrawalDetails('${doc.id}')" class="action-btn">View</button>
                    ${withdrawal.status === 'PENDING' ? `
                        <button onclick="processWithdrawal('${doc.id}', 'APPROVED')" class="action-btn approve">Approve</button>
                        <button onclick="processWithdrawal('${doc.id}', 'REJECTED')" class="action-btn reject">Reject</button>
                    ` : ''}
                </td>
            `;
            withdrawalsTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading withdrawals:', error);
        showNotification('Error loading withdrawals', 'error');
    }
}

// Load Settings
async function loadSettings() {
    try {
        const settingsDoc = await db.collection('settings').doc('platform').get();
        const settings = settingsDoc.data() || {};
        
        // Basic Settings
        document.getElementById('platformName').value = settings.platformName || '';
        document.getElementById('appVersion').value = settings.appVersion || '';
        document.getElementById('contactEmail').value = settings.contactEmail || '';
        document.getElementById('supportPhone').value = settings.supportPhone || '';
        document.getElementById('currency').value = settings.currency || 'INR';
        
        // Game Settings
        document.getElementById('minPlayers').value = settings.minPlayers || 2;
        document.getElementById('maxPlayers').value = settings.maxPlayers || 100;
        document.getElementById('platformFee').value = settings.platformFee || 10;
        document.getElementById('registrationBuffer').value = settings.registrationBuffer || 30;
        document.getElementById('resultSubmissionWindow').value = settings.resultSubmissionWindow || 60;
        
        // Reward Settings
        document.getElementById('referralReward').value = settings.referralReward || 0;
        document.getElementById('joiningBonus').value = settings.joiningBonus || 0;
        
        // Withdrawal Settings
        document.getElementById('minWithdrawal').value = settings.minWithdrawal || 100;
        document.getElementById('maxWithdrawal').value = settings.maxWithdrawal || 10000;
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Error loading settings', 'error');
    }
}

// Save Settings
async function saveAllSettings() {
    try {
        const settings = {
            // Basic Settings
            platformName: document.getElementById('platformName').value,
            appVersion: document.getElementById('appVersion').value,
            contactEmail: document.getElementById('contactEmail').value,
            supportPhone: document.getElementById('supportPhone').value,
            currency: document.getElementById('currency').value,
            
            // Game Settings
            minPlayers: Number(document.getElementById('minPlayers').value),
            maxPlayers: Number(document.getElementById('maxPlayers').value),
            platformFee: Number(document.getElementById('platformFee').value),
            registrationBuffer: Number(document.getElementById('registrationBuffer').value),
            resultSubmissionWindow: Number(document.getElementById('resultSubmissionWindow').value),
            
            // Reward Settings
            referralReward: Number(document.getElementById('referralReward').value),
            joiningBonus: Number(document.getElementById('joiningBonus').value),
            
            // Withdrawal Settings
            minWithdrawal: Number(document.getElementById('minWithdrawal').value),
            maxWithdrawal: Number(document.getElementById('maxWithdrawal').value),
            
            // Update timestamp
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: firebase.auth().currentUser.email
        };
        
        await db.collection('settings').doc('platform').set(settings, { merge: true });
        showNotification('Settings saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', 'error');
    }
}

// Load activities
async function loadActivities() {
    try {
        const activitiesRef = db.collection('activity');
        const snapshot = await activitiesRef.orderBy('timestamp', 'desc').limit(50).get();
        
        const activitiesList = document.getElementById('activities-list');
        activitiesList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const activity = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${activity.userId}</td>
                <td>${activity.type}</td>
                <td>${activity.description}</td>
                <td>${activity.deviceInfo ? activity.deviceInfo.device + ' - ' + activity.deviceInfo.browser : 'N/A'}</td>
                <td>${activity.location ? activity.location.city + ', ' + activity.location.country : 'N/A'}</td>
                <td>${activity.timestamp.toDate().toLocaleString()}</td>
            `;
            activitiesList.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading activities:', error);
        showNotification('Error loading activities', 'error');
    }
}

// Load support tickets
async function loadSupportTickets() {
    try {
        const ticketsSnapshot = await db.collection('support_tickets')
            .orderBy('createdAt', 'desc')
            .get();
        
        const supportList = document.getElementById('support-list');
        if (!supportList) {
            console.error('Support list element not found');
            return;
        }

        supportList.innerHTML = '';
        
        ticketsSnapshot.forEach(doc => {
            const ticket = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ticket.ticketId}</td>
                <td>${ticket.userId}</td>
                <td>${ticket.subject}</td>
                <td><span class="status-badge ${ticket.status}">${ticket.status}</span></td>
                <td><span class="priority-badge ${ticket.priority}">${ticket.priority}</span></td>
                <td>${ticket.createdAt ? ticket.createdAt.toDate().toLocaleString() : 'N/A'}</td>
                <td>
                    <button onclick="viewTicket('${doc.id}')" class="action-btn">View</button>
                    ${ticket.status === 'open' ? 
                        `<button onclick="closeTicket('${doc.id}')" class="action-btn">Close</button>` : 
                        ''}
                </td>
            `;
            supportList.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading support tickets:', error);
        showNotification('Error loading support tickets', 'error');
    }
}

// Close support ticket
async function closeTicket(ticketId) {
    try {
        await db.collection('support_tickets').doc(ticketId).update({
            status: 'closed',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification('Ticket closed successfully', 'success');
        loadSupportTickets();
    } catch (error) {
        console.error('Error closing ticket:', error);
        showNotification('Error closing ticket', 'error');
    }
}

// User Management Functions
async function viewUserDetails(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            alert('User not found');
            return;
        }

        const user = userDoc.data();
        // Implement user details modal or navigation
        console.log('User details:', user);
    } catch (error) {
        console.error('Error viewing user details:', error);
        showNotification('Error viewing user details', 'error');
    }
}

async function toggleUserStatus(userId, block) {
    try {
        await db.collection('users').doc(userId).update({
            isBlocked: block,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification(`User ${block ? 'blocked' : 'unblocked'} successfully`, 'success');
        loadUsers(); // Reload users list
    } catch (error) {
        console.error('Error toggling user status:', error);
        showNotification('Error updating user status', 'error');
    }
}

// Game Management Functions
function addGame() {
    const modal = document.getElementById('addGameModal');
    modal.style.display = "block";

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = "none";

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    const form = document.getElementById('addGameForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const gameData = {
            name: document.getElementById('gameName').value,
            imageUrl: document.getElementById('gameImage').value,
            description: document.getElementById('gameDescription').value,
            status: 'active',
            createdAt: new Date().toISOString()
        };

        try {
            await db.collection("games").add(gameData);
            showNotification('Game added successfully!', 'success');
            modal.style.display = "none";
            form.reset();
            loadGames();
        } catch (error) {
            console.error("Error adding game:", error);
            showNotification('Error adding game', 'error');
        }
    };
}

function editGame(gameId) {
    console.log('Editing game:', gameId);
    const modal = document.getElementById('editGameModal');
    if (!modal) {
        showNotification('Edit game modal not found', 'error');
        return;
    }
    
    modal.style.display = "block";

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = "none";

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    const form = document.getElementById('editGameForm');
    if (!form) {
        showNotification('Edit game form not found', 'error');
        return;
    }

    // Load current game data
    db.collection('games').doc(gameId).get().then((docSnapshot) => {
        if (docSnapshot.exists) {
            const game = docSnapshot.data();
            document.getElementById('editGameName').value = game.name || '';
            document.getElementById('editGameImage').value = game.imageUrl || '';
            document.getElementById('editGameDescription').value = game.description || '';
        } else {
            console.error('Game not found');
            showNotification('Game not found', 'error');
        }
    }).catch((error) => {
        console.error("Error loading game:", error);
        showNotification('Error loading game data', 'error');
    });

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const gameData = {
            name: document.getElementById('editGameName').value,
            imageUrl: document.getElementById('editGameImage').value,
            description: document.getElementById('editGameDescription').value,
            updatedAt: new Date().toISOString()
        };

        try {
            await db.collection('games').doc(gameId).update(gameData);
            showNotification('Game updated successfully!', 'success');
            modal.style.display = "none";
            loadGames();
        } catch (error) {
            console.error("Error updating game:", error);
            showNotification('Error updating game', 'error');
        }
    };
}

async function toggleGameStatus(gameId, currentStatus) {
    try {
        await db.collection("games").doc(gameId).update({
            active: !currentStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await loadGames();
        alert('Game status updated successfully!');
    } catch (error) {
        console.error('Error updating game status:', error);
        alert('Error updating game status');
    }
}

// Tournament Management Functions
function addTournament() {
    const modal = document.getElementById('addTournamentModal');
    modal.style.display = "block";

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = "none";

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Load games for the select dropdown
    const gameSelect = document.getElementById('tournamentGame');
    db.collection("games").get().then((querySnapshot) => {
        gameSelect.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const game = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = game.name;
            gameSelect.appendChild(option);
        });
    });

    const form = document.getElementById('addTournamentForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const tournamentData = {
            name: document.getElementById('tournamentName').value,
            gameId: document.getElementById('tournamentGame').value,
            entryFee: Number(document.getElementById('entryFee').value),
            prizePool: Number(document.getElementById('prizePool').value),
            maxPlayers: Number(document.getElementById('maxPlayers').value),
            startDate: document.getElementById('startDate').value,
            rules: document.getElementById('tournamentRules').value,
            status: 'upcoming',
            createdAt: new Date().toISOString(),
            players: []
        };

        try {
            await db.collection("tournaments").add(tournamentData);
            showNotification('Tournament added successfully!', 'success');
            modal.style.display = "none";
            form.reset();
            loadTournaments();
        } catch (error) {
            console.error("Error adding tournament:", error);
            showNotification('Error adding tournament', 'error');
        }
    };
}

function editTournament(tournamentId) {
    console.log('Editing tournament:', tournamentId);
    const modal = document.getElementById('editTournamentModal');
    if (!modal) {
        showNotification('Edit tournament modal not found', 'error');
        return;
    }
    
    modal.style.display = "block";

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = "none";

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Load games for the select dropdown
    const gameSelect = document.getElementById('editTournamentGame');
    if (!gameSelect) {
        showNotification('Game select not found', 'error');
        return;
    }

    // First load games
    db.collection('games').get().then((querySnapshot) => {
        gameSelect.innerHTML = '<option value="">Select a game</option>';
        querySnapshot.forEach((doc) => {
            const game = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = game.name;
            gameSelect.appendChild(option);
        });

        // Then load tournament data
        return db.collection('tournaments').doc(tournamentId).get();
    }).then((docSnapshot) => {
        if (docSnapshot.exists) {
            const tournament = docSnapshot.data();
            document.getElementById('editTournamentName').value = tournament.name || '';
            document.getElementById('editTournamentGame').value = tournament.gameId || '';
            document.getElementById('editEntryFee').value = tournament.entryFee || '';
            document.getElementById('editPrizePool').value = tournament.prizePool || '';
            document.getElementById('editMaxPlayers').value = tournament.maxPlayers || '';
            document.getElementById('editStartDate').value = tournament.startDate || '';
            document.getElementById('editTournamentRules').value = tournament.rules || '';
        } else {
            console.error('Tournament not found');
            showNotification('Tournament not found', 'error');
        }
    }).catch((error) => {
        console.error("Error loading data:", error);
        showNotification('Error loading data', 'error');
    });

    const form = document.getElementById('editTournamentForm');
    if (!form) {
        showNotification('Edit tournament form not found', 'error');
        return;
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const tournamentData = {
            name: document.getElementById('editTournamentName').value,
            gameId: document.getElementById('editTournamentGame').value,
            entryFee: Number(document.getElementById('editEntryFee').value),
            prizePool: Number(document.getElementById('editPrizePool').value),
            maxPlayers: Number(document.getElementById('editMaxPlayers').value),
            startDate: document.getElementById('editStartDate').value,
            rules: document.getElementById('editTournamentRules').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('tournaments').doc(tournamentId).update(tournamentData);
            showNotification('Tournament updated successfully!', 'success');
            modal.style.display = "none";
            loadTournaments();
        } catch (error) {
            console.error("Error updating tournament:", error);
            showNotification('Error updating tournament', 'error');
        }
    };
}

async function updateTournamentStatus(tournamentId, status) {
    try {
        await db.collection("tournaments").doc(tournamentId).update({
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification('Tournament status updated successfully', 'success');
        loadTournaments();
    } catch (error) {
        console.error('Error updating tournament status:', error);
        showNotification('Error updating tournament status', 'error');
    }
}

// Transaction Management Functions
async function viewTransaction(transactionId) {
    try {
        const transactionDoc = await db.collection('transactions').doc(transactionId).get();
        if (!transactionDoc.exists) {
            alert('Transaction not found');
            return;
        }

        const transaction = transactionDoc.data();
        showModal(`
            <h3>Transaction Details</h3>
            <div class="transaction-details">
                <p><strong>Transaction ID:</strong> ${transaction.transactionId || 'N/A'}</p>
                <p><strong>User ID:</strong> ${transaction.userId || 'N/A'}</p>
                <p><strong>Type:</strong> ${transaction.type || 'N/A'}</p>
                <p><strong>Amount:</strong> ₹${transaction.amount || 0}</p>
                <p><strong>Status:</strong> ${transaction.status || 'pending'}</p>
                <p><strong>Timestamp:</strong> ${transaction.timestamp ? transaction.timestamp.toDate().toLocaleString() : 'N/A'}</p>
            </div>
        `);
    } catch (error) {
        console.error('Error viewing transaction:', error);
        alert('Error loading transaction details');
    }
}

// Withdrawal Management Functions
async function viewWithdrawalDetails(withdrawalId) {
    try {
        const withdrawalDoc = await db.collection('withdrawals').doc(withdrawalId).get();
        const withdrawal = withdrawalDoc.data();
        // Implement withdrawal details modal or navigation
        console.log('Withdrawal details:', withdrawal);
    } catch (error) {
        console.error('Error viewing withdrawal details:', error);
        showNotification('Error viewing withdrawal details', 'error');
    }
}

async function processWithdrawal(withdrawalId, status) {
    try {
        const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
        const userRef = db.collection('users').doc(withdrawalRef.userId);
        
        await db.runTransaction(async (transaction) => {
            const withdrawalDoc = await transaction.get(withdrawalRef);
            const withdrawal = withdrawalDoc.data();
            const userDoc = await transaction.get(userRef);
            const user = userDoc.data();
            
            if (status === 'APPROVED') {
                // Update user balance
                transaction.update(userRef, {
                    balance: user.balance - withdrawal.amount
                });
            } else if (status === 'REJECTED') {
                // Refund the amount to user's balance
                transaction.update(userRef, {
                    balance: user.balance + withdrawal.amount
                });
            }
            
            // Update withdrawal status
            transaction.update(withdrawalRef, {
                status: status,
                processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                processedBy: firebase.auth().currentUser.email
            });
        });
        
        showNotification(`Withdrawal ${status.toLowerCase()} successfully`, 'success');
        loadWithdrawals(); // Reload withdrawals list
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        showNotification('Error processing withdrawal', 'error');
    }
}

// Support Management Functions
async function viewTicket(ticketId) {
    try {
        const ticketDoc = await db.collection('support_tickets').doc(ticketId).get();
        if (!ticketDoc.exists) {
            alert('Ticket not found');
            return;
        }

        const ticket = ticketDoc.data();
        showModal(`
            <h3>Ticket Details</h3>
            <div class="ticket-details">
                <p><strong>Ticket ID:</strong> ${ticket.ticketId || 'N/A'}</p>
                <p><strong>User ID:</strong> ${ticket.userId || 'N/A'}</p>
                <p><strong>Subject:</strong> ${ticket.subject || 'N/A'}</p>
                <p><strong>Category:</strong> ${ticket.category || 'N/A'}</p>
                <p><strong>Priority:</strong> ${ticket.priority || 'low'}</p>
                <p><strong>Status:</strong> ${ticket.status || 'open'}</p>
                <p><strong>Timestamp:</strong> ${ticket.timestamp ? ticket.timestamp.toDate().toLocaleString() : 'N/A'}</p>
            </div>
        `);
    } catch (error) {
        console.error('Error viewing ticket:', error);
        alert('Error loading ticket details');
    }
}

// Show modal
function showModal(content) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    if (modal && modalBody) {
        modalBody.innerHTML = content;
        modal.style.display = 'block';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Add CSS
const style = document.createElement('style');
style.textContent = `
    .table-wrapper {
        overflow-x: auto;
        margin: 20px 0;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border-radius: 8px;
        overflow: hidden;
    }

    th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #eee;
    }

    th {
        background: #f5f5f5;
        font-weight: 600;
    }

    .games-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        padding: 20px;
    }

    .game-card {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .game-image {
        height: 200px;
        overflow: hidden;
    }

    .game-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .game-info {
        padding: 15px;
    }

    .game-actions {
        padding: 15px;
        border-top: 1px solid #eee;
        display: flex;
        gap: 10px;
    }

    .action-button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        background: #4CAF50;
        color: white;
        font-weight: 500;
    }

    .action-button.deactivate {
        background: #f44336;
    }

    .status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.85em;
    }

    .status-badge.active {
        background: #e8f5e9;
        color: #2e7d32;
    }

    .status-badge.blocked {
        background: #ffebee;
        color: #c62828;
    }

    .no-data, .error {
        text-align: center;
        padding: 20px;
        color: #666;
    }

    .error {
        color: #f44336;
    }

    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
    }

    .modal-content {
        background: white;
        margin: 10% auto;
        padding: 20px;
        width: 90%;
        max-width: 500px;
        border-radius: 8px;
        position: relative;
    }

    .close {
        position: absolute;
        right: 20px;
        top: 20px;
        font-size: 24px;
        cursor: pointer;
    }

    .form-group {
        margin-bottom: 15px;
    }

    .form-group label {
        display: block;
        margin-bottom: 5px;
        color: #666;
    }

    .form-group input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
`;
document.head.appendChild(style);

// Helper function to show notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add click handlers for nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        const section = item.getAttribute('data-section');
        if (section) {
            item.addEventListener('click', () => showSection(section));
        }
    });
    
    // Add logout handler
    document.getElementById('logout').addEventListener('click', () => {
        firebase.auth().signOut().then(() => {
            window.location.href = 'login.html';
        });
    });
});

// Constants
const ADMIN_EMAIL = 'admin@esportadda.com';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on admin page
    if (!window.location.pathname.includes('admin.html')) {
        return;
    }

    // Auth state observer
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user || user.email !== ADMIN_EMAIL) {
            // If not admin, redirect to login
            window.location.href = 'login.html?type=admin';
            return;
        }

        // Initialize admin panel if admin user
        try {
            console.log('Admin access granted');
            initializeAdmin();
        } catch (error) {
            console.error('Error initializing admin panel:', error);
            window.location.href = 'login.html?type=admin';
        }
    });
});

// User Management Functions
function viewUser(userId) {
    const modal = document.getElementById('viewUserModal');
    if (!modal) {
        console.error('View user modal not found');
        return;
    }
    
    modal.style.display = "block";

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = "none";

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Load user data
    const userDoc = db.collection("users").doc(userId);
    userDoc.get().then((doc) => {
        if (doc.exists()) {
            const user = doc.data();
            const userDetails = document.getElementById('userDetails');
            userDetails.innerHTML = `
                <p><strong>Name:</strong> ${user.displayName || 'N/A'}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Role:</strong> ${user.role || 'user'}</p>
                <p><strong>Created:</strong> ${new Date(user.createdAt).toLocaleString()}</p>
                <p><strong>Status:</strong> ${user.status || 'active'}</p>
                <p><strong>Balance:</strong> ${user.balance || 0}</p>
            `;
        }
    }).catch((error) => {
        console.error("Error loading user:", error);
        showNotification('Error loading user data', 'error');
    });
}

// Cache for data
// let gamesCache = new Map();
// let tournamentsCache = new Map();
// let usersCache = new Map();

// Batch size for queries
// const BATCH_SIZE = 10;

// Load data in batches
async function loadGamesInBatches() {
    try {
        const gamesRef = db.collection("games");
        const querySnapshot = await gamesRef.limit(BATCH_SIZE).get();
        
        const gamesList = document.getElementById('games-list');
        if (!gamesList) {
            console.error('Games list element not found');
            return;
        }
        
        gamesList.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const game = doc.data();
            gamesCache.set(doc.id, game);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${game.imageUrl || ''}" alt="${game.name}" style="width: 50px; height: 50px;"></td>
                <td>${game.name}</td>
                <td>${game.description || ''}</td>
                <td>
                    <span class="status-badge ${game.status || 'active'}">${game.status || 'active'}</span>
                </td>
                <td>
                    <button class="action-btn" onclick="editGame('${doc.id}')">Edit</button>
                    <button class="action-btn" onclick="toggleGameStatus('${doc.id}', '${game.status || 'active'}')">
                        ${game.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            `;
            gamesList.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading games:", error);
        showNotification('Error loading games', 'error');
    }
}

async function loadTournamentsInBatches() {
    try {
        const tournamentsRef = db.collection("tournaments");
        const querySnapshot = await tournamentsRef.limit(BATCH_SIZE).get();
        
        const tournamentsList = document.getElementById('tournaments-list');
        if (!tournamentsList) {
            console.error('Tournaments list element not found');
            return;
        }
        
        tournamentsList.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const tournament = doc.data();
            tournamentsCache.set(doc.id, tournament);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tournament.name}</td>
                <td>${tournament.game || ''}</td>
                <td>₹${tournament.entryFee}</td>
                <td>₹${tournament.prizePool}</td>
                <td>${tournament.players?.length || 0}/${tournament.maxPlayers}</td>
                <td>${new Date(tournament.startDate).toLocaleString()}</td>
                <td>
                    <span class="status-badge ${tournament.status}">${tournament.status}</span>
                </td>
                <td>
                    <button class="action-btn" onclick="editTournament('${doc.id}')">Edit</button>
                    <button class="action-btn" onclick="viewTournamentDetails('${doc.id}')">View</button>
                </td>
            `;
            tournamentsList.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading tournaments:", error);
        showNotification('Error loading tournaments', 'error');
    }
}

// View tournament details
function viewTournamentDetails(tournamentId) {
    const tournament = tournamentsCache.get(tournamentId);
    if (!tournament) {
        showNotification('Tournament not found', 'error');
        return;
    }

    const modal = document.getElementById('viewTournamentModal');
    if (!modal) {
        showNotification('Modal not found', 'error');
        return;
    }

    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = `
        <span class="close">&times;</span>
        <h2>Tournament Details</h2>
        <div class="tournament-details">
            <p><strong>Name:</strong> ${tournament.name}</p>
            <p><strong>Game:</strong> ${tournament.game || 'N/A'}</p>
            <p><strong>Entry Fee:</strong> ₹${tournament.entryFee}</p>
            <p><strong>Prize Pool:</strong> ₹${tournament.prizePool}</p>
            <p><strong>Players:</strong> ${tournament.players?.length || 0}/${tournament.maxPlayers}</p>
            <p><strong>Start Date:</strong> ${new Date(tournament.startDate).toLocaleString()}</p>
            <p><strong>Status:</strong> <span class="status-badge ${tournament.status}">${tournament.status}</span></p>
            <p><strong>Rules:</strong> ${tournament.rules || 'No rules specified'}</p>
        </div>
    `;

    modal.style.display = "block";

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = "none";

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };
}

// Initialize modals when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create modals container if it doesn't exist
    let modalsContainer = document.getElementById('modalsContainer');
    if (!modalsContainer) {
        modalsContainer = document.createElement('div');
        modalsContainer.id = 'modalsContainer';
        document.body.appendChild(modalsContainer);
    }

    // Add game modal
    if (!document.getElementById('addGameModal')) {
        const addGameModal = document.createElement('div');
        addGameModal.id = 'addGameModal';
        addGameModal.className = 'modal';
        addGameModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Add New Game</h2>
                <form id="addGameForm">
                    <div class="form-group">
                        <label for="gameName">Game Name:</label>
                        <input type="text" id="gameName" required>
                    </div>
                    <div class="form-group">
                        <label for="gameImage">Game Image URL:</label>
                        <input type="text" id="gameImage" required>
                    </div>
                    <div class="form-group">
                        <label for="gameDescription">Description:</label>
                        <textarea id="gameDescription" required></textarea>
                    </div>
                    <button type="submit" class="submit-btn">Add Game</button>
                </form>
            </div>
        `;
        modalsContainer.appendChild(addGameModal);
    }

    // Add tournament modal
    if (!document.getElementById('addTournamentModal')) {
        const addTournamentModal = document.createElement('div');
        addTournamentModal.id = 'addTournamentModal';
        addTournamentModal.className = 'modal';
        addTournamentModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Add New Tournament</h2>
                <form id="addTournamentForm">
                    <div class="form-group">
                        <label for="tournamentName">Tournament Name:</label>
                        <input type="text" id="tournamentName" required>
                    </div>
                    <div class="form-group">
                        <label for="tournamentGame">Game:</label>
                        <select id="tournamentGame" required></select>
                    </div>
                    <div class="form-group">
                        <label for="entryFee">Entry Fee:</label>
                        <input type="number" id="entryFee" required min="0">
                    </div>
                    <div class="form-group">
                        <label for="prizePool">Prize Pool:</label>
                        <input type="number" id="prizePool" required min="0">
                    </div>
                    <div class="form-group">
                        <label for="maxPlayers">Max Players:</label>
                        <input type="number" id="maxPlayers" required min="2">
                    </div>
                    <div class="form-group">
                        <label for="startDate">Start Date:</label>
                        <input type="datetime-local" id="startDate" required>
                    </div>
                    <div class="form-group">
                        <label for="tournamentRules">Rules:</label>
                        <textarea id="tournamentRules" required></textarea>
                    </div>
                    <button type="submit" class="submit-btn">Add Tournament</button>
                </form>
            </div>
        `;
        modalsContainer.appendChild(addTournamentModal);
    }

    // Edit game modal
    if (!document.getElementById('editGameModal')) {
        const editGameModal = document.createElement('div');
        editGameModal.id = 'editGameModal';
        editGameModal.className = 'modal';
        editGameModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Edit Game</h2>
                <form id="editGameForm">
                    <div class="form-group">
                        <label for="editGameName">Game Name:</label>
                        <input type="text" id="editGameName" required>
                    </div>
                    <div class="form-group">
                        <label for="editGameImage">Game Image URL:</label>
                        <input type="text" id="editGameImage" required>
                    </div>
                    <div class="form-group">
                        <label for="editGameDescription">Description:</label>
                        <textarea id="editGameDescription" required></textarea>
                    </div>
                    <button type="submit" class="submit-btn">Update Game</button>
                </form>
            </div>
        `;
        modalsContainer.appendChild(editGameModal);
    }

    // Edit tournament modal
    if (!document.getElementById('editTournamentModal')) {
        const editTournamentModal = document.createElement('div');
        editTournamentModal.id = 'editTournamentModal';
        editTournamentModal.className = 'modal';
        editTournamentModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Edit Tournament</h2>
                <form id="editTournamentForm">
                    <div class="form-group">
                        <label for="editTournamentName">Tournament Name:</label>
                        <input type="text" id="editTournamentName" required>
                    </div>
                    <div class="form-group">
                        <label for="editTournamentGame">Game:</label>
                        <select id="editTournamentGame" required></select>
                    </div>
                    <div class="form-group">
                        <label for="editEntryFee">Entry Fee:</label>
                        <input type="number" id="editEntryFee" required min="0">
                    </div>
                    <div class="form-group">
                        <label for="editPrizePool">Prize Pool:</label>
                        <input type="number" id="editPrizePool" required min="0">
                    </div>
                    <div class="form-group">
                        <label for="editMaxPlayers">Max Players:</label>
                        <input type="number" id="editMaxPlayers" required min="2">
                    </div>
                    <div class="form-group">
                        <label for="editStartDate">Start Date:</label>
                        <input type="datetime-local" id="editStartDate" required>
                    </div>
                    <div class="form-group">
                        <label for="editTournamentRules">Rules:</label>
                        <textarea id="editTournamentRules" required></textarea>
                    </div>
                    <button type="submit" class="submit-btn">Update Tournament</button>
                </form>
            </div>
        `;
        modalsContainer.appendChild(editTournamentModal);
    }

    // View tournament modal
    if (!document.getElementById('viewTournamentModal')) {
        const viewTournamentModal = document.createElement('div');
        viewTournamentModal.id = 'viewTournamentModal';
        viewTournamentModal.className = 'modal';
        viewTournamentModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <div class="tournament-details"></div>
            </div>
        `;
        modalsContainer.appendChild(viewTournamentModal);
    }

    // Load initial data
    loadGames();
    loadTournaments();
});

// Load data when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize admin panel
    initializeAdmin();
    
    // Load initial data
    loadGames();
    loadTournaments();
});

// Show notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
