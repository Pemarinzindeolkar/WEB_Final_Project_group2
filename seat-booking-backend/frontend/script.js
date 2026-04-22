// Student Portal Functions
let refreshInterval;

// Initialize student page
if (window.location.pathname.includes('student.html')) {
    loadSeats();
    refreshInterval = setInterval(loadSeats, 10000); // Refresh every 10 seconds
}

// Load seats for student view
async function loadSeats() {
    try {
        const response = await fetch('http://localhost:3000/api/seats/status');
        const data = await response.json();
        displaySeats(data.seats);
    } catch (error) {
        console.error('Error loading seats:', error);
    }
}

function displaySeats(seats) {
    const container = document.getElementById('seatsContainer');
    if (!container) return;
    
    // Group seats by table
    const tables = {};
    seats.forEach(seat => {
        if (!tables[seat.table_number]) {
            tables[seat.table_number] = [];
        }
        tables[seat.table_number].push(seat);
    });
    
    container.innerHTML = '';
    
    for (let tableNum = 1; tableNum <= 10; tableNum++) {
        const tableSeats = tables[tableNum] || [];
        const tableDiv = document.createElement('div');
        tableDiv.className = 'table-card';
        
        tableDiv.innerHTML = `
            <div class="table-title">Table ${tableNum}</div>
            <div class="chairs">
                ${tableSeats.map(seat => `
                    <div class="chair ${seat.status === 'available' ? 'available' : (seat.reached ? 'reached' : 'booked')}" 
                         onclick="handleSeatClick(${seat.id}, '${seat.status}', ${seat.reached})">
                        Chair ${seat.chair_number}
                        <div class="chair-info">
                            ${seat.status === 'booked' && !seat.reached ? 
                                `<small>Booked by: ${seat.booked_by || 'Unknown'}<br>
                                 Expires: ${new Date(seat.expires_at).toLocaleTimeString()}</small>` : 
                             seat.reached ? 
                                `<small>✓ Reached & Confirmed</small>` : 
                                `<small>Available</small>`
                            }
                        </div>
                        ${seat.status === 'available' ? 
                            `<button class="btn-book" onclick="event.stopPropagation(); bookSeat(${seat.id})">Book Now</button>` : 
                            ''
                        }
                    </div>
                `).join('')}
            </div>
        `;
        
        container.appendChild(tableDiv);
    }
}

function handleSeatClick(seatId, status, reached) {
    if (status === 'available') {
        bookSeat(seatId);
    } else if (status === 'booked' && !reached) {
        showStatus('This seat is already booked!', 'error');
    } else if (reached) {
        showStatus('This seat has been reached and confirmed!', 'error');
    }
}

