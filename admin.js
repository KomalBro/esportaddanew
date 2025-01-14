// Initialize Firebase and Firestore
let db;

// Wait for Firebase to initialize
function initializeFirebase() {
    return new Promise((resolve, reject) => {
        const unsubscribe = firebase.auth().onAuthStateChanged(() => {
            unsubscribe();
            try {
                db = firebase.firestore();
                console.log('Firebase initialized successfully');
                resolve();
            } catch (error) {
                console.error('Firebase initialization error:', error);
                reject(error);
            }
        }, reject);
    });
}

// Constants
const ADMIN_EMAIL = 'admin@esportadda.com';
const BATCH_SIZE = 10;

// Cache for data
const gamesCache = new Map();
const tournamentsCache = new Map();
const usersCache = new Map();

// Function to show a specific section
function showSection(sectionId) {
    console.log('Showing section:', sectionId);
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show the selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';
        console.log('Section displayed:', sectionId);
        
        // Load section-specific data
        switch(sectionId) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'games':
                loadGames();
                break;
            case 'tournaments':
                loadTournaments();
                break;
            case 'users':
                loadUsers();
                break;
            case 'withdrawals':
                loadWithdrawals();
                break;
            case 'settings':
                loadSettings();
                break;
        }
    } else {
        console.log('Section not found:', sectionId);
    }
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Reset form if exists
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
}

function showAddGameModal() {
    showModal('addGameModal');
}

function showAddTournamentModal() {
    showModal('addTournamentModal');
    loadGamesForSelect();
}

async function loadGamesForSelect() {
    try {
        const gamesSnapshot = await db.collection('games').where('status', '==', 'active').get();
        const gameSelect = document.getElementById('gameSelect');
        
        if (!gameSelect) return;
        
        gameSelect.innerHTML = '<option value="">Select a game</option>';
        
        gamesSnapshot.forEach(doc => {
            const game = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = game.name;
            gameSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading games for select:', error);
        showNotification('Error loading games', 'error');
    }
}

// Load data based on section
async function loadSectionData(sectionId) {
    try {
        switch(sectionId) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'games':
                await loadGames();
                break;
            case 'tournaments':
                await loadTournaments();
                break;
            case 'users':
                await loadUsers();
                break;
            case 'transactions':
                await loadTransactions();
                break;
            case 'withdrawals':
                await loadWithdrawals();
                break;
            case 'activities':
                await loadActivities();
                break;
            case 'support':
                await loadSupportTickets();
                break;
            case 'settings':
                await loadSettings();
                break;
        }
    } catch (error) {
        console.error('Error loading section:', error);
        showNotification('Error loading section data', 'error');
    }
}

// Dashboard Management
async function loadDashboardData() {
    try {
        // Get total users count
        const usersSnapshot = await db.collection('users').get();
        document.getElementById('totalUsers').textContent = usersSnapshot.size;

        // Get active games count
        const gamesSnapshot = await db.collection('games').where('status', '==', 'active').get();
        document.getElementById('activeGames').textContent = gamesSnapshot.size;

        // Get active tournaments count
        const tournamentsSnapshot = await db.collection('tournaments')
            .where('status', '==', 'active')
            .where('startDate', '>', new Date())
            .get();
        document.getElementById('activeTournaments').textContent = tournamentsSnapshot.size;

        // Calculate total revenue
        const transactionsSnapshot = await db.collection('transactions')
            .where('type', '==', 'credit')
            .get();
        const totalRevenue = transactionsSnapshot.docs.reduce((sum, doc) => {
            return sum + (parseFloat(doc.data().amount) || 0);
        }, 0);
        document.getElementById('totalRevenue').textContent = '₹' + totalRevenue.toFixed(2);

        // Get pending withdrawals
        const withdrawalsSnapshot = await db.collection('withdrawals')
            .where('status', '==', 'pending')
            .get();
        const pendingAmount = withdrawalsSnapshot.docs.reduce((sum, doc) => {
            return sum + (parseFloat(doc.data().amount) || 0);
        }, 0);
        document.getElementById('pendingWithdrawals').textContent = '₹' + pendingAmount.toFixed(2);

        // Load recent activities
        const activitiesSnapshot = await db.collection('activities')
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();
        const activitiesList = document.getElementById('recentActivities');
        activitiesList.innerHTML = '';
        activitiesSnapshot.forEach(doc => {
            const activity = doc.data();
            const li = document.createElement('li');
            li.className = 'activity-item';
            li.innerHTML = `
                <span class="activity-icon"><i class="fas ${getActivityIcon(activity.type)}"></i></span>
                <div class="activity-details">
                    <p class="activity-text">${activity.description}</p>
                    <span class="activity-time">${formatTimestamp(activity.timestamp)}</span>
                </div>
            `;
            activitiesList.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

// Helper function to get icon for activity type
function getActivityIcon(type) {
    const icons = {
        'user': 'fa-user',
        'game': 'fa-gamepad',
        'tournament': 'fa-trophy',
        'withdrawal': 'fa-money-bill',
        'transaction': 'fa-exchange-alt'
    };
    return icons[type] || 'fa-info-circle';
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        Math.round((date - new Date()) / (1000 * 60 * 60 * 24)),
        'day'
    );
}

// Dashboard Stats Function
async function loadDashboardStats() {
    console.log('Loading dashboard stats...');
    try {
        // Show loading state
        document.getElementById('dashboard').style.opacity = '0.6';
        document.getElementById('dashboard').style.pointerEvents = 'none';

        console.log('Fetching data from Firestore...');
        // Get stats from Firestore
        const [
            usersSnapshot,
            gamesSnapshot,
            tournamentsSnapshot,
            transactionsSnapshot,
            withdrawalsSnapshot,
            activitiesSnapshot
        ] = await Promise.all([
            db.collection('users').get(),
            db.collection('games').get(),
            db.collection('tournaments').get(),
            db.collection('transactions').get(),
            db.collection('withdrawals').get(),
            db.collection('activities')
                .orderBy('timestamp', 'desc')
                .limit(5)
                .get()
        ]);

        console.log('Data fetched successfully');
        console.log('Users:', usersSnapshot.size);
        console.log('Games:', gamesSnapshot.size);
        console.log('Tournaments:', tournamentsSnapshot.size);

        // Calculate total amounts
        let totalRevenue = 0;
        transactionsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'completed') {
                totalRevenue += parseFloat(data.amount || 0);
            }
        });

        let pendingWithdrawals = 0;
        withdrawalsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'pending') {
                pendingWithdrawals += parseFloat(data.amount || 0);
            }
        });

        console.log('Calculated amounts:', { totalRevenue, pendingWithdrawals });

        // Update stats in the dashboard
        document.getElementById('totalUsers').textContent = usersSnapshot.size;
        document.getElementById('totalGames').textContent = gamesSnapshot.size;
        document.getElementById('totalTournaments').textContent = tournamentsSnapshot.size;
        document.getElementById('totalRevenue').textContent = '₹' + totalRevenue.toFixed(2);
        document.getElementById('pendingWithdrawals').textContent = '₹' + pendingWithdrawals.toFixed(2);

        console.log('Stats updated in DOM');

        // Update recent activities
        const recentActivitiesList = document.getElementById('recentActivities');
        recentActivitiesList.innerHTML = '';

        if (activitiesSnapshot.empty) {
            console.log('No recent activities found');
            recentActivitiesList.innerHTML = '<li class="activity-item">No recent activities</li>';
        } else {
            console.log('Found activities:', activitiesSnapshot.size);
            activitiesSnapshot.forEach(doc => {
                const activity = doc.data();
                const li = document.createElement('li');
                li.className = 'activity-item';
                li.innerHTML = `
                    <div class="activity-item">
                        <span class="activity-type">${activity.type}</span>
                        <span class="activity-desc">${activity.description}</span>
                        <span class="activity-time">${activity.timestamp?.toDate().toLocaleString()}</span>
                    </div>
                `;
                recentActivitiesList.appendChild(li);
            });
        }

        console.log('Dashboard load complete');

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Error loading dashboard stats: ' + error.message, 'error');
    } finally {
        // Reset loading state
        document.getElementById('dashboard').style.opacity = '1';
        document.getElementById('dashboard').style.pointerEvents = 'auto';
    }
}

