import {
    onAuthStateChanged,
    auth,
    doc,
    getDoc,
    chandriaDB,
    signOut
} from "./sdk/chandrias-sdk.js";

$(document).ready(function () {
    console.log("Dashboard Page.");
    // Initialize date and time display
    updateDateTime();
    // Update every second
    setInterval(updateDateTime, 1000);
});

// Date and Time Update Function
function updateDateTime() {
    const now = new Date();

    // Format date (e.g., "Wednesday, June 11, 2025")
    const dateOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    };

    // Format time (e.g., "1:00:00 PM")
    const timeOptions = {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    };

    const formattedDate = now.toLocaleDateString("en-US", dateOptions);
    const formattedTime = now.toLocaleTimeString("en-US", timeOptions);

    // Combine date and time with "at" connector
    const combinedDateTime = `${formattedDate} at ${formattedTime}`;

    // Update the single datetime display
    const dateTimeElement = document.getElementById("currentDateTime");

    if (dateTimeElement) {
        dateTimeElement.textContent = combinedDateTime;
    }
}
