import {
    onAuthStateChanged,
    auth,
    doc,
    getDoc,
    chandriaDB,
    signOut
} from "./sdk/chandrias-sdk.js";

// === Utility: Check if running locally ===
const isLocal =
    location.hostname.includes("localhost") ||
    location.hostname.includes("127.0.0.1");

// === Show content if admin is logged in ===
const isAdminLoggedIn = localStorage.getItem("adminLoggedIn") === "true";
const isUserLoggedIn = localStorage.getItem("userLoggedIn") === "true";

// Show the page only for valid admin
// if (isAdminLoggedIn) {
//     $("body").css("visibility", "visible");
// } else if (isUserLoggedIn || !isAdminLoggedIn) {
//     // Redirect users or unknown sessions to homepage
//     window.location.href = isLocal ? "../index.html" : "/";
// }

// === Auth check (only for production) ===
if (!isLocal) {
    onAuthStateChanged(auth, async user => {
        try {
            if (user) {
                const userDocRef = doc(chandriaDB, "userAccounts", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    // If regular user, sign out and redirect
                    await signOut(auth);
                    console.warn("Customer account detected. Signing out...");
                    window.location.href = "/";
                    return;
                }

                // SHOW IF ADMIN IS LOGGED IN
                $("body").css("visibility", "visible");
            }

            if (!user) {
                console.warn("No authenticated user. Redirecting...");
                window.location.href = "/admin/authentication";
            }
        } catch (error) {
            console.error("Auth check failed:", error);
            // Optional fallback: send user to safe page
            window.location.href = "/";
        }
    });
}
