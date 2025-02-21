import { useEffect, useState } from "react";

const BookingList = () => {
    const [bookings, setBookings] = useState([]);

    useEffect(() => {
        fetch("http://localhost:3000/api/bookings")
            .then((response) => response.json())
            .then((data) => setBookings(data));
    }, []);

    return (
        <div>
            <h2>Current Bookings</h2>
            <ul>
                {bookings.map((booking) => (
                    <li key={booking.id}>
                        {booking.name} - {booking.date} at {booking.time} for {booking.people} people
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default BookingList;
