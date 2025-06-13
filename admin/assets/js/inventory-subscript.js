document.addEventListener("DOMContentLoaded", () => {
    const body = document.querySelector("body"),
        sidebar = body.querySelector(".custom-sidebar"),
        toggle = body.querySelector(".custom-toggle"),
        searchBox = body.querySelector(".search-box input"),
        modeSwitch = body.querySelector(".custom-toggle-switch"),
        modeText = body.querySelector(".custom-mode-text");

    // --- Restore sidebar state from localStorage ---
    if (localStorage.getItem("admin-sidebar-closed") === "true") {
        sidebar.classList.add("close");
    }

    // Sidebar toggle
    toggle.addEventListener("click", () => {
        const isClosed = sidebar.classList.toggle("close");
        localStorage.setItem("admin-sidebar-closed", isClosed);
    });

    // Search function
    searchBox.addEventListener("input", (searched) => {
        const value = searched.target.value.toLowerCase();
        const cards = document.querySelectorAll(".card_article");
    
        cards.forEach((card) => {
            const cardText = card.textContent.toLowerCase();
            const cardColor = card.querySelector(".card_color")?.dataset.color?.toLowerCase();
    
            if (cardText.includes(value) || (cardColor && cardColor.includes(value))) {
                card.style.display = "block";
            } else {
                card.style.display = "none";
            }
        });
    });

    // Open modal
    document
        .querySelector('[data-open="addProductModal"]')
        .addEventListener("click", () => {
            document.getElementById("addProductModal").classList.add("show");
        });

    document
        .querySelector(".card_container")
        .addEventListener("click", function (e) {
            const target = e.target.closest('[data-open="viewProductModal"]');

            if (target) {
                document
                    .getElementById("viewProductModal")
                    .classList.add("show");
            }
        });

    // Close modal
    document.querySelectorAll('[data-close="addProductModal"]').forEach(el => {
        el.addEventListener("click", () => {
            document.getElementById("addProductModal").classList.remove("show");
        });
    });

    document.querySelectorAll('[data-close="viewProductModal"]').forEach(e => {
        e.addEventListener("click", () => {
            document
                .getElementById("viewProductModal")
                .classList.remove("show");
        });
    });
});