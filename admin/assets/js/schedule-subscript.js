$(document).ready(function () {
    const $body = $('body'),
        $sidebar = $body.find('.sidebar'),
        $toggle = $body.find('.toggle');

    // --- Restore sidebar state from localStorage ---
    if (localStorage.getItem("admin-sidebar-closed") === "true") {
        $sidebar.addClass("close");
    }

    // Sidebar toggle (chevron)
    $toggle.on("click", function () {
        const isClosed = $sidebar.toggleClass("close").hasClass("close");
        localStorage.setItem("admin-sidebar-closed", isClosed);
    });

    // Modal logic for product view
    const $productViewModal = $('#product-view-modal');
    const $productViewClose = $('#product-view-close');
    const $modalProductId = $('#modal-product-id');
    const $modalProductImage = $('#modal-product-image');

    $('tbody').on('click', '.view-product-btn', function () {
        const productId = $(this).data('product-id');
        $modalProductId.text(productId);
        $modalProductImage.attr('src', `/admin/images/${productId}.png`);
        $productViewModal.show();
    });

    $productViewClose.on('click', function () {
        $productViewModal.hide();
    });

    $(window).on('click', function (e) {
        if ($(e.target).is($productViewModal)) {
            $productViewModal.hide();
        }
    });

    // Search functionality
    $('#search').on('input', function () {
        const keyword = $(this).val().toLowerCase();
        const filtered = appointments.filter(app => app.customer.toLowerCase().includes(keyword));
        renderAppointments(filtered);
    });
    
    // MODAL TOGGLER
    $(document).on("click", ".view-btn", function () {
        $(".schedule-modal-container").addClass("show");
    });
    
    $(".schedule-modal-container, #btn-close").on("click", function (e) {
        $(".schedule-modal-container").removeClass("show");
    });
    // PREVENT DEFAULTS
    $(".schedule-modal").on("click", function (e) {
        e.stopPropagation();
    });
   
});