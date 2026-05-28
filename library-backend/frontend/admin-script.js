/**
 * ADMIN PORTAL SCRIPT
 * Handles admin login, seat management, booking verification, and statistics
 */

let adminLoggedIn = false;
let allSeatsData = [];

/**
 * ADMIN LOGIN
 * Authenticates admin user and loads dashboard
 */
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
            adminLoggedIn = true;
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            document.getElementById('adminName').textContent = data.admin.full_name || data.admin.username;
            loadStatistics();  // Load dashboard stats
            loadAllSeats();    // Load seat map
        } else {
            alert('Login failed: ' + data.error);
        }
    } catch (error) {
        alert('Error logging in: ' + error.message);
    }
}

/**
 * ADMIN LOGOUT
 * Returns to login form
 */
function adminLogout() {
    adminLoggedIn = false;
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
}

/**
 * LOAD STATISTICS
 * Fetches and displays system statistics on dashboard
 */
async function loadStatistics() {
    try {
        const response = await fetch('/api/admin/statistics');
        const data = await response.json();
        
        document.getElementById('statistics').innerHTML = `
            <div class="stats-grid">
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
                <div class="stat-card">
                    <div class="stat-number">${data.active_bookings}</div>
                    <div class="stat-label">Active Bookings</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${data.total_students}</div>
                    <div class="stat-label">Total Students</div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

/**
 * LOAD ALL SEATS
 * Fetches all seats with booking information from backend
 */
async function loadAllSeats() {
    try {
        const response = await fetch('/api/admin/seats');
        allSeatsData = await response.json();
        filterByFloor();  // Apply floor filter
    } catch (error) {
        console.error('Error loading seats:', error);
        document.getElementById('seatsContainer').innerHTML = '<p>Error loading seats</p>';
    }
}

/**
 * FILTER SEATS BY FLOOR
 * Applies floor filter to seat display
 */
function filterByFloor() {
    const floorFilter = document.getElementById('floorFilter').value;
    let filtered = allSeatsData;
    
    if (floorFilter !== 'all') {
        filtered = allSeatsData.filter(seat => seat.floor_number == floorFilter);
    }
    
    displayVisualTables(filtered);
}

/**
 * DISPLAY VISUAL TABLES
 * Renders the seat map with tables and chairs
 * Shows booking details and action buttons for occupied seats
 */
function displayVisualTables(seats) {
    const container = document.getElementById('seatsContainer');
    document.getElementById('bookingsContainer').innerHTML = '';
    
    if (!seats || seats.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:40px;">No seats available</p>';
        return;
    }
    
    // Group seats by floor
    const floors = {};
    seats.forEach(seat => {
        if (!floors[seat.floor_number]) floors[seat.floor_number] = [];
        floors[seat.floor_number].push(seat);
    });
    
    let html = '';
    
    for (const [floorNum, floorSeats] of Object.entries(floors)) {
        const floorName = floorNum === '1' ? 'Ground Floor' : 'First Floor';
        
        // Group seats by table
        const tables = {};
        floorSeats.forEach(seat => {
            if (!tables[seat.table_number]) tables[seat.table_number] = [];
            tables[seat.table_number].push(seat);
        });
        
        html += `<div class="floor-section">`;
        html += `<div class="floor-title">${floorName}</div>`;
        html += `<div class="tables-grid">`;
        
        const sortedTables = Object.keys(tables).sort((a,b) => a - b);
        
        for (const tableNum of sortedTables) {
            const tableSeats = tables[tableNum];
            tableSeats.sort((a,b) => a.seat_number - b.seat_number);
            
            html += `
                <div class="table-card">
                    <div class="table-number">Table ${tableNum}</div>
                    <div class="table-layout">
                        <div class="chair ${getSeatClass(tableSeats[0])} chair-top-left" onclick="handleAdminSeatClick(${tableSeats[0].id})">
                            ${tableSeats[0].seat_number}
                        </div>
                        <div class="chair ${getSeatClass(tableSeats[1])} chair-top-right" onclick="handleAdminSeatClick(${tableSeats[1].id})">
                            ${tableSeats[1].seat_number}
                        </div>
                        <div class="chair ${getSeatClass(tableSeats[2])} chair-bottom-left" onclick="handleAdminSeatClick(${tableSeats[2].id})">
                            ${tableSeats[2].seat_number}
                        </div>
                        <div class="chair ${getSeatClass(tableSeats[3])} chair-bottom-right" onclick="handleAdminSeatClick(${tableSeats[3].id})">
                            ${tableSeats[3].seat_number}
                        </div>
                        <div class="table-rectangle"></div>
                    </div>
                    ${getBookingDetails(tableSeats)}
                </div>
            `;
        }
        
        html += `</div></div>`;
    }
    
    container.innerHTML = html;
}

/**
 * GET SEAT CSS CLASS
 * Returns appropriate CSS class based on seat status
 * - available: blue
 * - verified: green
 * - booked: red
 */
function getSeatClass(seat) {
    if (!seat) return '';
    if (seat.status === 'available') return 'available';
    if (seat.verified) return 'verified';
    return 'booked';
}

/**
 * GET BOOKING DETAILS HTML
 * Returns HTML for booking information and action buttons
 * Shows student name, booking date, expiry time
 * Includes Verify and Remove buttons for pending bookings
 */
function getBookingDetails(seats) {
    let details = '<div class="booking-details">';
    for (const seat of seats) {
        if (seat.status !== 'available' && seat.booking_id) {
            const statusBadge = seat.verified ? '✅ Verified' : '⏳ Pending';
            const bookingDate = seat.booking_date ? new Date(seat.booking_date).toLocaleDateString() : 'Not set';
            const bookingTime = seat.booking_time ? new Date(seat.booking_time).toLocaleString() : 'N/A';
            
            details += `
                <div class="booking-info">
                    <strong>Seat ${seat.seat_number}:</strong> ${statusBadge}<br>
                    <small>Booked by: ${seat.student_name || seat.student_id}</small><br>
                    <small>Booking Date: ${bookingDate}</small><br>
                    <small>Booked at: ${bookingTime}</small><br>
                    <small>Expires: ${seat.expires_at ? new Date(seat.expires_at).toLocaleTimeString() : 'N/A'}</small>
                    <div class="admin-buttons">
                        ${!seat.verified ? `<button class="btn-primary btn-small" onclick="verifyBooking(${seat.booking_id})">Verify</button>` : ''}
                        <button class="btn-danger btn-small" onclick="removeBooking(${seat.booking_id})">Remove</button>
                    </div>
                </div>
            `;
        }
    }
    details += '</div>';
    return details;
}

/**
 * HANDLE ADMIN SEAT CLICK
 * Shows detailed information about a seat when clicked
 */
async function handleAdminSeatClick(seatId) {
    const seat = allSeatsData.find(s => s.id === seatId);
    if (seat && seat.status !== 'available') {
        const bookingDate = seat.booking_date ? new Date(seat.booking_date).toLocaleDateString() : 'N/A';
        alert(`Seat ${seat.seat_label}\nStatus: ${seat.verified ? 'Verified' : 'Booked'}\nBooked by: ${seat.student_name || seat.student_id}\nBooking Date: ${bookingDate}\nExpires: ${seat.expires_at ? new Date(seat.expires_at).toLocaleString() : 'N/A'}`);
    } else {
        alert(`Seat ${seat.seat_label} is available`);
    }
}

/**
 * VERIFY BOOKING
 * Confirms that a student has arrived and marks booking as verified
 */
async function verifyBooking(bookingId) {
    if (!confirm('Verify this booking? This confirms the student has arrived.')) return;
    
    try {
        const response = await fetch(`/api/admin/verify/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_name: 'admin' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Booking verified successfully!');
            loadAllSeats();    // Refresh seat display
            loadStatistics();  // Update statistics
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error verifying booking: ' + error.message);
    }
}

