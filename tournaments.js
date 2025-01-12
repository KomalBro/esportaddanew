// Tournament management functions
let currentTournaments = [];

// Load tournaments
async function loadTournaments() {
    try {
        const tournamentsSnapshot = await db.collection('tournaments')
            .orderBy('createdAt', 'desc')
            .get();

        currentTournaments = [];
        const tableBody = document.querySelector('#tournamentsTable tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (tournamentsSnapshot.empty) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No tournaments found</td>
                </tr>
            `;
            return;
        }

        tournamentsSnapshot.forEach(doc => {
            const tournament = { id: doc.id, ...doc.data() };
            currentTournaments.push(tournament);
            
            const row = `
                <tr>
                    <td>${tournament.name || 'Unnamed Tournament'}</td>
                    <td>${tournament.game || 'N/A'}</td>
                    <td>${tournament.entryFee || '0'}</td>
                    <td>${tournament.prizePool || '0'}</td>
                    <td>${tournament.status || 'draft'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary me-1" onclick="editTournament('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteTournament('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading tournaments:', error);
        alert('Error loading tournaments: ' + error.message);
    }
}

// Add new tournament
async function addTournament(event) {
    event.preventDefault();
    const form = document.getElementById('tournamentForm');
    const formData = new FormData(form);

    try {
        const tournamentData = {
            name: formData.get('name'),
            game: formData.get('game'),
            entryFee: parseInt(formData.get('entryFee')) || 0,
            prizePool: parseInt(formData.get('prizePool')) || 0,
            maxPlayers: parseInt(formData.get('maxPlayers')) || 100,
            status: 'draft',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('tournaments').add(tournamentData);
        
        // Log activity
        await logActivity('Tournament Created', `Tournament "${tournamentData.name}" was created`);
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addTournamentModal'));
        modal.hide();
        form.reset();
        
        // Reload tournaments
        await loadTournaments();
        
    } catch (error) {
        console.error('Error adding tournament:', error);
        alert('Error adding tournament: ' + error.message);
    }
}

// Edit tournament
async function editTournament(tournamentId) {
    try {
        const tournament = currentTournaments.find(t => t.id === tournamentId);
        if (!tournament) {
            throw new Error('Tournament not found');
        }

        // Populate edit form
        const form = document.getElementById('editTournamentForm');
        form.elements['tournamentId'].value = tournamentId;
        form.elements['name'].value = tournament.name || '';
        form.elements['game'].value = tournament.game || '';
        form.elements['entryFee'].value = tournament.entryFee || 0;
        form.elements['prizePool'].value = tournament.prizePool || 0;
        form.elements['maxPlayers'].value = tournament.maxPlayers || 100;
        form.elements['status'].value = tournament.status || 'draft';

        // Show edit modal
        const modal = new bootstrap.Modal(document.getElementById('editTournamentModal'));
        modal.show();
    } catch (error) {
        console.error('Error preparing tournament edit:', error);
        alert('Error preparing tournament edit: ' + error.message);
    }
}

// Update tournament
async function updateTournament(event) {
    event.preventDefault();
    const form = document.getElementById('editTournamentForm');
    const formData = new FormData(form);
    const tournamentId = formData.get('tournamentId');

    try {
        const tournamentData = {
            name: formData.get('name'),
            game: formData.get('game'),
            entryFee: parseInt(formData.get('entryFee')) || 0,
            prizePool: parseInt(formData.get('prizePool')) || 0,
            maxPlayers: parseInt(formData.get('maxPlayers')) || 100,
            status: formData.get('status'),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('tournaments').doc(tournamentId).update(tournamentData);
        
        // Log activity
        await logActivity('Tournament Updated', `Tournament "${tournamentData.name}" was updated`);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editTournamentModal'));
        modal.hide();
        
        // Reload tournaments
        await loadTournaments();
        
    } catch (error) {
        console.error('Error updating tournament:', error);
        alert('Error updating tournament: ' + error.message);
    }
}

// Delete tournament
async function deleteTournament(tournamentId) {
    if (!confirm('Are you sure you want to delete this tournament?')) {
        return;
    }

    try {
        const tournament = currentTournaments.find(t => t.id === tournamentId);
        await db.collection('tournaments').doc(tournamentId).delete();
        
        // Log activity
        await logActivity('Tournament Deleted', `Tournament "${tournament.name}" was deleted`);
        
        // Reload tournaments
        await loadTournaments();
        
    } catch (error) {
        console.error('Error deleting tournament:', error);
        alert('Error deleting tournament: ' + error.message);
    }
}

// Log activity
async function logActivity(action, details) {
    try {
        await db.collection('activity').add({
            action,
            details,
            user: auth.currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Make functions available globally
window.loadTournaments = loadTournaments;
window.addTournament = addTournament;
window.editTournament = editTournament;
window.updateTournament = updateTournament;
window.deleteTournament = deleteTournament;