async function bookSeat(seatId) {
    const studentName = document.getElementById('studentName')?.value;
    const studentId = document.getElementById('studentId')?.value;
    
    if (!studentName || !studentId) {
        showStatus('Please enter your name and student ID', 'error');
        return;
    }
    
    // Validate student ID format
    const studentIdRegex = /^STU\d{8}$/;
    if (!studentIdRegex.test(studentId)) {
        showStatus('Invalid Student ID format. Use STU followed by 8 digits (e.g., STU20240001)', 'error');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/seats/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ seatId, studentId, studentName })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showStatus(`✅ ${data.message} You have 30 minutes to reach your seat!`, 'success');
            loadSeats(); // Refresh display
        } else {
            showStatus(`❌ ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus('Error booking seat. Please try again.', 'error');
    }
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('bookingStatus');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `booking-status ${type}`;
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

// Admin Portal Functions
let adminToken = null;

async function adminLogin() {
    const username = document.getElementById('adminUsername')?.value;
    const password = document.getElementById('adminPassword')?.value;
    
    if (!username || !password) {
        alert('Please enter username and password');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:3000/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            adminToken = data.token;
            localStorage.setItem('adminToken', adminToken);
            localStorage.setItem('adminName', data.username);
            showAdminPanel();
            loadAdminSeats();
            loadStatistics();
            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(() => {
                loadAdminSeats();
                loadStatistics();
            }, 10000);
        } else {
            alert('Login failed: ' + data.error);
        }
    } catch (error) {
        alert('Error logging in');
    }
}

function showAdminPanel() {
    const loginSection = document.getElementById('loginSection');
    const adminPanel = document.getElementById('adminPanel');
    const adminNameSpan = document.getElementById('adminName');
    
    if (loginSection) loginSection.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';
    if (adminNameSpan) adminNameSpan.textContent = localStorage.getItem('adminName');
}

function adminLogout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminName');
    adminToken = null;
    
    const loginSection = document.getElementById('loginSection');
    const adminPanel = document.getElementById('adminPanel');
    
    if (loginSection) loginSection.style.display = 'block';
    if (adminPanel) adminPanel.style.display = 'none';
    
    if (refreshInterval) clearInterval(refreshInterval);
}

async function loadAdminSeats() {
    if (!adminToken) return;
    
    try {
        const response = await fetch('http://localhost:3000/api/admin/seats', {
            headers: {
                'Authorization': adminToken
            }
        });
        
        const seats = await response.json();
        displayAdminSeats(seats);
    } catch (error) {
        console.error('Error loading admin seats:', error);
    }
}

function displayAdminSeats(seats) {
    const container = document.getElementById('adminSeatsContainer');
    if (!container) return;
    
    // Group seats by table
    const tables = {};
    seats.forEach(seat => {
        if (!tables[seat.table_number]) {
            tables[seat.table_number] = [];
        }
        tables[seat.table_number].push(seat);
    });
    
    container.innerHTML = '';
    
    for (let tableNum = 1; tableNum <= 10; tableNum++) {
        const tableSeats = tables[tableNum] || [];
        const tableDiv = document.createElement('div');
        tableDiv.className = 'table-card';
        
        tableDiv.innerHTML = `
            <div class="table-title">Table ${tableNum}</div>
            <div class="chairs">
                ${tableSeats.map(seat => `
                    <div class="chair ${seat.status === 'available' ? 'available' : (seat.reached ? 'reached' : 'booked')}">
                        Chair ${seat.chair_number}
                        <div class="chair-info">
                            ${seat.status === 'booked' ? 
                                `<small>
                                    <strong>Booked by:</strong> ${seat.booked_by || 'Unknown'}<br>
                                    <strong>Student ID:</strong> ${seat.student_id || 'N/A'}<br>
                                    <strong>Booked at:</strong> ${seat.booked_at ? new Date(seat.booked_at).toLocaleTimeString() : 'N/A'}<br>
                                    <strong>Expires at:</strong> ${seat.expires_at ? new Date(seat.expires_at).toLocaleTimeString() : 'N/A'}<br>
                                    <strong>Reached:</strong> ${seat.reached ? 'Yes ✓' : 'No ⏳'}
                                </small>` : 
                             seat.reached ? 
                                `<small>✓ Reached & Confirmed</small>` : 
                                `<small>Available for booking</small>`
                            }
                        </div>
                        ${seat.status === 'booked' ? 
                            `<button class="btn-danger" onclick="removeBooking(${seat.id})">Remove Booking</button>` : 
                            ''
                        }
                        ${seat.status === 'booked' && seat.reached === 0 ? 
                            `<button class="btn-primary" onclick="resetSeat(${seat.id})" style="margin-top: 5px;">Reset Seat</button>` : 
                            ''
                        }
                    </div>
                `).join('')}
            </div>
        `;
        
        container.appendChild(tableDiv);
    }
}

async function removeBooking(seatId) {
    if (!confirm('Are you sure you want to remove this booking?')) return;
    
    try {
        const response = await fetch(`http://localhost:3000/api/admin/booking/${seatId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': adminToken
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Booking removed successfully!');
            loadAdminSeats();
            loadStatistics();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error removing booking');
    }
}

async function resetSeat(seatId) {
    if (!confirm('Are you sure you want to reset this seat? This will make it available again.')) return;
    
    try {
        const response = await fetch(`http://localhost:3000/api/admin/reset/${seatId}`, {
            method: 'POST',
            headers: {
                'Authorization': adminToken,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Seat reset successfully!');
            loadAdminSeats();
            loadStatistics();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error resetting seat');
    }
}

async function loadStatistics() {
    if (!adminToken) return;
    
    try {
        const response = await fetch('http://localhost:3000/api/admin/statistics', {
            headers: {
                'Authorization': adminToken
            }
        });
        
        const stats = await response.json();
        displayStatistics(stats);
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function displayStatistics(stats) {
    const container = document.getElementById('statistics');
    if (!container) return;
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${stats.totalSeats}</div>
            <div class="stat-label">Total Seats</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.availableSeats}</div>
            <div class="stat-label">Available Seats</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.bookedSeats}</div>
            <div class="stat-label">Booked Seats</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.reachedSeats}</div>
            <div class="stat-label">Reached Seats</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.activeBookings}</div>
            <div class="stat-label">Active Bookings (Not Reached)</div>
        </div>
    `;
}

// Check for existing admin session on page load
if (window.location.pathname.includes('admin.html')) {
    const savedToken = localStorage.getItem('adminToken');
    const savedName = localStorage.getItem('adminName');
    
    if (savedToken && savedName) {
        adminToken = savedToken;
        showAdminPanel();
        loadAdminSeats();
        loadStatistics();
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => {
            loadAdminSeats();
            loadStatistics();
        }, 10000);
    }
}