// Transactions Management
async function loadTransactions() {
    try {
        const transactionsSnapshot = await db.collection('transactions')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();

        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) {
            console.error('Transactions list element not found');
            return;
        }

        let html = '';
        transactionsSnapshot.forEach(doc => {
            const transaction = doc.data();
            html += `
                <tr>
                    <td>${transaction.userId}</td>
                    <td><span class="badge ${transaction.type}">${transaction.type}</span></td>
                    <td>₹${transaction.amount}</td>
                    <td><span class="status-badge status-${transaction.status}">${transaction.status}</span></td>
                    <td>${transaction.timestamp?.toDate().toLocaleString()}</td>
                </tr>
            `;
        });

        transactionsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading transactions:', error);
        showNotification('Error loading transactions', 'error');
    }
}

// Withdrawals Management
async function loadWithdrawals() {
    try {
        const withdrawalsSnapshot = await db.collection('withdrawals')
            .orderBy('timestamp', 'desc')
            .get();

        const withdrawalsList = document.getElementById('withdrawalsList');
        if (!withdrawalsList) {
            console.error('Withdrawals list element not found');
            return;
        }

        let html = '';
        withdrawalsSnapshot.forEach(doc => {
            const withdrawal = doc.data();
            html += `
                <tr>
                    <td>${withdrawal.userId}</td>
                    <td>₹${withdrawal.amount}</td>
                    <td><span class="status-badge status-${withdrawal.status}">${withdrawal.status}</span></td>
                    <td>${withdrawal.timestamp?.toDate().toLocaleString()}</td>
                    <td>
                        ${withdrawal.status === 'pending' ? `
                            <button class="action-btn approve-btn" onclick="processWithdrawal('${doc.id}', 'approved')">Approve</button>
                            <button class="action-btn reject-btn" onclick="processWithdrawal('${doc.id}', 'rejected')">Reject</button>
                        ` : '-'}
                    </td>
                </tr>
            `;
        });

        withdrawalsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading withdrawals:', error);
        showNotification('Error loading withdrawals', 'error');
    }
}

