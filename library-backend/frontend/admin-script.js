let adminToken = null;
let allSeats = [];

async function adminLogin() {
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    if (!username || !password) {
        alert('Please enter username and password');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            adminToken = response.token;
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            document.getElementById('adminName').textContent = data.admin.full_name || data.admin.username;
            loadStatistics();
            loadAdminSeats();
        } else {
            alert('Login failed: ' + data.error);
        }
    } catch (error) {
        alert('Error logging in: ' + error.message);
    }
}

function adminLogout() {
    adminToken = null;
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
}

async function loadStatistics() {
    try {
        const response = await fetch('/api/admin/statistics');
        const data = await response.json();
        
        document.getElementById('statistics').innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${data.total_seats}</div>
                <div class="stat-label">Total Seats</div>
            </div>
            <div class="stat-card available">
                <div class="stat-number">${data.available_seats}</div>
                <div class="stat-label">Available</div>
            </div>
            <div class="stat-card booked">
                <div class="stat-number">${data.booked_seats}</div>
                <div class="stat-label">Booked</div>
            </div>
            <div class="stat-card active">
                <div class="stat-number">${data.active_bookings}</div>
                <div class="stat-label">Active Bookings</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.total_students}</div>
                <div class="stat-label">Total Students</div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadAdminSeats() {
    try {
        const response = await fetch('/api/admin/seats');
        allSeats = await response.json();
        filterSeatsByFloor();
    } catch (error) {
        console.error('Error loading seats:', error);
    }
}

function filterSeatsByFloor() {
    const floorFilter = document.getElementById('floorFilter').value;
    let filteredSeats = allSeats;
    
    if (floorFilter !== 'all') {
        filteredSeats = allSeats.filter(seat => seat.floor_number == floorFilter);
    }
    
    displayAdminSeats(filteredSeats);
}

function displayAdminSeats(seats) {
    const container = document.getElementById('seatsContainer');
    document.getElementById('bookingsContainer').innerHTML = '';
    
    if (!seats || seats.length === 0) {
        container.innerHTML = '<p>No seats found.</p>';
        return;
    }
    
    container.innerHTML = seats.map(seat => {
        let statusClass = seat.status;
        let statusText = seat.status.toUpperCase();
        let bookingInfo = '';
        
        if (seat.booking_id) {
            statusText = 'BOOKED';
            bookingInfo = `
                <div class="seat-info">
                    <small>Booked by: ${seat.student_name || seat.student_id}<br>
                    Expires: ${new Date(seat.expires_at).toLocaleTimeString()}<br>
                    Verified: ${seat.verified ? 'Yes' : 'No'}</small>
                </div>
                <button onclick="verifyBooking(${seat.booking_id})" class="btn-primary" style="margin-top:5px">Verify</button>
                <button onclick="removeBooking(${seat.booking_id})" class="btn-danger" style="margin-top:5px">Remove</button>
            `;
        } else {
            bookingInfo = '<div class="seat-info"><small>Available</small></div>';
        }
        
        return `
            <div class="seat-card ${statusClass}">
                <strong>${seat.seat_label}</strong>
                <div class="seat-info">
                    Floor ${seat.floor_number}, Table ${seat.table_number}, Seat ${seat.seat_number}
                </div>
                ${bookingInfo}
            </div>
        `;
    }).join('');
}

async function verifyBooking(bookingId) {
    if (!confirm('Verify this booking?')) return;
    
    try {
        const response = await fetch(`/api/admin/verify/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_name: 'admin' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Booking verified successfully!');
            loadAdminSeats();
            loadStatistics();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error verifying booking: ' + error.message);
    }
}

async function removeBooking(bookingId) {
    if (!confirm('Remove this booking? The seat will become available.')) return;
    
    try {
        const response = await fetch(`/api/admin/booking/${bookingId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Booking removed successfully!');
            loadAdminSeats();
            loadStatistics();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error removing booking: ' + error.message);
    }
}

async function loadAllBookings() {
    try {
        const response = await fetch('/api/admin/bookings');
        const bookings = await response.json();
        
        const container = document.getElementById('bookingsContainer');
        document.getElementById('seatsContainer').innerHTML = '';
        
        if (!bookings || bookings.length === 0) {
            container.innerHTML = '<p>No bookings found.</p>';
            return;
        }
        
        container.innerHTML = `
            <h3>All Bookings</h3>
            <table class="bookings-table">
                <thead>
                    <tr>
                        <th>ID</th><th>Student</th><th>Seat</th><th>Booked At</th><th>Expires</th><th>Verified</th><th>Cancelled</th>
                    </tr>
                </thead>
                <tbody>
                    ${bookings.map(booking => `
                        <tr>
                            <td>${booking.id}</td>
                            <td>${booking.student_name} (${booking.student_id})</td>
                            <td>${booking.seat_label}</td>
                            <td>${new Date(booking.booking_time).toLocaleString()}</td>
                            <td>${new Date(booking.expires_at).toLocaleString()}</td>
                            <td>${booking.verified ? 'Yes' : 'No'}</td>
                            <td>${booking.cancelled ? 'Yes' : 'No'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}