/**
 * REMOVE BOOKING
 * Cancels a booking and releases the seat
 */
async function removeBooking(bookingId) {
    if (!confirm('Remove this booking? The seat will become available again.')) return;
    
    try {
        const response = await fetch(`/api/admin/booking/${bookingId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Booking removed successfully!');
            loadAllSeats();    // Refresh seat display
            loadStatistics();  // Update statistics
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error removing booking: ' + error.message);
    }
}

/**
 * LOAD ALL BOOKINGS
 * Displays all bookings in a table format
 * Shows student details, seat info, dates, and status
 */
async function loadAllBookings() {
    try {
        const response = await fetch('/api/admin/bookings');
        const bookings = await response.json();
        
        const container = document.getElementById('bookingsContainer');
        const seatsContainer = document.getElementById('seatsContainer');
        seatsContainer.innerHTML = '';
        container.style.display = 'block';
        
        if (!bookings || bookings.length === 0) {
            container.innerHTML = '<p>No bookings found.</p>';
            return;
        }
        
        let tableHtml = `
            <h3>All Bookings</h3>
            <table class="bookings-table">
                <thead>
                    <tr>
                        <th>ID</th><th>Student</th><th>Seat</th><th>Floor</th><th>Booking Date</th><th>Booked At</th><th>Expires</th><th>Status</th><th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (const booking of bookings) {
            let statusText = '';
            if (booking.verified) statusText = 'Verified ✓';
            else if (booking.cancelled) statusText = 'Cancelled ✗';
            else statusText = 'Pending ⏳';
            
            const bookingDate = booking.booking_date ? new Date(booking.booking_date).toLocaleDateString() : 'Today';
            
            tableHtml += `
                <tr>
                    <td>${booking.id}</td>
                    <td>${booking.student_name} (${booking.student_id})</small></td>
                    <td>${booking.seat_label}</td>
                    <td>${booking.floor_number === 1 ? 'Ground' : 'First'}</td>
                    <td><strong>${bookingDate}</strong></td>
                    <td>${new Date(booking.booking_time).toLocaleString()}</small></td>
                    <td>${new Date(booking.expires_at).toLocaleString()}</small></td>
                    <td>${statusText}</small></td>
                    <td>
                        ${!booking.verified && !booking.cancelled ? `<button class="btn-primary btn-small" onclick="verifyBooking(${booking.id})">Verify</button>` : ''}
                        <button class="btn-danger btn-small" onclick="removeBooking(${booking.id})">Remove</button>
                    </td>
                </tr>
            `;
        }
        
        tableHtml += `
                </tbody>
            </table>
            <button onclick="loadAllSeats()" class="btn-primary" style="margin-top:20px;">Back to Seats View</button>
        `;
        
        container.innerHTML = tableHtml;
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}