async function processWithdrawal(withdrawalId, status) {
    try {
        const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
        const withdrawalDoc = await withdrawalRef.get();
        
        if (!withdrawalDoc.exists) {
            showNotification('Withdrawal request not found', 'error');
            return;
        }

        const withdrawal = withdrawalDoc.data();
        
        await db.runTransaction(async (transaction) => {
            // Update withdrawal status
            transaction.update(withdrawalRef, {
                status,
                processedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // If rejected, refund the amount to user's wallet
            if (status === 'rejected') {
                const userRef = db.collection('users').doc(withdrawal.userId);
                const userDoc = await transaction.get(userRef);
                
                if (userDoc.exists) {
                    const currentBalance = userDoc.data().wallet?.balance || 0;
                    transaction.update(userRef, {
                        'wallet.balance': currentBalance + withdrawal.amount
                    });
                }
            }
        });

        showNotification(`Withdrawal ${status} successfully`, 'success');
        loadWithdrawals();
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        showNotification(error.message, 'error');
    }
}

// Activities Management
async function loadActivities() {
    try {
        const activitiesSnapshot = await db.collection('activities')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();

        const activitiesList = document.getElementById('activitiesList');
        if (!activitiesList) {
            console.error('Activities list element not found');
            return;
        }

        let html = '';
        activitiesSnapshot.forEach(doc => {
            const activity = doc.data();
            html += `
                <div class="activity-card">
                    <div class="activity-header">
                        <span class="activity-type">${activity.type}</span>
                        <span class="activity-time">${activity.timestamp?.toDate().toLocaleString()}</span>
                    </div>
                    <div class="activity-body">
                        <p class="activity-user">User: ${activity.userId}</p>
                        <p class="activity-desc">${activity.description}</p>
                    </div>
                </div>
            `;
        });

        activitiesList.innerHTML = html;
    } catch (error) {
        console.error('Error loading activities:', error);
        showNotification('Error loading activities', 'error');
    }
}

// Support Tickets Management
async function loadSupportTickets() {
    try {
        const ticketsSnapshot = await db.collection('support_tickets')
            .orderBy('timestamp', 'desc')
            .get();

        const supportList = document.getElementById('supportList');
        if (!supportList) {
            console.error('Support tickets list element not found');
            return;
        }

        let html = '';
        ticketsSnapshot.forEach(doc => {
            const ticket = doc.data();
            html += `
                <div class="ticket-card ${ticket.status}">
                    <div class="ticket-header">
                        <h3>${ticket.subject}</h3>
                        <span class="status-badge status-${ticket.status}">${ticket.status}</span>
                    </div>
                    <div class="ticket-body">
                        <p><strong>User:</strong> ${ticket.userId}</p>
                        <p><strong>Date:</strong> ${ticket.timestamp?.toDate().toLocaleString()}</p>
                        <p class="ticket-message">${ticket.message}</p>
                    </div>
                    <div class="ticket-actions">
                        <button class="action-btn view-btn" onclick="viewTicket('${doc.id}')">View Details</button>
                        ${ticket.status === 'open' ? 
                            `<button class="action-btn close-btn" onclick="updateTicketStatus('${doc.id}', 'closed')">Close Ticket</button>` : 
                            `<button class="action-btn reopen-btn" onclick="updateTicketStatus('${doc.id}', 'open')">Reopen Ticket</button>`
                        }
                    </div>
                </div>
            `;
        });

        supportList.innerHTML = html;
    } catch (error) {
        console.error('Error loading support tickets:', error);
        showNotification('Error loading support tickets', 'error');
    }
}

async function viewTicket(ticketId) {
    try {
        const ticketDoc = await db.collection('support_tickets').doc(ticketId).get();
        if (!ticketDoc.exists) {
            showNotification('Ticket not found', 'error');
            return;
        }

        const ticket = ticketDoc.data();
        const modalContent = `
            <div class="ticket-details">
                <h3>${ticket.subject}</h3>
                <div class="ticket-info">
                    <p><strong>Status:</strong> <span class="status-badge status-${ticket.status}">${ticket.status}</span></p>
                    <p><strong>User:</strong> ${ticket.userId}</p>
                    <p><strong>Date:</strong> ${ticket.timestamp?.toDate().toLocaleString()}</p>
                </div>
                <div class="ticket-message">
                    <h4>Message:</h4>
                    <p>${ticket.message}</p>
                </div>
                ${ticket.status === 'open' ? `
                    <div class="ticket-reply">
                        <h4>Reply:</h4>
                        <textarea id="ticketReply" rows="4"></textarea>
                        <button onclick="replyToTicket('${ticketId}')" class="action-btn">Send Reply</button>
                    </div>
                ` : ''}
            </div>
        `;

        showCustomModal('Support Ticket Details', modalContent);
    } catch (error) {
        console.error('Error viewing ticket:', error);
        showNotification(error.message, 'error');
    }
}

async function updateTicketStatus(ticketId, status) {
    try {
        await db.collection('support_tickets').doc(ticketId).update({
            status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification(`Ticket ${status === 'open' ? 'reopened' : 'closed'} successfully`, 'success');
        loadSupportTickets();
    } catch (error) {
        console.error('Error updating ticket status:', error);
        showNotification(error.message, 'error');
    }
}

// Settings Management
async function loadSettings() {
    try {
        console.log('Loading settings...');
        const settingsDoc = await db.collection('settings').doc('general').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : {};

        const settingsForm = document.getElementById('settingsForm');
        if (!settingsForm) {
            console.error('Settings form not found');
            return;
        }

        // Update form fields with current settings
        Object.keys(settings).forEach(key => {
            const input = document.getElementById(key);
            if (input) {
                input.value = settings[key];
            }
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Error loading settings', 'error');
    }
}

async function saveSettings() {
    try {
        const settingsForm = document.getElementById('settingsForm');
        if (!settingsForm) return;

        const formData = new FormData(settingsForm);
        const settings = {};
        formData.forEach((value, key) => {
            settings[key] = value;
        });

        await db.collection('settings').doc('general').set(settings, { merge: true });
        showNotification('Settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification(error.message, 'error');
    }
}

// Users Management
async function loadUsers() {
    try {
        console.log('Loading users...');
        const usersSnapshot = await db.collection('users').get();
        const usersList = document.getElementById('usersList');
        
        if (!usersList) {
            console.error('Users list element not found');
            return;
        }

        let html = '';
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const joinedDate = user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleString() : 'N/A';
            const walletBalance = typeof user.wallet === 'object' ? 
                (user.wallet.balance || 0) : 
                (typeof user.wallet === 'number' ? user.wallet : 0);

            html += `
                <tr>
                    <td>${user.username || 'Anonymous'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>₹${walletBalance}</td>
                    <td><span class="status-badge status-${user.status || 'active'}">${user.status || 'active'}</span></td>
                    <td>${joinedDate}</td>
                    <td>
                        <button class="action-btn view-btn" onclick="viewUser('${doc.id}')">View</button>
                        <button class="action-btn edit-btn" onclick="editUser('${doc.id}')">Edit</button>
                        ${user.status === 'banned' ? 
                            `<button class="action-btn unban-btn" onclick="unbanUser('${doc.id}')">Unban</button>` :
                            `<button class="action-btn ban-btn" onclick="banUser('${doc.id}')">Ban</button>`
                        }
                    </td>
                </tr>
            `;
        });

        usersList.innerHTML = html || '<tr><td colspan="6">No users found</td></tr>';
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
        // Delete user's tournaments
        const userTournaments = await db.collection('tournaments')
            .where('createdBy', '==', userId)
            .get();
        
        const batch = db.batch();
        userTournaments.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete user's transactions
        const userTransactions = await db.collection('transactions')
            .where('userId', '==', userId)
            .get();
            
        userTransactions.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete user's activities
        const userActivities = await db.collection('activities')
            .where('userId', '==', userId)
            .get();
            
        userActivities.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete user document
        batch.delete(db.collection('users').doc(userId));

        await batch.commit();
        showNotification('User deleted successfully', 'success');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(error.message, 'error');
    }
}

async function editUser(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            showNotification('User not found', 'error');
            return;
        }

        const user = userDoc.data();
        const modalContent = `
            <form id="editUserForm" class="settings-form">
                <div class="form-group">
                    <label for="editUsername">Username</label>
                    <input type="text" id="editUsername" value="${user.username || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editEmail">Email</label>
                    <input type="email" id="editEmail" value="${user.email}" readonly>
                </div>
                <div class="form-group">
                    <label for="editStatus">Status</label>
                    <select id="editStatus" required>
                        <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                        <option value="banned" ${user.status === 'banned' ? 'selected' : ''}>Banned</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="editPhone">Phone</label>
                    <input type="tel" id="editPhone" value="${user.phone || ''}">
                </div>
                <button type="button" onclick="updateUser('${userId}')" class="save-btn">Update User</button>
            </form>
        `;

        showCustomModal('Edit User', modalContent);
    } catch (error) {
        console.error('Error editing user:', error);
        showNotification(error.message, 'error');
    }
}

async function updateUser(userId) {
    try {
        const userData = {
            username: document.getElementById('editUsername').value,
            status: document.getElementById('editStatus').value,
            phone: document.getElementById('editPhone').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(userId).update(userData);
        showNotification('User updated successfully', 'success');
        closeCustomModal();
        loadUsers();
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification(error.message, 'error');
    }
}

async function viewUser(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            showNotification('User not found', 'error');
            return;
        }

        const user = userDoc.data();
        
        // Get recent transactions
        const recentTransactions = await db.collection('transactions')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();

        let transactionsHtml = '';
        recentTransactions.forEach(doc => {
            const transaction = doc.data();
            transactionsHtml += `
                <tr>
                    <td>${transaction.type}</td>
                    <td>₹${transaction.amount}</td>
                    <td>${transaction.timestamp?.toDate().toLocaleString()}</td>
                </tr>
            `;
        });

        const modalContent = `
            <div class="user-details">
                <div class="user-header">
                    <img src="${user.photoURL || 'https://via.placeholder.com/100'}" alt="${user.username || 'User'}" class="user-avatar-large">
                    <div class="user-info">
                        <h3>${user.username || 'Anonymous'}</h3>
                        <p>${user.email}</p>
                        <span class="status-badge status-${user.status || 'active'}">${user.status || 'active'}</span>
                    </div>
                </div>
                <div class="user-stats">
                    <div class="stat">
                        <label>Wallet Balance</label>
                        <span>₹${user.wallet?.balance || 0}</span>
                    </div>
                    <div class="stat">
                        <label>Tournaments Played</label>
                        <span>${user.tournamentsPlayed || 0}</span>
                    </div>
                    <div class="stat">
                        <label>Tournaments Won</label>
                        <span>${user.tournamentsWon || 0}</span>
                    </div>
                </div>
                <div class="recent-transactions">
                    <h4>Recent Transactions</h4>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactionsHtml || '<tr><td colspan="3">No recent transactions</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div class="user-actions">
                    <button onclick="editUser('${userId}')" class="action-btn edit-btn">Edit User</button>
                    <button onclick="updateUserWallet('${userId}')" class="action-btn wallet-btn">Update Wallet</button>
                    ${user.status !== 'banned' ? 
                        `<button onclick="banUser('${userId}')" class="action-btn ban-btn">Ban User</button>` :
                        `<button onclick="unbanUser('${userId}')" class="action-btn unban-btn">Unban User</button>`
                    }
                </div>
            </div>
        `;

        showCustomModal('User Details', modalContent);
    } catch (error) {
        console.error('Error viewing user:', error);
        showNotification(error.message, 'error');
    }
}

async function banUser(userId) {
    if (!confirm('Are you sure you want to ban this user?')) return;

    try {
        await db.collection('users').doc(userId).update({
            status: 'banned',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification('User banned successfully', 'success');
        closeCustomModal();
        loadUsers();
    } catch (error) {
        console.error('Error banning user:', error);
        showNotification(error.message, 'error');
    }
}

async function unbanUser(userId) {
    try {
        await db.collection('users').doc(userId).update({
            status: 'active',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification('User unbanned successfully', 'success');
        closeCustomModal();
        loadUsers();
    } catch (error) {
        console.error('Error unbanning user:', error);
        showNotification(error.message, 'error');
    }
}

// Games Management
async function addGame() {
    try {
        const name = document.getElementById('gameName').value.trim();
        const description = document.getElementById('gameDescription').value.trim();
        const imageUrl = document.getElementById('gameImage').value.trim();

        if (!name || !description || !imageUrl) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        const gameData = {
            name,
            description,
            imageUrl,
            status: 'active',
            createdAt: firebase.firestore.Timestamp.now(),
            updatedAt: firebase.firestore.Timestamp.now()
        };

        await db.collection('games').add(gameData);
        showNotification('Game added successfully', 'success');
        closeModal('addGameModal');
        document.getElementById('addGameForm').reset();
        loadGames();
    } catch (error) {
        console.error('Error adding game:', error);
        showNotification(error.message, 'error');
    }
}

async function loadGames() {
    try {
        const gamesSnapshot = await db.collection('games').orderBy('createdAt', 'desc').get();
        const gamesList = document.getElementById('gamesList');
        
        if (!gamesList) {
            console.error('Games list element not found');
            return;
        }

        let html = '';
        gamesSnapshot.forEach(doc => {
            const game = doc.data();
            const createdDate = game.createdAt ? new Date(game.createdAt.seconds * 1000).toLocaleString() : 'N/A';
            
            html += `
                <tr>
                    <td>
                        <div class="game-info">
                            <img src="${game.imageUrl || 'https://via.placeholder.com/40'}" alt="${game.name}" class="game-image">
                            <span>${game.name}</span>
                        </div>
                    </td>
                    <td>${game.description}</td>
                    <td>${createdDate}</td>
                    <td>
                        <button class="action-btn edit-btn" onclick="editGame('${doc.id}')">Edit</button>
                        <button class="action-btn delete-btn" onclick="deleteGame('${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });

        gamesList.innerHTML = html || '<tr><td colspan="4">No games found</td></tr>';
    } catch (error) {
        console.error('Error loading games:', error);
        showNotification('Error loading games', 'error');
    }
}

async function editGame(gameId) {
    try {
        const gameDoc = await db.collection('games').doc(gameId).get();
        if (!gameDoc.exists) {
            showNotification('Game not found', 'error');
            return;
        }

        const game = gameDoc.data();
        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Game</h2>
                    <span class="close" onclick="closeCustomModal()">&times;</span>
                </div>
                <form id="editGameForm" class="settings-form">
                    <div class="form-group">
                        <label for="editGameName">Game Name</label>
                        <input type="text" id="editGameName" value="${game.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editGameDescription">Description</label>
                        <textarea id="editGameDescription" required>${game.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="editGameImage">Image URL</label>
                        <input type="url" id="editGameImage" value="${game.imageUrl || ''}" required>
                    </div>
                    <button type="button" onclick="updateGame('${gameId}')" class="action-btn save-btn">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </form>
            </div>
        `;

        showCustomModal('Edit Game', modalContent);
    } catch (error) {
        console.error('Error editing game:', error);
        showNotification(error.message, 'error');
    }
}

async function updateGame(gameId) {
    try {
        const gameData = {
            name: document.getElementById('editGameName').value.trim(),
            description: document.getElementById('editGameDescription').value.trim(),
            imageUrl: document.getElementById('editGameImage').value.trim(),
            updatedAt: firebase.firestore.Timestamp.now()
        };

        if (!gameData.name || !gameData.description || !gameData.imageUrl) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        await db.collection('games').doc(gameId).update(gameData);
        showNotification('Game updated successfully', 'success');
        closeCustomModal();
        loadGames();
    } catch (error) {
        console.error('Error updating game:', error);
        showNotification(error.message, 'error');
    }
}

async function deleteGame(gameId) {
    try {
        if (!confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
            return;
        }

        // Check if game is used in any tournaments
        const tournamentsSnapshot = await db.collection('tournaments')
            .where('gameId', '==', gameId)
            .get();

        if (!tournamentsSnapshot.empty) {
            showNotification('Cannot delete game: It is used in active tournaments', 'error');
            return;
        }

        await db.collection('games').doc(gameId).delete();
        showNotification('Game deleted successfully', 'success');
        loadGames();
    } catch (error) {
        console.error('Error deleting game:', error);
        showNotification(error.message, 'error');
    }
}

// Tournaments Management
async function addTournament() {
    try {
        const name = document.getElementById('tournamentName').value.trim();
        const gameId = document.getElementById('gameSelect').value;
        const entryFee = parseFloat(document.getElementById('entryFee').value) || 0;
        const prizePool = parseFloat(document.getElementById('prizePool').value) || 0;
        const maxPlayers = parseInt(document.getElementById('maxPlayers').value) || 10;
        const startDate = document.getElementById('startDate').value;

        if (!name || !gameId || !startDate) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        const tournamentData = {
            name,
            gameId,
            entryFee,
            prizePool,
            maxPlayers,
            startDate: firebase.firestore.Timestamp.fromDate(new Date(startDate)),
            status: 'upcoming',
            participants: {},
            winners: [],
            createdAt: firebase.firestore.Timestamp.now(),
            updatedAt: firebase.firestore.Timestamp.now()
        };

        await db.collection('tournaments').add(tournamentData);
        showNotification('Tournament added successfully', 'success');
        closeModal('addTournamentModal');
        document.getElementById('addTournamentForm').reset();
        loadTournaments();
    } catch (error) {
        console.error('Error adding tournament:', error);
        showNotification(error.message, 'error');
    }
}

async function loadTournaments() {
    try {
        const tournamentsSnapshot = await db.collection('tournaments').orderBy('createdAt', 'desc').get();
        const tournamentsList = document.getElementById('tournamentsList');
        
        if (!tournamentsList) {
            console.error('Tournaments list element not found');
            return;
        }

        let html = '';
        tournamentsSnapshot.forEach(doc => {
            const tournament = doc.data();
            const startDate = tournament.startDate ? new Date(tournament.startDate.seconds * 1000).toLocaleString() : 'N/A';
            const participantsCount = tournament.participants ? Object.keys(tournament.participants).length : 0;
            
            html += `
                <tr>
                    <td>${tournament.name}</td>
                    <td>₹${tournament.entryFee}</td>
                    <td>₹${tournament.prizePool}</td>
                    <td>${participantsCount}/${tournament.maxPlayers}</td>
                    <td>${startDate}</td>
                    <td><span class="status-badge status-${tournament.status}">${tournament.status}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" onclick="viewTournament('${doc.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn" onclick="editTournament('${doc.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteTournament('${doc.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tournamentsList.innerHTML = html || '<tr><td colspan="7" class="no-data">No tournaments found</td></tr>';
    } catch (error) {
        console.error('Error loading tournaments:', error);
        showNotification('Error loading tournaments', 'error');
    }
}

async function editTournament(tournamentId) {
    try {
        const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get();
        if (!tournamentDoc.exists) {
            showNotification('Tournament not found', 'error');
            return;
        }

        const tournament = tournamentDoc.data();
        const startDate = tournament.startDate ? new Date(tournament.startDate.seconds * 1000).toISOString().slice(0, 16) : '';

        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Tournament</h2>
                    <span class="close" onclick="closeCustomModal()">&times;</span>
                </div>
                <form id="editTournamentForm" class="settings-form">
                    <div class="form-group">
                        <label for="editTournamentName">Tournament Name</label>
                        <input type="text" id="editTournamentName" value="${tournament.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editGameSelect">Game</label>
                        <select id="editGameSelect" required>
                            ${await loadGamesOptions(tournament.gameId)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editEntryFee">Entry Fee (₹)</label>
                        <input type="number" id="editEntryFee" value="${tournament.entryFee || 0}" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="editPrizePool">Prize Pool (₹)</label>
                        <input type="number" id="editPrizePool" value="${tournament.prizePool || 0}" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="editMaxPlayers">Maximum Players</label>
                        <input type="number" id="editMaxPlayers" value="${tournament.maxPlayers || 10}" min="2" required>
                    </div>
                    <div class="form-group">
                        <label for="editStartDate">Start Date & Time</label>
                        <input type="datetime-local" id="editStartDate" value="${startDate}" required>
                    </div>
                    <button type="button" onclick="updateTournament('${tournamentId}')" class="action-btn save-btn">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </form>
            </div>
        `;

        showCustomModal('Edit Tournament', modalContent);
    } catch (error) {
        console.error('Error editing tournament:', error);
        showNotification(error.message, 'error');
    }
}

async function updateTournament(tournamentId) {
    try {
        const tournamentData = {
            name: document.getElementById('editTournamentName').value.trim(),
            gameId: document.getElementById('editGameSelect').value,
            entryFee: parseFloat(document.getElementById('editEntryFee').value) || 0,
            prizePool: parseFloat(document.getElementById('editPrizePool').value) || 0,
            maxPlayers: parseInt(document.getElementById('editMaxPlayers').value) || 10,
            startDate: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('editStartDate').value)),
            updatedAt: firebase.firestore.Timestamp.now()
        };

        if (!tournamentData.name || !tournamentData.gameId) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        await db.collection('tournaments').doc(tournamentId).update(tournamentData);
        showNotification('Tournament updated successfully', 'success');
        closeCustomModal();
        loadTournaments();
    } catch (error) {
        console.error('Error updating tournament:', error);
        showNotification(error.message, 'error');
    }
}

async function deleteTournament(tournamentId) {
    try {
        if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
            return;
        }

        const tournamentDoc = await db.collection('tournaments').doc(tournamentId).get();
        if (!tournamentDoc.exists) {
            showNotification('Tournament not found', 'error');
            return;
        }

        const tournament = tournamentDoc.data();
        if (tournament.participants && Object.keys(tournament.participants).length > 0) {
            showNotification('Cannot delete tournament with registered participants', 'error');
            return;
        }

        await db.collection('tournaments').doc(tournamentId).delete();
        showNotification('Tournament deleted successfully', 'success');
        loadTournaments();
    } catch (error) {
        console.error('Error deleting tournament:', error);
        showNotification(error.message, 'error');
    }
}

// Tournament Management Functions
async function loadGamesOptions(selectedGameId) {
    try {
        const gamesSnapshot = await db.collection('games').get();
        let optionsHtml = '';

        gamesSnapshot.forEach(doc => {
            const game = doc.data();
            const selected = game.id === selectedGameId ? 'selected' : '';
            optionsHtml += `
                <option value="${game.id}" ${selected}>${game.name}</option>
            `;
        });

        return optionsHtml;
    } catch (error) {
        console.error('Error loading games options:', error);
        showNotification('Error loading games', 'error');
    }
}

async function viewTournament(tournamentId) {
    try {
        const doc = await db.collection('tournaments').doc(tournamentId).get();
        if (!doc.exists) {
            showNotification('Tournament not found', 'error');
            return;
        }

        const tournament = doc.data();
        const gameDoc = await db.collection('games').doc(tournament.gameId).get();
        const gameName = gameDoc.exists ? gameDoc.data().name : 'Unknown Game';

        const content = `
            <div class="tournament-details">
                <p><strong>Name:</strong> ${tournament.name}</p>
                <p><strong>Game:</strong> ${gameName}</p>
                <p><strong>Entry Fee:</strong> ₹${tournament.entryFee}</p>
                <p><strong>Prize Pool:</strong> ₹${tournament.prizePool}</p>
                <p><strong>Max Players:</strong> ${tournament.maxPlayers}</p>
                <p><strong>Start Date:</strong> ${new Date(tournament.startDate.toDate()).toLocaleString()}</p>
                <p><strong>Status:</strong> ${tournament.status || 'Active'}</p>
                <p><strong>Registered Players:</strong> ${tournament.registeredPlayers?.length || 0}</p>
            </div>
        `;

        showCustomModal('Tournament Details', content);
    } catch (error) {
        console.error('Error viewing tournament:', error);
        showNotification('Error loading tournament details', 'error');
    }
}

// Modal Functions
function showCustomModal(title, content) {
    const modalHtml = `
        <div id="customModal" class="modal custom-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <span class="close-modal" onclick="closeCustomModal()">&times;</span>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('customModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('customModal').style.display = 'block';
}

function closeCustomModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        modal.style.display = 'none';
        modal.remove();
    }
}

// Utility Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        if (modalId === 'addTournamentModal') {
            loadGamesForSelect();
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        if (modalId === 'addGameModal') {
            document.getElementById('addGameForm').reset();
        } else if (modalId === 'addTournamentModal') {
            document.getElementById('addTournamentForm').reset();
        }
    }
}

// Logout function
async function handleLogout() {
    try {
        await firebase.auth().signOut();
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showNotification('Error signing out: ' + error.message, 'error');
    }
}

// Users Management Functions
async function loadUsers() {
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        const usersTableBody = document.getElementById('usersTableBody');
        usersTableBody.innerHTML = '';

        snapshot.forEach(doc => {
            const userData = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${userData.name || 'N/A'}</td>
                <td>${userData.email}</td>
                <td>₹${userData.balance || 0}</td>
                <td>
                    <span class="status-badge ${userData.status === 'active' ? 'active' : 'inactive'}">
                        ${userData.status || 'inactive'}
                    </span>
                </td>
                <td>
                    <button class="action-btn view-btn" onclick="viewUser('${doc.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn ${userData.status === 'active' ? 'block-btn' : 'unblock-btn'}" 
                            onclick="toggleUserStatus('${doc.id}', '${userData.status}')">
                        <i class="fas fa-${userData.status === 'active' ? 'ban' : 'check'}"></i>
                    </button>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users data');
    }
}

async function viewUser(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        // Implement user details view functionality
        console.log('User details:', userData);
    } catch (error) {
        console.error('Error viewing user:', error);
        showError('Failed to load user details');
    }
}

async function toggleUserStatus(userId, currentStatus) {
    try {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        await db.collection('users').doc(userId).update({
            status: newStatus
        });
        loadUsers(); // Reload users list
        showSuccess(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
        console.error('Error toggling user status:', error);
        showError('Failed to update user status');
    }
}

async function loadWithdrawals() {
    try {
        const withdrawalsRef = db.collection('withdrawals');
        const snapshot = await withdrawalsRef.get();
        const withdrawalsTableBody = document.getElementById('withdrawalsTableBody');
        withdrawalsTableBody.innerHTML = '';

        snapshot.forEach(doc => {
            const withdrawalData = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${withdrawalData.userName || 'N/A'}</td>
                <td>₹${withdrawalData.amount || 0}</td>
                <td>
                    <span class="status-badge ${withdrawalData.status}">
                        ${withdrawalData.status}
                    </span>
                </td>
                <td>${new Date(withdrawalData.timestamp).toLocaleString()}</td>
                <td>
                    <button class="action-btn approve-btn" onclick="handleWithdrawal('${doc.id}', 'approved')"
                            ${withdrawalData.status !== 'pending' ? 'disabled' : ''}>
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn reject-btn" onclick="handleWithdrawal('${doc.id}', 'rejected')"
                            ${withdrawalData.status !== 'pending' ? 'disabled' : ''}>
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            `;
            withdrawalsTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading withdrawals:', error);
        showError('Failed to load withdrawals data');
    }
}

async function handleWithdrawal(withdrawalId, action) {
    try {
        await db.collection('withdrawals').doc(withdrawalId).update({
            status: action,
            processedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadWithdrawals(); // Reload withdrawals list
        showSuccess(`Withdrawal ${action} successfully`);
    } catch (error) {
        console.error('Error handling withdrawal:', error);
        showError('Failed to process withdrawal');
    }
}

async function loadSettings() {
    try {
        const settingsDoc = await db.collection('settings').doc('platform').get();
        const settings = settingsDoc.data() || {};
        
        document.getElementById('platformName').value = settings.platformName || '';
        document.getElementById('appVersion').value = settings.appVersion || '';
        document.getElementById('contactEmail').value = settings.contactEmail || '';
        document.getElementById('supportPhone').value = settings.supportPhone || '';
        
        document.getElementById('platformFee').value = settings.platformFee || 0;
        document.getElementById('minWithdrawal').value = settings.minWithdrawal || 0;
        document.getElementById('maxWithdrawal').value = settings.maxWithdrawal || 0;
        document.getElementById('joiningBonus').value = settings.joiningBonus || 0;
        document.getElementById('referralReward').value = settings.referralReward || 0;
        
        document.getElementById('minPlayers').value = settings.minPlayers || 2;
        document.getElementById('maxPlayers').value = settings.maxPlayers || 100;
        document.getElementById('registrationBuffer').value = settings.registrationBuffer || 30;
        document.getElementById('resultSubmissionWindow').value = settings.resultSubmissionWindow || 60;
        
        document.getElementById('maintenanceMode').checked = settings.maintenanceMode || false;
        document.getElementById('maintenanceMessage').value = settings.maintenanceMessage || '';
        document.getElementById('forceUpdate').checked = settings.forceUpdate || false;
        
        if (settings.socialLinks) {
            document.getElementById('discord').value = settings.socialLinks.discord || '';
            document.getElementById('telegram').value = settings.socialLinks.telegram || '';
            document.getElementById('whatsapp').value = settings.socialLinks.whatsapp || '';
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showError('Failed to load platform settings');
    }
}

async function saveSettings(event) {
    event.preventDefault();
    try {
        const settings = {
            platformName: document.getElementById('platformName').value,
            appVersion: document.getElementById('appVersion').value,
            contactEmail: document.getElementById('contactEmail').value,
            supportPhone: document.getElementById('supportPhone').value,
            
            platformFee: parseFloat(document.getElementById('platformFee').value),
            minWithdrawal: parseFloat(document.getElementById('minWithdrawal').value),
            maxWithdrawal: parseFloat(document.getElementById('maxWithdrawal').value),
            joiningBonus: parseFloat(document.getElementById('joiningBonus').value),
            referralReward: parseFloat(document.getElementById('referralReward').value),
            
            minPlayers: parseInt(document.getElementById('minPlayers').value),
            maxPlayers: parseInt(document.getElementById('maxPlayers').value),
            registrationBuffer: parseInt(document.getElementById('registrationBuffer').value),
            resultSubmissionWindow: parseInt(document.getElementById('resultSubmissionWindow').value),
            
            maintenanceMode: document.getElementById('maintenanceMode').checked,
            maintenanceMessage: document.getElementById('maintenanceMessage').value,
            forceUpdate: document.getElementById('forceUpdate').checked,
            
            socialLinks: {
                discord: document.getElementById('discord').value,
                telegram: document.getElementById('telegram').value,
                whatsapp: document.getElementById('whatsapp').value
            },
            
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: auth.currentUser.email
        };

        await db.collection('settings').doc('platform').update(settings);
        showSuccess('Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Failed to save settings');
    }
    return false;
}

// Update showSection function to load appropriate data
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }

    // Load section-specific data
    switch (sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'games':
            loadGames();
            break;
        case 'tournaments':
            loadTournaments();
            break;
        case 'users':
            loadUsers();
            break;
        case 'withdrawals':
            loadWithdrawals();
            break;
        case 'settings':
            loadSettings();
            break;
    }

    // Update active menu item
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick').includes(sectionId)) {
            link.classList.add('active');
        }
    });
}

// Helper function to show success message
function showSuccess(message) {
    // Implement your success message display logic here
    console.log('Success:', message);
}

// Helper function to show error message
function showError(message) {
    // Implement your error message display logic here
    console.error('Error:', message);
}

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeFirebase();
        console.log('Firebase initialization complete');

        // Close modals when clicking outside
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        };

        // Initialize Firebase Auth state observer
        firebase.auth().onAuthStateChanged(async (user) => {
            try {
                if (user) {
                    // Show loading state
                    document.body.style.cursor = 'wait';
                    document.getElementById('dashboard').classList.add('loading');
                    
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (!userDoc.exists || userDoc.data().role !== 'admin') {
                        showNotification('Access denied. Admin privileges required.', 'error');
                        await firebase.auth().signOut();
                        window.location.href = 'admin-login.html';
                        return;
                    }

                    // Show dashboard
                    showSection('dashboard');
                    showNotification('Welcome to Admin Panel', 'success');
                } else {
                    window.location.href = 'admin-login.html';
                }
            } catch (error) {
                console.error('Auth state error:', error);
                showNotification('Error loading admin panel: ' + error.message, 'error');
            } finally {
                // Reset loading states
                document.body.style.cursor = 'default';
                document.getElementById('dashboard').classList.remove('loading');
            }
        });
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Error initializing admin panel: ' + error.message, 'error');
    }
});

// Notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}