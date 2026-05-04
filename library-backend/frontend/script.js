let currentStudent = null;

function showRegisterForm() {
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('bookingForm').style.display = 'none';
    document.getElementById('bookingsContainer').style.display = 'none';
    document.getElementById('studentInfo').style.display = 'none';
}

function showBookingForm() {
    if (!currentStudent) {
        showMessage('Please register first!', 'error');
        showRegisterForm();
        return;
    }
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('bookingForm').style.display = 'block';
    document.getElementById('bookingsContainer').style.display = 'none';
    loadSeats();
}

async function registerStudent() {
    const student_id = document.getElementById('regStudentId').value;
    const full_name = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    
    if (!student_id || !full_name) {
        showMessage('Student ID and Name are required!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/student/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id, full_name, email, phone })
        });
        
        const data = await response.json();
        
        if (data.success || data.student) {
            currentStudent = { student_id, full_name };
            document.getElementById('displayStudentId').textContent = student_id;
            document.getElementById('displayStudentName').textContent = full_name;
            document.getElementById('studentInfo').style.display = 'block';
            showMessage('Registration successful!', 'success');
            showBookingForm();
        } else {
            showMessage('Registration failed!', 'error');
        }
    } catch (error) {
        showMessage('Error: ' + error.message, 'error');
    }
}

async function loadSeats() {
    const floor = document.getElementById('floorSelect').value;
    let url = '/api/student/seats/available';
    if (floor) {
        url += `?floor=${floor}`;
    }
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        displaySeats(data.seats);
    } catch (error) {
        showMessage('Error loading seats: ' + error.message, 'error');
    }
}

function displaySeats(seats) {
    const container = document.getElementById('seatsContainer');
    
    if (!seats || seats.length === 0) {
        container.innerHTML = '<p>No available seats found.</p>';
        return;
    }
    
    container.innerHTML = seats.map(seat => `
        <div class="seat-card available" onclick="bookSeat(${seat.id})">
            <strong>${seat.seat_label}</strong>
            <div class="seat-info">
                Floor ${seat.floor_number}, Table ${seat.table_number}, Seat ${seat.seat_number}
            </div>
        </div>
    `).join('');
}

async function bookSeat(seatId) {
    if (!currentStudent) {
        showMessage('Please register first!', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/student/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: currentStudent.student_id,
                seat_id: seatId,
                student_name: currentStudent.full_name
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success');
            loadSeats();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Error booking seat: ' + error.message, 'error');
    }
}

async function viewMyBookings() {
    if (!currentStudent) {
        showMessage('Please register first!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/student/my-bookings/${currentStudent.student_id}`);
        const data = await response.json();
        displayBookings(data.bookings);
    } catch (error) {
        showMessage('Error loading bookings: ' + error.message, 'error');
    }
}

function displayBookings(bookings) {
    const container = document.getElementById('bookingsContainer');
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('bookingForm').style.display = 'none';
    container.style.display = 'block';
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p>No bookings found.</p>';
        return;
    }
    
    container.innerHTML = `
        <h3>My Bookings</h3>
        <table class="bookings-table">
            <thead>
                <tr><th>Seat</th><th>Booking Time</th><th>Expires At</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
                ${bookings.map(booking => `
                    <tr>
                        <td>${booking.seat_label}</td>
                        <td>${new Date(booking.booking_time).toLocaleString()}</td>
                        <td>${new Date(booking.expires_at).toLocaleString()}</td>
                        <td>${booking.verified ? 'Verified' : booking.cancelled ? 'Cancelled' : 'Pending Verification'}</td>
                        <td>${!booking.verified && !booking.cancelled ? `<button onclick="cancelBooking(${booking.id})" class="btn-danger">Cancel</button>` : ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
        const response = await fetch(`/api/student/booking/${bookingId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('Booking cancelled successfully!', 'success');
            viewMyBookings();
        } else {
            showMessage(data.error, 'error');
        }
    } catch (error) {
        showMessage('Error cancelling booking: ' + error.message, 'error');
    }
}

function showMessage(msg, type) {
    const msgDiv = document.getElementById('message');
    msgDiv.textContent = msg;
    msgDiv.className = `message ${type}`;
    setTimeout(() => {
        msgDiv.style.display = 'none';
    }, 5000);
}
