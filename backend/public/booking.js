const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const bookingsFile = path.join(__dirname, 'bookings.json');

// Ensure the bookings file exists
if (!fs.existsSync(bookingsFile)) {
    fs.writeFileSync(bookingsFile, JSON.stringify([]));
}

// Get all bookings
router.get('/bookings', (req, res) => {
    const bookings = JSON.parse(fs.readFileSync(bookingsFile));
    res.json(bookings);
});

// Create a new booking
router.post('/book', (req, res) => {
    const { name, date, time, people } = req.body;

    if (!name || !date || !time || !people) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const newBooking = { id: Date.now(), name, date, time, people };
    const bookings = JSON.parse(fs.readFileSync(bookingsFile));
    bookings.push(newBooking);
    fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));

    res.status(201).json({ message: 'Booking successful', booking: newBooking });
});

// Export the router
module.exports = router;
