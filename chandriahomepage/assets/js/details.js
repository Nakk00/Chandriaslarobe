import {
    onAuthStateChanged,
    auth,
    chandriaDB,
    getFirestore,
    collection,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    arrayUnion
} from "./sdk/chandrias-sdk.js";

// Import wishlist service
import wishlistService from "./wishlist-firebase.js";

// Global variables
let currentQuickViewProduct = null;

// #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
// DETAILS LOADER FUNCTIONS
function showDetailsLoader() {
    const detailsLoader = document.getElementById("details-loader");
    if (detailsLoader) {
        detailsLoader.classList.remove("hidden");
        detailsLoader.style.display = "flex";
    }
}

function hideDetailsLoader() {
    const detailsLoader = document.getElementById("details-loader");
    if (detailsLoader) {
        detailsLoader.classList.add("hidden");
        detailsLoader.style.display = "none";
    }
}

$(document).ready(async function () {
    // Get product ID from URL parameter first, then try localStorage if not found
    const urlParams = new URLSearchParams(window.location.search);
    let productId = urlParams.get("id");

    // If not found in URL, try to get from localStorage
    if (!productId) {
        productId = localStorage.getItem("selectedProductId");
    }

    if (!productId) {
        console.error("No product ID found in URL or localStorage");
        showErrorState(
            "No product ID specified. Please select a product from the shop."
        );
        setTimeout(() => {
            window.location.href = "shop.html";
        }, 2000);
        return;
    }

    // Store the product ID for later use
    localStorage.setItem("selectedProductId", productId);

    // Show loading spinner using centralized system
    if (typeof showSpinner === "function") {
        showSpinner("Loading product details...", "page-spinner");
    } else {
        showDetailsLoader();
    }
    try {
        // Wait for all async operations to complete
        console.log(
            "Details.js - Starting initialization, checking auth state first..."
        );
        console.log(
            "Details.js - Current user at init:",
            auth.currentUser ? auth.currentUser.uid : "No user"
        );
        await Promise.all([
            loadProductDetails(productId),
            wishlistService.updateWishlistCountUI(), // Add wishlist count update
            loadRelatedProducts(productId)
        ]);

        // Update heart button state after product details are loaded
        setTimeout(() => {
            updateHeartButtonStates();
        }, 100);
    } catch (error) {
        console.error("Error loading product details:", error);
        showErrorState("Error loading product details. Please try again.");
    } finally {
        // Hide loader after all operations complete (success or error)
        if (typeof hideSpinner === "function") {
            hideSpinner("page-spinner");
        } else {
            hideDetailsLoader();
        }
    }

    // Extract product loading logic into separate function
    async function loadProductDetails(productId) {
        // First try to load from products collection
        let docRef = doc(chandriaDB, "products", productId);
        let docSnap = await getDoc(docRef);
        let isAdditional = false;

        // If not found in products, try additionals collection
        if (!docSnap.exists()) {
            docRef = doc(chandriaDB, "additionals", productId);
            docSnap = await getDoc(docRef);
            isAdditional = true;
        }

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Add isAdditional flag to data
            data.isAdditional = isAdditional;

            // Image previews - handle differently for additionals vs regular products
            if (isAdditional) {
                // For additionals, use single image for both front and back
                const singleImage =
                    data.imageUrl ||
                    data.frontImageUrl ||
                    "assets/img/placeholder.jpg";
                $("#main-product-image").attr("src", singleImage);
                $(".frontImage").attr("src", singleImage);
                $(".backImage").attr("src", singleImage);

                // Set the first thumbnail as active
                $(".details-small-img").removeClass("active");
                $(".details-small-img.frontImage").first().addClass("active");
            } else {
                // For regular products, use separate front and back images with fallbacks
                const frontImage =
                    data.frontImageUrl ||
                    data.imageUrl ||
                    "assets/img/placeholder.jpg";
                const backImage =
                    data.backImageUrl ||
                    data.imageUrl ||
                    "assets/img/placeholder.jpg";

                $("#main-product-image").attr("src", frontImage);
                $(".frontImage").attr("src", frontImage);
                $(".backImage").attr("src", backImage);

                // Set the first thumbnail as active
                $(".details-small-img").removeClass("active");
                $(".details-small-img.frontImage").first().addClass("active");
            }

            // Text and values
            $("#product-name").text(data.name);
            $("#booking-product-name").text(data.name);
            $("#product-price").text(`₱ ${data.price}`);

            // Handle description differently for additionals vs regular products
            if (isAdditional) {
                if (data.inclusions && data.inclusions.length > 0) {
                    // Hide description and show inclusions table instead
                    $("#product-description").hide();
                    displayInclusionsTable(data.inclusions);

                    // Hide other info sections for additionals with inclusions (keep only color and quantity)
                    $(".product-list").hide();
                    $(".details-meta").hide();
                } else {
                    $("#product-description")
                        .text("No description has been added for this product.")
                        .show();
                    // Show all sections for additionals without inclusions
                    $(".product-list").show();
                    $(".details-meta").show();
                }
            } else {
                $("#product-description").text(data.description).show();
                // Show all sections for regular products
                $(".product-list").show();
                $(".details-meta").show();
            }

            $("#product-code").text(data.code);

            // Show color if available
            if (data.color) {
                $("#product-color").css("background-color", data.color);
            }

            // Load related products based on category and color
            if (isAdditional) {
                loadRelatedAdditionals(data.category, data.color, productId);
            } else {
                loadRelatedProducts(data.category, data.color, productId);
            }

            // Sizes (only for regular products, hide for additionals)
            const sizeList = $("#product-sizes");
            sizeList.empty();
            if (!isAdditional && data.size) {
                // Define size order
                const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

                // Sort sizes according to predefined order
                const sortedSizes = Object.entries(data.size)
                    .filter(([size, qty]) => qty > 0) // Only show sizes with stock
                    .sort(([sizeA], [sizeB]) => {
                        const indexA = sizeOrder.indexOf(sizeA);
                        const indexB = sizeOrder.indexOf(sizeB);
                        // If size not in predefined order, put it at the end
                        const orderA =
                            indexA === -1 ? sizeOrder.length : indexA;
                        const orderB =
                            indexB === -1 ? sizeOrder.length : indexB;
                        return orderA - orderB;
                    });

                // Add sizes to the list
                sortedSizes.forEach(([size, qty]) => {
                    sizeList.append(
                        `<li><a href="#" class="size-link" data-stock="${qty}">${size}</a></li>`
                    );
                });

                // Auto-select first available size if any
                if (sortedSizes.length > 0) {
                    const firstSize = sizeList.find(".size-link").first();
                    firstSize.addClass("size-active");

                    // Initialize mobile stock indicator with first size stock
                    const firstSizeStock =
                        parseInt(firstSize.data("stock")) || 0;
                    updateMobileStockIndicator(firstSizeStock);
                }

                sizeList.parent().show(); // Show the sizes section for regular products
            } else if (isAdditional) {
                sizeList.parent().hide(); // Hide only the sizes section for additionals
            }

            // Stock information (show for both but different content)
            if (!isAdditional && data.size) {
                const totalStock = Object.values(data.size).reduce(
                    (a, b) => a + b,
                    0
                );
                $("#product-stock").text(`${totalStock} in stocks`);
            } else if (isAdditional) {
                $("#product-stock").text("Available");
            } // Hide add to cart button only for additionals
            const addToCartBtn = $("#details-add-to-cart");
            if (isAdditional) {
                addToCartBtn.hide();
            } else {
                addToCartBtn.show();
            }
            // Set product ID on the main heart button for favorites functionality
            const heartButton = $("#details-add-to-favorites");
            if (heartButton.length) {
                heartButton.attr("data-product-id", productId);
                console.log("Set heart button product ID:", productId);
            }

            // Set up mobile sticky bar
            setupMobileStickyBar(productId);
        } else {
            throw new Error("Product not found.");
        }
    }

    // Create separate function for loading related products
    async function loadRelatedProducts(productId) {
        try {
            // This will be handled by the existing loadRelatedProducts function
            // that's already in the file
        } catch (error) {
            console.error("Error loading related products:", error);
            // Don't throw error here as it's not critical for main page load
        }
    }

    // NOTYF INITIALIZATION for notifications
    const notyf = new Notyf({
        position: {
            x: "center",
            y: "top"
        }
    });
    // AUTHENTICATION MODAL FUNCTIONS - Now handled by auth-modal.js module

    // Authentication modal event listeners
    $(document).on("click", ".auth-close, #auth-modal-cancel", function () {
        hideAuthModal();
    });

    $(document).on("click", "#auth-modal-login", function () {
        // No need to redirect to user_authentication.html anymore
        // Authentication is handled directly in the modal
    });

    // Close modal when clicking outside
    $(document).on("click", "#auth-modal", function (e) {
        if (e.target === this) {
            hideAuthModal();
        }
    });

    // Close modal on escape key
    $(document).on("keydown", function (e) {
        if (e.key === "Escape") {
            hideAuthModal();
        }
    });

    // Make showAuthModal globally accessible
    window.showAuthModal = showAuthModal;

    // Size selection functionality
    $(document).on("click", ".size-link", function (e) {
        e.preventDefault();
        $(".size-link").removeClass("size-active");
        $(this).addClass("size-active");

        // Update quantity max based on selected size stock
        const stock = parseInt($(this).data("stock")) || 1;
        const quantityInput = $("#details-quantity");
        quantityInput.attr("max", stock);

        // Update mobile stock indicator
        updateMobileStockIndicator(stock);

        // Adjust current quantity if it exceeds stock
        const currentQuantity = parseInt(quantityInput.val()) || 1;
        if (currentQuantity > stock) {
            quantityInput.val(stock);
            // Trigger change event to sync mobile sticky bar
            quantityInput[0].dispatchEvent(new Event("change"));
            if (typeof notyf !== "undefined") {
                notyf.warning(`Quantity adjusted to available stock: ${stock}`);
            }
        }
    });

    // Enhanced quantity input functionality
    $(document).on("input change", "#details-quantity", function () {
        const input = $(this);
        const value = parseInt(input.val()) || 1;
        const selectedSize = $(".size-active");
        const maxStock = selectedSize.length
            ? parseInt(selectedSize.data("stock")) || 999
            : 999;

        // Validate quantity bounds
        if (value < 1) {
            input.val(1);
            if (typeof notyf !== "undefined") {
                notyf.error("Minimum quantity is 1");
            }
        } else if (value > maxStock) {
            input.val(maxStock);
            if (typeof notyf !== "undefined") {
                notyf.error(
                    `Maximum available stock for this size is ${maxStock}`
                );
            }
        }
        // Sync mobile sticky bar quantity if it exists
        const stickyQuantity = document.querySelector(
            "#mobile-sticky-quantity"
        );
        if (stickyQuantity) {
            stickyQuantity.value = input.val();
        }

        // Add visual feedback for quantity change
        input.addClass("quantity-changed");
        setTimeout(() => input.removeClass("quantity-changed"), 500);
    });
    // Add to Cart functionality
    $("#details-add-to-cart").on("click", async function (e) {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            // Show authentication modal
            if (typeof window.showAuthModal === "function") {
                window.showAuthModal();
            } else {
                notyf.error("Please log in to add items to cart.");
            }
            return;
        }

        const button = $(this);
        const quantity = parseInt($("#details-quantity").val(), 10) || 1;
        const selectedSize = $(".size-active").text().trim();
        const productId = localStorage.getItem("selectedProductId");
        const productName = $("#product-name").text();

        if (!selectedSize) {
            notyf.error("Please select a size first");
            return;
        }

        if (quantity < 1) {
            notyf.error("Please enter a valid quantity.");
            return;
        }

        // Disable button and show loading state
        button.prop("disabled", true).text("Adding...");

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                alert("User account not found.");
                return;
            }

            const data = userSnap.data();
            const currentCart = data.added_to_cart || [];

            // Check if the same product with the same size is already in the cart
            const index = currentCart.findIndex(
                item =>
                    item.productId === productId && item.size === selectedSize
            );

            if (index !== -1) {
                // If found, update the quantity of that item
                currentCart[index].quantity = quantity;
                await updateDoc(userRef, { added_to_cart: currentCart });
                notyf.success("Cart item updated successfully.");
            } else {
                // If not found, add a new item to the cart
                await updateDoc(userRef, {
                    added_to_cart: arrayUnion({
                        productId,
                        productName,
                        size: selectedSize,
                        quantity
                    })
                });
                notyf.success("Added successfully to cart!");
            }

            // Update cart count
            await updateCartCount();
        } catch (error) {
            console.error("Error updating cart: ", error);
            notyf.error("An error occurred. Please try again.");
        } finally {
            // Re-enable button
            button.prop("disabled", false).text("Add to Rent List");
        }
    });

    // Main product favorites button functionality
    $(document).on("click", "#details-add-to-favorites", async function (e) {
        e.preventDefault();
        e.stopPropagation();

        const user = auth.currentUser;
        if (!user) {
            showAuthModal();
            return;
        }

        const button = $(this);
        const productId = button.data("product-id");

        if (!productId) return;

        // Add loading state with visual feedback
        button.addClass("loading");
        button.prop("disabled", true);
        const originalIcon = button.find("i").attr("class");
        button.find("i").removeClass().addClass("bx bx-loader-alt bx-spin");

        try {
            // Use the wishlist service to toggle the product
            const isNowInWishlist =
                await wishlistService.toggleWishlist(productId);

            // Update button state based on result
            if (isNowInWishlist) {
                button.find("i").removeClass().addClass("bx bxs-heart");
                button.addClass("favorited");
            } else {
                button.find("i").removeClass().addClass("bx bx-heart");
                button.removeClass("favorited");
            }

            // Update wishlist count
            await wishlistService.updateWishlistCountUI();
        } catch (error) {
            console.error("Error updating wishlist:", error);
            // Restore original icon on error
            button.find("i").removeClass().addClass(originalIcon);
        } finally {
            button.removeClass("loading");
            button.prop("disabled", false);

            // If there was an error, the icon was already restored above
            if (
                !button.find("i").hasClass("bx-heart") &&
                !button.find("i").hasClass("bxs-heart")
            ) {
                button.find("i").removeClass().addClass(originalIcon);
            }
        }
    });

    // Quick View button functionality
    $(document).on(
        "click",
        '#related-products-container .action-btn[aria-label="Quick View"]',
        function (e) {
            e.preventDefault();
            e.stopPropagation();

            const productId = $(this).data("product-id");
            if (productId) {
                // Open quick view modal instead of navigating
                openQuickView(productId);
            }
        }
    );
    // Add to Favorites button functionality
    $(document).on(
        "click",
        '#related-products-container .action-btn[aria-label="Add to Favorites"]',
        async function (e) {
            e.preventDefault();
            e.stopPropagation();

            const user = auth.currentUser;
            if (!user) {
                showAuthModal();
                return;
            }

            const button = $(this);
            const productId = button.data("product-id");

            if (!productId) return;

            // Add loading state with visual feedback
            button.addClass("loading");
            button.prop("disabled", true);
            const originalIcon = button.find("i").attr("class");
            button.find("i").removeClass().addClass("bx bx-loader-alt bx-spin");

            try {
                // Use the wishlist service to toggle the product
                const isNowInWishlist =
                    await wishlistService.toggleWishlist(productId);

                // Update button state based on result
                if (isNowInWishlist) {
                    button.find("i").removeClass().addClass("bx bxs-heart");
                    button.addClass("favorited");
                    // Add product item class for hover effect
                    button.closest(".product-item").addClass("in-wishlist");
                } else {
                    button.find("i").removeClass().addClass("bx bx-heart");
                    button.removeClass("favorited");
                    // Remove product item class for hover effect
                    button.closest(".product-item").removeClass("in-wishlist");
                }

                // Update wishlist count
                await wishlistService.updateWishlistCountUI();
            } catch (error) {
                console.error("Error updating wishlist:", error);
                // Restore original icon on error
                button.find("i").removeClass().addClass(originalIcon);
            } finally {
                button.removeClass("loading");
                button.prop("disabled", false);

                // If there was an error, the icon was already restored above
                if (
                    !button.find("i").hasClass("bx-heart") &&
                    !button.find("i").hasClass("bxs-heart")
                ) {
                    button.find("i").removeClass().addClass(originalIcon);
                }
            }
        }
    );

    // Color indicator tooltip for related products
    $(document).on(
        "click",
        "#related-products-container .product-color-indicator",
        function (e) {
            e.preventDefault();
            e.stopPropagation();

            const colorName = $(this).attr("title") || "Color";

            // Create or get tooltip
            let tooltip = $(".color-tooltip");
            if (tooltip.length === 0) {
                $("body").append('<div class="color-tooltip"></div>');
                tooltip = $(".color-tooltip");
            }

            // Position tooltip near the color indicator
            const position = $(this).offset();
            tooltip.text(colorName).css({
                top: position.top - 30,
                left: position.left - tooltip.width() / 2 + 12,
                opacity: 1,
                visibility: "visible"
            });

            // Hide tooltip after 2 seconds
            setTimeout(() => {
                tooltip.css({
                    opacity: 0,
                    visibility: "hidden"
                });
            }, 2000);
        }
    );

    // Add to booking button functionality for related products - redirect to product details
    $(document).on(
        "click",
        "#related-products-container .add-to-booking-btn",
        function (e) {
            e.preventDefault();
            e.stopPropagation();

            const button = $(this);
            const productId = button.data("product-id");

            if (productId) {
                window.location.href = `details.html?id=${productId}`;
            }
        }
    );

    // Cart count function
    async function updateCartCount() {
        const user = auth.currentUser;
        console.log(
            "Details.js updateCartCount - Current user:",
            user ? user.uid : "No user"
        );

        if (!user) {
            console.log(
                "Details.js updateCartCount - No user authenticated, setting count to 0"
            );
            $("#cart-count").text("0");
            return;
        }

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const data = userSnap.data();
                const cartItems = data.added_to_cart || [];
                console.log(
                    "Details.js updateCartCount - Cart items:",
                    cartItems
                );

                const totalCount = cartItems.reduce(
                    (sum, item) => sum + (parseInt(item.quantity, 10) || 1),
                    0
                );
                console.log(
                    "Details.js updateCartCount - Total count calculated:",
                    totalCount
                );

                $("#cart-count").text(totalCount.toString());
            } else {
                console.log(
                    "Details.js updateCartCount - User document does not exist"
                );
                $("#cart-count").text("0");
            }
        } catch (error) {
            console.error("Error fetching cart count: ", error);
            $("#cart-count").text("0");
        }
    }

    // Function to update all cart button statuses with visual validation
    async function updateAllCartButtonStatus() {
        const user = auth.currentUser;

        if (!user) {
            // If no user, set all buttons to "not in cart" state
            $(".circular-cart-btn, .add-to-cart-action-btn").attr(
                "data-in-cart",
                "false"
            );
            return;
        }

        try {
            const userRef = doc(chandriaDB, "userAccounts", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const cartItems = userSnap.data().added_to_cart || [];
                const cartProductIds = new Set(
                    cartItems.map(item => item.productId)
                );

                // Update each related product button
                $(".circular-cart-btn, .add-to-cart-action-btn").each(
                    function () {
                        const button = $(this);
                        const productId = button.data("product-id");

                        if (!productId) return;

                        // Check if this product is in cart (any size/quantity)
                        const isInCart = cartProductIds.has(productId);

                        // Set data attribute for CSS styling
                        button.attr(
                            "data-in-cart",
                            isInCart ? "true" : "false"
                        );
                    }
                );
            } else {
                // User document doesn't exist, set all to "not in cart"
                $(".circular-cart-btn, .add-to-cart-action-btn").attr(
                    "data-in-cart",
                    "false"
                );
            }
        } catch (error) {
            console.error("Error updating cart button status:", error);
            // On error, set all to "not in cart" as fallback
            $(".circular-cart-btn, .add-to-cart-action-btn").attr(
                "data-in-cart",
                "false"
            );
        }
    }
    // Function to update heart button states based on current wishlist
    async function updateHeartButtonStates() {
        const user = auth.currentUser;

        if (!user) {
            // If no user, ensure all hearts are empty and remove wishlist classes
            $(
                '#related-products-container .action-btn[aria-label="Add to Favorites"]'
            ).each(function () {
                $(this).find("i").removeClass("bxs-heart").addClass("bx-heart");
                $(this).removeClass("favorited");
                $(this).closest(".product-item").removeClass("in-wishlist");
            });
            // Also update the main details page heart button
            const mainHeartButton = $("#details-add-to-favorites");
            if (mainHeartButton.length) {
                mainHeartButton
                    .find("i")
                    .removeClass("bxs-heart")
                    .addClass("bx-heart");
                mainHeartButton.removeClass("favorited");
            }

            // Also update the mobile heart button
            const mobileHeartButton = $("#mobile-add-to-favorites");
            if (mobileHeartButton.length) {
                mobileHeartButton
                    .find("i")
                    .removeClass("bxs-heart")
                    .addClass("bx-heart");
                mobileHeartButton.removeClass("favorited");
            }
            return;
        }

        try {
            const wishlist = await wishlistService.getUserWishlist();
            // Update each related products heart button based on wishlist status (use both possible selectors)
            $(
                '#related-products-container .action-btn[aria-label="Add to Favorites"], #related-products-container .add-to-favorites-btn'
            ).each(function () {
                const button = $(this);
                const productId = button.data("product-id");
                const productItem = button.closest(".product-item");

                if (!productId) return;

                // Check if this product is in wishlist
                const isInWishlist = wishlist.some(
                    item => item.productId === productId
                );

                if (isInWishlist) {
                    button
                        .find("i")
                        .removeClass("bx-heart")
                        .addClass("bxs-heart");
                    button.addClass("favorited");
                    productItem.addClass("in-wishlist");
                } else {
                    button
                        .find("i")
                        .removeClass("bxs-heart")
                        .addClass("bx-heart");
                    button.removeClass("favorited");
                    productItem.removeClass("in-wishlist");
                }
            });

            // Update the main details page heart button
            const mainHeartButton = $("#details-add-to-favorites");
            if (mainHeartButton.length) {
                const mainProductId = mainHeartButton.data("product-id");
                if (mainProductId) {
                    const isMainProductInWishlist = wishlist.some(
                        item => item.productId === mainProductId
                    );
                    if (isMainProductInWishlist) {
                        mainHeartButton
                            .find("i")
                            .removeClass("bx-heart")
                            .addClass("bxs-heart");
                        mainHeartButton.addClass("favorited");
                    } else {
                        mainHeartButton
                            .find("i")
                            .removeClass("bxs-heart")
                            .addClass("bx-heart");
                        mainHeartButton.removeClass("favorited");
                    }
                }
            }

            // Update the mobile heart button with the same state as main button
            const mobileHeartButton = $("#mobile-add-to-favorites");
            if (mobileHeartButton.length) {
                const mobileProductId = mobileHeartButton.data("product-id");
                if (mobileProductId) {
                    const isMobileProductInWishlist = wishlist.some(
                        item => item.productId === mobileProductId
                    );

                    if (isMobileProductInWishlist) {
                        mobileHeartButton
                            .find("i")
                            .removeClass("bx-heart")
                            .addClass("bxs-heart");
                        mobileHeartButton.addClass("favorited");
                    } else {
                        mobileHeartButton
                            .find("i")
                            .removeClass("bxs-heart")
                            .addClass("bx-heart");
                        mobileHeartButton.removeClass("favorited");
                    }
                }
            }
        } catch (error) {
            console.error("Error updating heart button states:", error); // On error, set all to "not favorited" as fallback (use both possible selectors)
            $(
                '#related-products-container .action-btn[aria-label="Add to Favorites"], #related-products-container .add-to-favorites-btn'
            ).each(function () {
                $(this).find("i").removeClass("bxs-heart").addClass("bx-heart");
                $(this).removeClass("favorited");
                $(this).closest(".product-item").removeClass("in-wishlist");
            });
            // Also reset the main details page heart button on error
            const mainHeartButton = $("#details-add-to-favorites");
            if (mainHeartButton.length) {
                mainHeartButton
                    .find("i")
                    .removeClass("bxs-heart")
                    .addClass("bx-heart");
                mainHeartButton.removeClass("favorited");
            }

            // Also reset the mobile heart button on error
            const mobileHeartButton = $("#mobile-add-to-favorites");
            if (mobileHeartButton.length) {
                mobileHeartButton
                    .find("i")
                    .removeClass("bxs-heart")
                    .addClass("bx-heart");
                mobileHeartButton.removeClass("favorited");
            }
        }
    }

    // Format category name for display
    function formatCategoryName(category) {
        if (!category) return "Products";

        return category
            .split("-")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    // Function to load related products based on category and color
    async function loadRelatedProducts(category, color, currentProductId) {
        try {
            // Clear existing related products
            const productsContainer = document.getElementById(
                "related-products-container"
            );
            if (!productsContainer) return;

            productsContainer.innerHTML = ""; // Clear existing products

            // Get all products from Firestore
            const productsCollection = collection(chandriaDB, "products");
            const querySnapshot = await getDocs(productsCollection);

            // Get current product data to access sizes
            const currentProductRef = doc(
                chandriaDB,
                "products",
                currentProductId
            );
            const currentProductSnap = await getDoc(currentProductRef);
            const currentProductData = currentProductSnap.exists()
                ? currentProductSnap.data()
                : null;
            const currentProductSizes = currentProductData?.size
                ? Object.keys(currentProductData.size)
                : [];

            const allProducts = [];
            querySnapshot.forEach(doc => {
                if (doc.id !== currentProductId) {
                    // Exclude current product
                    allProducts.push({
                        id: doc.id,
                        ...doc.data()
                    });
                }
            });

            // Filter products by category (max 2)
            const categoryProducts = allProducts
                .filter(product => product.category === category)
                .slice(0, 2);

            // Filter products by color (max 2)
            const colorProducts = allProducts
                .filter(
                    product =>
                        product.color === color &&
                        !categoryProducts.some(p => p.id === product.id) // Avoid duplicates from category
                )
                .slice(0, 2);

            // If we have fewer than 2 color-matched products, try to find products with the same size
            let sizeProducts = [];
            if (colorProducts.length < 2 && currentProductSizes.length > 0) {
                sizeProducts = allProducts
                    .filter(product => {
                        // Avoid duplicates from already selected products
                        if (
                            categoryProducts.some(p => p.id === product.id) ||
                            colorProducts.some(p => p.id === product.id)
                        ) {
                            return false;
                        }

                        // Check if this product has any size that matches the current product
                        const productSizes = product.size
                            ? Object.keys(product.size)
                            : [];
                        return productSizes.some(size =>
                            currentProductSizes.includes(size)
                        );
                    })
                    .slice(0, 2 - colorProducts.length);
            }

            // Combine related products (up to 4 total)
            const relatedProducts = [
                ...categoryProducts,
                ...colorProducts,
                ...sizeProducts
            ].slice(0, 4);

            // If we still don't have 4 products, add random products
            if (relatedProducts.length < 4) {
                const randomProducts = allProducts
                    .filter(
                        product =>
                            !relatedProducts.some(p => p.id === product.id)
                    )
                    .sort(() => 0.5 - Math.random()) // Shuffle
                    .slice(0, 4 - relatedProducts.length);

                relatedProducts.push(...randomProducts);
            } // Render related products
            relatedProducts.forEach(product => {
                const productHTML = createProductHTML(product);
                productsContainer.innerHTML += productHTML;
            });

            // Set product data for centralized quick view system
            if (typeof setQuickViewData === "function") {
                setQuickViewData(allProducts, []);
            }
            // Update heart button states after products are loaded
            setTimeout(() => {
                updateHeartButtonStates();
                updateAllCartButtonStatus();
            }, 100);

            console.log("Related products loaded:", {
                category: categoryProducts.length,
                color: colorProducts.length,
                size: sizeProducts.length,
                random:
                    relatedProducts.length -
                    (categoryProducts.length +
                        colorProducts.length +
                        sizeProducts.length)
            });
        } catch (error) {
            console.error("Error loading related products:", error);
        }
    }

    // Function to create HTML for a product (complete version with size/quantity controls matching shop.html format)
    function createProductHTML(product) {
        // Debug: Log product data to check backImageUrl
        console.log("Product data:", {
            id: product.id,
            name: product.name,
            frontImageUrl: product.frontImageUrl,
            backImageUrl: product.backImageUrl
        });

        const availableSizes = product.size
            ? Object.keys(product.size).filter(size => product.size[size] > 0)
            : [];
        const categoryDisplay = formatCategoryName(product.category) || "Item";
        const price = product.price
            ? `₱ ${product.price}`
            : "Price available in-store";
        const imageUrl =
            product.frontImageUrl ||
            product.imageUrl ||
            "assets/img/placeholder.jpg";
        const backImageUrl = product.backImageUrl || imageUrl;
        const colorHex = product.color || "#f8f9fa";

        // Create size options HTML
        let sizeOptionsHTML = "";
        if (availableSizes.length > 0 && !product.isAdditional) {
            // Create options with stock information
            const sizeOptions = availableSizes
                .map(size => {
                    const stock = product.size[size];
                    return `<option value="${size}" data-stock="${stock}">${size} (${stock})</option>`;
                })
                .join("");

            // Get initial stock for first size
            const initialSize = availableSizes[0];
            const initialStock = product.size[initialSize];

            // Determine stock class
            let stockClass = "";
            if (initialStock <= 3) stockClass = "very-low-stock";
            else if (initialStock <= 5) stockClass = "low-stock";

            sizeOptionsHTML = `
        <div class="product-size-options">
            <div class="size-selection">
                <div class="size-selector-container">
                    <select class="size-selector" data-product-id="${
                        product.id
                    }">
                        ${sizeOptions}
                    </select>
                </div>
            </div>
            <div class="quantity-selection">
                <button class="quantity-btn minus-btn" data-product-id="${
                    product.id
                }">-</button>
                <span class="quantity-value" data-product-id="${
                    product.id
                }">1</span>
                <button class="quantity-btn plus-btn" data-product-id="${
                    product.id
                }" ${initialStock <= 1 ? "disabled" : ""}>+</button>
            </div>
        </div>`;
        }

        return `
    <div class="product-item">
        <div class="loading-state">
            <div class="loading-spinner"></div>
        </div>
        <div class="product-banner">
            <a href="details.html?id=${product.id}" class="product-images">
                <img src="${imageUrl}" alt="${
                    product.name || "Product"
                }" class="product-img default">
                <img src="${backImageUrl}" alt="${
                    product.name || "Product"
                }" class="product-img hover">
            </a>
            <div class="product-actions">
                <a href="#" class="action-btn quick-view-btn-trigger" aria-label="Quick View" data-product-id="${
                    product.id
                }">
                    <i class="fi fi-rs-eye"></i>
                </a>
                <button class="action-btn add-to-favorites-btn" aria-label="Add to Favorites" data-product-id="${
                    product.id
                }">
                    <i class="bx bx-heart"></i>
                </button>
            </div>
            
            <div class="price-tag">${price}</div>
            <div class="product-color-indicator" style="background-color: ${colorHex}" title="${
                product.colorName || "Color"
            }" data-product-id="${product.id}"></div>
        </div>
        <div class="product-content">
            <div class="product-header">
                <div class="product-info">
                    <span class="product-category">${categoryDisplay}</span>
                    <h3 class="product-title">${
                        product.name || "Untitled Product"
                    }</h3>
                </div>
                ${
                    !product.isAdditional
                        ? `
                <div class="product-header-buttons">
                    <button class="add-to-cart-action-btn" data-product-id="${product.id}" data-in-cart="false" title="View Details">
                        <i class="fi fi-rs-shopping-bag-add"></i>
                    </button>
                    <button class="circular-cart-btn" data-product-id="${product.id}" data-in-cart="false" title="Add to Cart">
                        <i class="fi fi-rs-shopping-cart-add"></i>
                    </button>
                </div>`
                        : ""
                }
            </div>
            ${sizeOptionsHTML}
        </div>
    </div>
    `;
    }

    // Enhanced error state function
    function showErrorState(message) {
        hideDetailsLoader();
        const productContainer =
            document.querySelector(".product-details") ||
            document.querySelector(".container");
        if (!productContainer) return;

        productContainer.innerHTML = `
        <div class="error-container">
            <div class="error-icon">
                <i class="fi fi-rs-exclamation"></i>
            </div>
            <h3>Oops! Something went wrong</h3>
            <p>${message}</p>
            <div class="error-actions">
                <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
                <a href="shop.html" class="back-btn">Back to Shop</a>
            </div>
        </div>
    `;
    }

    // Function to display inclusions table for additionals
    function displayInclusionsTable(inclusions) {
        // Find or create inclusions container
        let inclusionsContainer = document.getElementById("product-inclusions");

        if (!inclusionsContainer) {
            // Create inclusions section if it doesn't exist
            inclusionsContainer = document.createElement("div");
            inclusionsContainer.id = "product-inclusions";
            inclusionsContainer.className = "product-inclusions";

            // Insert after the description element to replace it visually
            const descriptionElement = document.getElementById(
                "product-description"
            );
            if (descriptionElement) {
                descriptionElement.parentNode.insertBefore(
                    inclusionsContainer,
                    descriptionElement.nextSibling
                );
            } else {
                // Fallback: insert after price if description not found
                const priceElement = document.querySelector(".details-price");
                if (priceElement) {
                    priceElement.parentNode.insertBefore(
                        inclusionsContainer,
                        priceElement.nextSibling
                    );
                }
            }
        }

        if (inclusionsContainer && inclusions && inclusions.length > 0) {
            inclusionsContainer.innerHTML = `
            <div class="inclusions-table-container">
                <h4>What's Included:</h4>
                <table class="inclusions-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inclusions
                            .map(
                                item => `
                            <tr>
                                <td><i class="fi fi-rs-check"></i> ${item}</td>
                            </tr>
                        `
                            )
                            .join("")}
                    </tbody>
                </table>
            </div>
        `;
            inclusionsContainer.style.display = "block";
        } else if (inclusionsContainer) {
            inclusionsContainer.style.display = "none";
        }
    }

    // Function to load related additionals
    async function loadRelatedAdditionals(category, color, currentProductId) {
        try {
            // Fetch all additionals from Firebase
            const additionalsSnapshot = await getDocs(
                collection(chandriaDB, "additionals")
            );
            const allAdditionals = [];

            additionalsSnapshot.forEach(doc => {
                const data = doc.data();
                if (doc.id !== currentProductId) {
                    // Exclude current product
                    allAdditionals.push({
                        id: doc.id,
                        ...data,
                        isAdditional: true
                    });
                }
            });

            const productsContainer = document.querySelector(
                ".products-container"
            );
            if (!productsContainer) return;

            // Clear existing related products
            productsContainer.innerHTML = "";

            // Filter additionals by category (max 2)
            const categoryAdditionals = allAdditionals
                .filter(additional => additional.category === category)
                .slice(0, 2);

            // Filter additionals by color (max 2)
            const colorAdditionals = allAdditionals
                .filter(
                    additional =>
                        additional.color === color &&
                        !categoryAdditionals.some(p => p.id === additional.id) // Avoid duplicates from category
                )
                .slice(0, 2);

            // Combine related additionals (up to 4 total)
            const relatedAdditionals = [
                ...categoryAdditionals,
                ...colorAdditionals
            ].slice(0, 4);

            // If we still don't have 4 additionals, add random ones
            if (relatedAdditionals.length < 4) {
                const randomAdditionals = allAdditionals
                    .filter(
                        additional =>
                            !relatedAdditionals.some(
                                p => p.id === additional.id
                            )
                    )
                    .sort(() => 0.5 - Math.random()) // Shuffle
                    .slice(0, 4 - relatedAdditionals.length);

                relatedAdditionals.push(...randomAdditionals);
            }
            // Render related additionals
            relatedAdditionals.forEach(additional => {
                const additionalHTML = createAdditionalHTML(additional);
                productsContainer.innerHTML += additionalHTML;
            });

            // Set additional data for centralized quick view system
            if (typeof setQuickViewData === "function") {
                setQuickViewData([], allAdditionals);
            }

            console.log("Related additionals loaded:", {
                category: categoryAdditionals.length,
                color: colorAdditionals.length,
                random:
                    relatedAdditionals.length -
                    (categoryAdditionals.length + colorAdditionals.length)
            });
        } catch (error) {
            console.error("Error loading related additionals:", error);
        }
    }

    // Function to create HTML for an additional item
    function createAdditionalHTML(additional) {
        const imageUrl =
            additional.imageUrl ||
            additional.frontImageUrl ||
            "assets/img/placeholder.jpg";
        return `
    <div class="product-item">
        <div class="product-banner">
            <a href="details.html?id=${additional.id}" class="product-images">
                <img
                    src="${imageUrl}"
                    alt="${additional.name}"
                    class="product-img default"
                />
                <img
                    src="${imageUrl}"
                    alt="${additional.name}"
                    class="product-img hover"
                />
            </a>            <!-- Product actions are hidden via CSS -->
            <div class="product-actions">
                <a
                    href="#"
                    class="action-btn quick-view-btn-trigger"
                    aria-label="Quick View"
                    data-product-id="${additional.id}"
                >
                    <i class="fi fi-rs-eye"></i>
                </a>
                <a
                    href="#"
                    class="action-btn"
                    aria-label="Add to Wishlist"                data-product-id="${
                        additional.id
                    }"
                >
                    <i class="bx bx-heart"></i>
                </a>
            </div>
        </div>
        <div class="product-content">
            <span class="product-category">${formatCategoryName(
                additional.category
            )}</span>
            <h3 class="product-title">
                ${additional.name}
            </h3>
            <div class="product-price flex">
                <span class="new-price">₱ ${additional.price}/rent</span>
            </div>
            <!-- No rent button for additionals -->
        </div>
    </div>
    `;
    }

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // QUANTITY BUTTON FUNCTIONS WITH STOCK VALIDATION
    window.increaseQuantity = function () {
        const quantityInput = document.getElementById("details-quantity");
        const selectedSize = document.querySelector(".size-active");

        if (quantityInput && selectedSize) {
            let currentValue = parseInt(quantityInput.value) || 1;
            const maxStock = parseInt(selectedSize.dataset.stock) || 0;

            if (currentValue < maxStock) {
                quantityInput.value = currentValue + 1;
                // Trigger change event to sync mobile sticky bar
                quantityInput.dispatchEvent(new Event("change"));

                // Also sync mobile sticky bar directly
                const mobileQuantity = document.getElementById(
                    "mobile-sticky-quantity"
                );
                if (mobileQuantity) {
                    mobileQuantity.value = quantityInput.value;
                }
            } else {
                // Show error notification
                if (typeof notyf !== "undefined") {
                    notyf.error(
                        `Maximum available stock for this size is ${maxStock}`
                    );
                }
            }
        }
    };

    window.decreaseQuantity = function () {
        const quantityInput = document.getElementById("details-quantity");
        if (quantityInput) {
            let currentValue = parseInt(quantityInput.value) || 1;
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
                // Trigger change event to sync mobile sticky bar
                quantityInput.dispatchEvent(new Event("change"));

                // Also sync mobile sticky bar directly
                const mobileQuantity = document.getElementById(
                    "mobile-sticky-quantity"
                );
                if (mobileQuantity) {
                    mobileQuantity.value = quantityInput.value;
                }
            }
        }
    };

    // Function to update mobile stock indicator
    function updateMobileStockIndicator(stock) {
        const indicator = document.getElementById("mobile-stock-indicator");
        const stockNumber = document.getElementById("mobile-stock-number");

        if (indicator && stockNumber) {
            stockNumber.textContent = stock;

            // Remove existing stock classes
            indicator.classList.remove(
                "low-stock",
                "very-low-stock",
                "out-of-stock"
            );

            // Add appropriate class based on stock level
            if (stock === 0) {
                indicator.classList.add("out-of-stock");
            } else if (stock <= 2) {
                indicator.classList.add("very-low-stock");
            } else if (stock <= 5) {
                indicator.classList.add("low-stock");
            }

            // Show the indicator on mobile
            if (window.innerWidth <= 768) {
                indicator.style.display = "flex";
            } else {
                indicator.style.display = "none";
            }
        }
    }

    // Handle window resize to show/hide mobile stock indicator
    window.addEventListener("resize", function () {
        const indicator = document.getElementById("mobile-stock-indicator");
        if (indicator) {
            if (window.innerWidth <= 768) {
                indicator.style.display = "flex";
            } else {
                indicator.style.display = "none";
            }
        }
    });

    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // ENHANCED PRODUCT CARD EVENT HANDLERS FOR RELATED PRODUCTS

    // Size selection in related products
    $(document).on(
        "change",
        "#related-products-container .size-selector",
        function () {
            const productId = $(this).data("product-id");
            const newSize = $(this).val();
            const productCard = $(this).closest(".product-item");
            const quantityElement = productCard.find(".quantity-value");
            const plusButton = productCard.find(".plus-btn");
            const minusButton = productCard.find(".minus-btn");

            // Show loading state
            productCard.addClass("is-loading");

            // Reset quantity to 1 when size changes
            quantityElement.text("1");
            minusButton.prop("disabled", true).addClass("disabled");

            // Check stock for new size
            setTimeout(() => {
                const sizeOption = $(this).find(`option[value="${newSize}"]`);
                const stock = parseInt(sizeOption.data("stock")) || 0;

                if (stock <= 1) {
                    plusButton.prop("disabled", true).addClass("disabled");
                } else {
                    plusButton.prop("disabled", false).removeClass("disabled");
                }

                productCard.removeClass("is-loading");
            }, 300);
        }
    );

    // Quantity increase in related products
    $(document).on(
        "click",
        "#related-products-container .quantity-btn.plus-btn",
        function () {
            const productId = $(this).data("product-id");
            const productCard = $(this).closest(".product-item");
            const quantityElement = $(this).siblings(".quantity-value");
            const selectedSize = productCard.find(".size-selector").val();
            const minusBtn = productCard.find(".minus-btn");
            let currentQuantity = parseInt(quantityElement.text()) || 1;

            // Show loading animation
            productCard.addClass("is-loading");

            // Get stock limit from size selector option
            const sizeOption = productCard.find(
                ".size-selector option:selected"
            );
            const maxStock = parseInt(sizeOption.data("stock")) || 0;

            if (currentQuantity < maxStock) {
                currentQuantity++;
                quantityElement.text(currentQuantity);

                // Enable minus button when quantity is more than 1
                minusBtn.prop("disabled", false).removeClass("disabled");

                // Disable plus button if at max stock
                if (currentQuantity >= maxStock) {
                    $(this).prop("disabled", true).addClass("disabled");
                }
            } else {
                notyf.error(
                    `Maximum available stock for size ${selectedSize} is ${maxStock}`
                );
            }

            // Remove loading animation after a short delay
            setTimeout(() => {
                productCard.removeClass("is-loading");
            }, 300);
        }
    );

    // Quantity decrease in related products
    $(document).on(
        "click",
        "#related-products-container .quantity-btn.minus-btn",
        function () {
            const productId = $(this).data("product-id");
            const productCard = $(this).closest(".product-item");
            const quantityElement = $(this).siblings(".quantity-value");
            const plusBtn = productCard.find(".plus-btn");
            let currentQuantity = parseInt(quantityElement.text()) || 1;

            // Show loading animation
            productCard.addClass("is-loading");

            if (currentQuantity > 1) {
                currentQuantity--;
                quantityElement.text(currentQuantity);

                // Disable minus button when quantity reaches 1
                if (currentQuantity === 1) {
                    $(this).prop("disabled", true).addClass("disabled");
                }

                // Enable plus button if previously disabled due to max stock
                plusBtn.prop("disabled", false).removeClass("disabled");
            }

            // Remove loading animation after a short delay
            setTimeout(() => {
                productCard.removeClass("is-loading");
            }, 300);
        }
    );
    // Handle cart button click for related products (both circular and action buttons)
    $(document).on(
        "click",
        "#related-products-container .add-to-cart-action-btn, #related-products-container .circular-cart-btn",
        async function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Check if this is the add-to-cart-action-btn (the large button beside product info)
            if ($(this).hasClass("add-to-cart-action-btn")) {
                const productId = $(this).data("product-id");
                if (productId) {
                    // Redirect to details.html with the product ID
                    window.location.href = `details.html?id=${productId}`;
                    return;
                }
            }

            const user = auth.currentUser;
            if (!user) {
                showAuthModal();
                return;
            }

            const button = $(this);
            const productId = button.data("product-id");
            const isInCart = button.attr("data-in-cart") === "true";

            if (!productId) return;

            // Add loading state
            button.addClass("loading");

            try {
                const userRef = doc(chandriaDB, "userAccounts", user.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    notyf.error("User account not found.");
                    return;
                }

                const currentCart = userSnap.data().added_to_cart || [];

                if (isInCart) {
                    // Remove from cart - remove all instances of this product
                    const updatedCart = currentCart.filter(
                        item => item.productId !== productId
                    );
                    await updateDoc(userRef, { added_to_cart: updatedCart });

                    button.attr("data-in-cart", "false");
                    notyf.success("Removed from cart!");
                } else {
                    // Get product data
                    let productData = relatedProducts.find(
                        p => p.id === productId
                    );

                    if (!productData) {
                        // Fallback: fetch from Firebase
                        const productDoc = await getDoc(
                            doc(chandriaDB, "products", productId)
                        );
                        if (!productDoc.exists()) {
                            notyf.error("Product not found.");
                            return;
                        }
                        productData = productDoc.data();
                    }

                    // Get selected size and quantity from the product card
                    const productCard = button.closest(".product-item");
                    let selectedSize = productCard.find(".size-selector").val();
                    let selectedQuantity =
                        parseInt(productCard.find(".quantity-value").text()) ||
                        1;

                    // Check stock for the selected size
                    if (
                        selectedSize &&
                        productData.size &&
                        productData.size[selectedSize]
                    ) {
                        const stock = productData.size[selectedSize];
                        if (stock <= 0) {
                            notyf.error(
                                `Size ${selectedSize} is out of stock.`
                            );
                            return;
                        }

                        // Limit quantity to available stock
                        if (selectedQuantity > stock) {
                            selectedQuantity = stock;
                            notyf.warning(
                                `Quantity limited to available stock: ${stock}`
                            );
                        }
                    }

                    // Fallback to auto-selecting size if not available on the card
                    if (!selectedSize && productData.size) {
                        const availableSizes = Object.entries(
                            productData.size
                        ).filter(([size, stock]) => stock > 0);
                        if (availableSizes.length > 0) {
                            selectedSize = availableSizes[0][0];
                        } else {
                            notyf.error("Product is out of stock.");
                            return;
                        }
                    } else if (!selectedSize) {
                        selectedSize = "One Size";
                    }

                    // Check if same product/size combination already exists
                    const existingIndex = currentCart.findIndex(
                        item =>
                            item.productId === productId &&
                            item.size === selectedSize
                    );

                    if (existingIndex !== -1) {
                        // Update quantity
                        currentCart[existingIndex].quantity =
                            (currentCart[existingIndex].quantity || 1) +
                            selectedQuantity;
                        await updateDoc(userRef, {
                            added_to_cart: currentCart
                        });
                    } else {
                        // Add new item
                        await updateDoc(userRef, {
                            added_to_cart: arrayUnion({
                                productId,
                                productName,
                                size: selectedSize,
                                quantity: selectedQuantity
                            })
                        });
                    }
                    button.attr("data-in-cart", "true");
                    notyf.success(
                        `Added to cart! Size: ${selectedSize}, Qty: ${selectedQuantity}`
                    );
                }

                // Update cart count
                await updateCartCount();

                // Update all cart button statuses
                await updateAllCartButtonStatus();
            } catch (error) {
                console.error("Error updating cart:", error);
                notyf.error("An error occurred. Please try again.");
            } finally {
                button.removeClass("loading");
            }
        }
    );

    // Color indicator tooltip for related products
    $(document).on(
        "click",
        "#related-products-container .product-color-indicator",
        function (e) {
            e.preventDefault();
            e.stopPropagation();

            const colorName = $(this).attr("title") || "Color";

            // Create or get tooltip
            let tooltip = $(".color-tooltip");
            if (tooltip.length === 0) {
                $("body").append('<div class="color-tooltip"></div>');
                tooltip = $(".color-tooltip");
            }

            // Position tooltip near the color indicator
            const position = $(this).offset();
            tooltip.text(colorName).css({
                top: position.top - 30,
                left: position.left - tooltip.width() / 2 + 12,
                opacity: 1,
                visibility: "visible"
            });

            // Hide tooltip after 2 seconds
            setTimeout(() => {
                tooltip.css({
                    opacity: 0,
                    visibility: "hidden"
                });
            }, 2000);
        }
    );

    // Initial setup complete
    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // QUICK VIEW MODAL FUNCTIONALITY - COMMENTED OUT (Using centralized quick-view.js instead)
    // #@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@##@#@#@#@#@#@#@#@#@#
    // Handle authentication state changes - Initialize counters when auth state changes
    onAuthStateChanged(auth, async function (user) {
        console.log(
            "Details.js onAuthStateChanged - User:",
            user ? user.uid : "No user"
        );
        try {
            // Update cart and wishlist counters in parallel
            await Promise.all([
                updateCartCount(),
                wishlistService.updateWishlistCountUI()
            ]);
            await updateAllCartButtonStatus();
            await updateHeartButtonStates(); // Update heart button states when auth state changes

            if (user) {
                // User is signed in
                console.log("Details.js - User signed in:", user.uid);
            } else {
                // User is signed out
                console.log("Details.js - User signed out");
            }
        } catch (error) {
            console.error(
                "Details.js - Error during auth state change:",
                error
            );
        }
    });

    // Initial setup complete
});
// Mobile sticky bar quantity sync
$(document).on("input change", "#mobile-sticky-quantity", function () {
    const input = $(this);
    const value = parseInt(input.val()) || 1;
    const mainQuantityInput = $("#details-quantity");

    // Sync with main quantity input
    mainQuantityInput.val(value);

    // Trigger change event on main input to validate
    mainQuantityInput.trigger("change");
});

