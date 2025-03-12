// Function to fetch the logged-in user's username
function fetchUsername() {
    fetch("/auth/get-username")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Not logged in");
        }
        return response.json();
      })
      .then((data) => {
        document.getElementById("username").textContent = ", " + data.username;
      })
      .catch((error) => {
        console.error("Error:", error);
        document.getElementById("username").textContent = "";
      });
  }
  
  // Fetch available tables
  function fetchTables() {
    const date = document.getElementById("date").value;
  
    if (!date) {
      alert("Please select a date first!");
      return;
    }
  
    fetch(`/api/available-tables?date=${date}`)
      .then((response) => response.json())
      .then((data) => {
        console.log(data)
        const tableSelect = document.getElementById("tables");
        tableSelect.innerHTML = ""; // Clear previous options
  
        if (data.availableTables.length === 0) {
          const option = document.createElement("option");
          option.value = "";
          option.textContent = "No tables available";
          option.disabled = true;
          tableSelect.appendChild(option);
          return;
        }
  
        for (let i = 1; i <= data.availableTables.length; i++) {
          const option = document.createElement("option");
          option.value = i;
          option.textContent = `${i} Tables`;
          tableSelect.appendChild(option);
        }
      })
      .catch((error) => console.error("Error fetching tables:", error));
  }
  
  // Handle table booking
  document.getElementById("bookingForm").addEventListener("submit", function (event) {
    event.preventDefault();
  
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const people = document.getElementById("people").value;
    const tables = document.getElementById("tables").value;
  
    fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, time, people, tables }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data)
        fetchTables();
        fetchUserBookings();
        alert(data.message || data.error);
      });
  });
  
  // Fetch user bookings
  function fetchUserBookings() {
    fetch("/api/user-bookings")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Not logged in");
        }
        return response.json();
      })
      .then((data) => {
        
        const tableBody = document.querySelector("#bookingsTable tbody");
        tableBody.innerHTML = "";
  
        if (data.length === 0) {
          tableBody.innerHTML = "<tr><td colspan='3'>No bookings found</td></tr>";
          return;
        }
  
        data.forEach((booking) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${booking.date}</td>
            <td>${booking.people}</td>
            <td>${booking.table_number}</td>
          `;
          tableBody.appendChild(row);
        });
      })
      .catch((error) => console.error("Error fetching bookings:", error));
  }
  
  // Initialize page logic when content is loaded
  document.addEventListener("DOMContentLoaded", function () {
    const today = new Date().toISOString().split("T")[0]; // Get today's date
    document.getElementById("date").value = today;
    fetchTables();
    fetchUsername();
    fetchUserBookings();
  });
  
  // Event listeners for table availability updates
  document.getElementById("date").addEventListener("change", fetchTables);
  document.getElementById("time").addEventListener("change", fetchTables);
  