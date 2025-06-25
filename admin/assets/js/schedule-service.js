import {
    chandriaDB,
    collection,
    getDocs
} from "./sdk/chandrias-sdk.js";

$(document).ready(function () {

    let allAppointments = [];
    // DISPLAY APPOINTMENTS FUNCTION
    async function displayAppointments() {
        const querySnapshot = await getDocs(collection(chandriaDB, "appointments"));
        allAppointments = [];
        let appointmentID = 1;
        querySnapshot.forEach(doc => {
            const data = doc.data();
            allAppointments.push({
                id: appointmentID++,
                customerName: data.customerName,
                customerEmail: data.customerEmail,
                checkoutDate: data.checkoutDate,
                checkoutTime: data.checkoutTime,
                checkoutStatus: data.checkoutStatus || 'Upcoming',
                productId: data.productId || '',
                productImage: data.productImage || ''
            });
        });
        renderAppointments(allAppointments);
    }

    function renderAppointments(appointments) {
        const tbody = $("#appointment-body");
        tbody.empty();
        appointments.forEach(app => {
            const row = `<tr>
                <td>${app.id}</td>
                <td>${app.customerName}</td>
                <td>${app.customerEmail}</td>
                <td>${app.checkoutDate} ${app.checkoutTime}</td>
                <td class="status-upcoming">${app.checkoutStatus}</td>
                <td><button class="view-product-btn" data-product-id="${app.productId}" data-product-image="${app.productImage}">View</button></td>
            </tr>`;
            tbody.append(row);
        });
    }

    function filterAppointments() {
        const search = $("#search").val().toLowerCase();
        const date = $("#appointment-date").val();
        const time = $("#appointment-time").val();
        let filtered = allAppointments.filter(app => {
            let matches = true;
            // Match by ID (as string), customer name, or email
            if (search) {
                const idStr = String(app.id);
                if (
                    !idStr.includes(search) &&
                    !app.customerName.toLowerCase().includes(search) &&
                    !app.customerEmail.toLowerCase().includes(search)
                ) matches = false;
            }
            if (date && app.checkoutDate !== date) matches = false;
            if (time && app.checkoutTime !== time) matches = false;
            return matches;
        });
        renderAppointments(filtered);
    }

    $("#search, #appointment-date, #appointment-time").on("input change", filterAppointments);

    displayAppointments();
});