// Mobile Add to Booking functionality
$("#mobile-add-to-cart").on("click", async function (e) {
    e.preventDefault();
    // Trigger the main add to cart button
    $("#details-add-to-cart").trigger("click");
});

// Mobile Add to Favorites functionality
$(document).on("click", "#mobile-add-to-favorites", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    const user = auth.currentUser;
    if (!user) {
        showAuthModal();
        return;
    }

    const button = $(this);
    const productId = button.data("product-id");

    if (!productId) return;

    // Add loading state with visual feedback
    button.addClass("loading");
    button.prop("disabled", true);
    const originalIcon = button.find("i").attr("class");
    button.find("i").removeClass().addClass("bx bx-loader-alt bx-spin");

    try {
        // Use the wishlist service to toggle the product
        const isNowInWishlist = await wishlistService.toggleWishlist(productId);

        // Update button state based on result
        if (isNowInWishlist) {
            button.find("i").removeClass().addClass("bx bxs-heart");
            button.addClass("favorited");
        } else {
            button.find("i").removeClass().addClass("bx bx-heart");
            button.removeClass("favorited");
        }

        // Also update the main favorites button
        const mainFavButton = $("#details-add-to-favorites");
        if (mainFavButton.length) {
            if (isNowInWishlist) {
                mainFavButton.find("i").removeClass().addClass("bx bxs-heart");
                mainFavButton.addClass("favorited");
            } else {
                mainFavButton.find("i").removeClass().addClass("bx bx-heart");
                mainFavButton.removeClass("favorited");
            }
        }

        // Update wishlist count
        await wishlistService.updateWishlistCountUI();
    } catch (error) {
        console.error("Error updating wishlist:", error);
        // Restore original icon on error
        button.find("i").removeClass().addClass(originalIcon);
    } finally {
        button.removeClass("loading");
        button.prop("disabled", false);

        // If there was an error, the icon was already restored above
        if (
            !button.find("i").hasClass("bx-heart") &&
            !button.find("i").hasClass("bxs-heart")
        ) {
            button.find("i").removeClass().addClass(originalIcon);
        }
    }
});

// Function to set up mobile sticky bar
function setupMobileStickyBar(productId) {
    // Set product ID on mobile favorites button
    const mobileFavButton = $("#mobile-add-to-favorites");
    if (mobileFavButton.length) {
        mobileFavButton.attr("data-product-id", productId);
    }

    // Sync initial quantity values
    const mainQuantity = $("#details-quantity").val() || 1;
    const mobileQuantity = $("#mobile-sticky-quantity");
    if (mobileQuantity.length) {
        mobileQuantity.val(mainQuantity);
    }

    console.log("Mobile sticky bar set up for product:", productId);
}
