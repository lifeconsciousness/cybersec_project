import { useState } from "react";

const BookingForm = () => {
    const [formData, setFormData] = useState({ name: "", date: "", time: "", people: 1 });
    const [message, setMessage] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = await fetch("http://localhost:3000/api/book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });

        const data = await response.json();
        if (response.ok) {
            setMessage("Booking confirmed!");
        } else {
            setMessage(data.error);
        }
    };

    return (
        <div>
            <h2>Book a Table</h2>
            <form onSubmit={handleSubmit}>
                <input type="text" name="name" placeholder="Your Name" onChange={handleChange} required />
                <input type="date" name="date" onChange={handleChange} required />
                <input type="time" name="time" onChange={handleChange} required />
                <input type="number" name="people" min="1" max="10" onChange={handleChange} required />
                <button type="submit">Book Now</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default BookingForm;
