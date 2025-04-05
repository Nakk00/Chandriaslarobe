<?php
ob_start(); // Start output buffering

// Include the database configuration
include 'config.php';

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Check if the form is submitted (Login or Register)
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (isset($_POST['login'])) {
        // LOGIN LOGIC
        $username = htmlspecialchars($_POST['username-login']);
        $password = htmlspecialchars($_POST['password-login']);

        $query = "SELECT * FROM users WHERE username = $1";
        $result = pg_query_params($conn, $query, array($username));

        if ($result && pg_num_rows($result) > 0) {
            $user = pg_fetch_assoc($result);
            if (password_verify($password, $user['password'])) {
                // Successful login
                header("Location: ../dashboard/index.html");
                exit(); // Stop further execution
            } else {
                echo "<script>window.onload = function() { showErrorAlert('Invalid username or password.'); };</script>";
            }
        } else {
            echo "<script>window.onload = function() { showErrorAlert('Invalid username or password.'); };</script>";
        }
    } elseif (isset($_POST['register'])) {
        // REGISTRATION LOGIC
        $username = htmlspecialchars($_POST['username-reg']);
        $email = htmlspecialchars($_POST['email-reg']);
        $password = password_hash($_POST['password-reg'], PASSWORD_BCRYPT); // Hash the password

        // Check if username or email already exists
        $check_query = "SELECT * FROM users WHERE username = $1 OR email = $2";
        $check_result = pg_query_params($conn, $check_query, array($username, $email));

        if (pg_num_rows($check_result) > 0) {
            echo "<script>window.onload = function() { showErrorAlert('Username or email already exists.'); };</script>";
        } else {
            // Insert new user into the database
            $query = "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)";
            $result = pg_query_params($conn, $query, array($username, $email, $password));

            if ($result) {
                echo "<script>window.onload = function() { showSuccessAlert(); };</script>";
            } else {
                echo "<script>window.onload = function() { showErrorAlert('Error: Unable to register user.'); };</script>";
            }
        }
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>Login Form</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <!-- BoxIcon CDN -->
    <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet" />
    <!-- Custom Styles -->
    <link rel="stylesheet" href="style.css" />

    <script>
      function showSuccessAlert() {
        const successAlert = document.getElementById("successAlert");
        successAlert.style.display = "block";
        setTimeout(() => {
          successAlert.style.display = "none";
        }, 3000);
      }

      function showErrorAlert(message) {
        const errorAlert = document.getElementById("errorAlert");
        errorAlert.innerHTML = message;
        errorAlert.style.display = "block";
        setTimeout(() => {
          errorAlert.style.display = "none";
        }, 3000);
      }

      function validateForm(event) {
        const username = document.querySelector('.register input[name="username-reg"]').value.trim();
        const password = document.querySelector('.register input[name="password-reg"]').value.trim();
        const alertBox = document.getElementById("alertBox");

        // Check if username and password meet criteria
        if (username.length < 8 || username.length > 20 || password.length < 8 || password.length > 20) {
          alertBox.style.display = "block";
          setTimeout(() => {
            alertBox.style.display = "none";
          }, 3000);
          return false; // Prevent submission if invalid
        }
        event.target.submit(); // Submit if valid
      }
    </script>
</head>
<body>
    <!-- Floating Alert for Validation Error -->
    <div id="alertBox" class="alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 w-75" role="alert" style="display: none; z-index: 1055;">
      Username and Password must be between 8 and 20 characters.
    </div>
    <!-- Floating Alert for Registration Success -->
    <div id="successAlert" class="alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 w-75" role="alert" style="display: none; z-index: 1055;">
      Registration successful! You can now log in.
    </div>
    <!-- Floating Alert for Registration/Login Error -->
    <div id="errorAlert" class="alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 w-75" role="alert" style="display: none; z-index: 1055;">
      Error: Unable to register user.
    </div>

    <div class="container-main">
      <!-- Login Form -->
      <div class="form-box login">
        <form action="index.php" method="POST">
          <h1>
            <img src="images/chandriaslogo.png" />
            Login
          </h1>
          <div class="input-box">
            <input type="text" name="username-login" placeholder="Username" required />
            <i class="bx bxs-user"></i>
          </div>
          <div class="input-box">
            <input type="password" name="password-login" class="form-control" placeholder="Password" required />
            <i class="bx bxs-lock"></i>
          </div>
          <div class="forgot-link">
            <a href="#">Forgot Password?</a>
          </div>
          <button type="submit" name="login" class="btn-main">Login</button>
          <p>or Login with Social Platforms</p>
          <div class="social-icons">
            <a href="#"><i class="bx bxl-google"></i></a>
            <a href="#"><i class="bx bxl-facebook"></i></a>
          </div>
        </form>
      </div>

      <!-- Registration Form -->
      <div class="form-box register">
        <form action="index.php" method="POST" onsubmit="return validateForm(event)">
          <h1>
            <img src="images/chandriaslogo.png" />
            Registration
          </h1>
          <div class="input-box">
            <input type="text" name="username-reg" placeholder="Username" required />
            <i class="bx bxs-user"></i>
          </div>
          <div class="input-box">
            <input type="text" name="email-reg" placeholder="Email" required />
            <i class="bx bxs-envelope"></i>
          </div>
          <div class="input-box">
            <input type="password" name="password-reg" placeholder="Password" required
              data-bs-toggle="popover" data-bs-trigger="focus" data-bs-html="true"
              data-bs-content="Password should be:<br><br> • Minimum of 8 and a maximum of 20 characters." />
            <i class="bx bxs-lock"></i>
          </div>
          <button type="submit" name="register" class="btn-main">Register</button>
          <p>or Register with Social Platforms</p>
          <div class="social-icons">
            <a href="#"><i class="bx bxl-google"></i></a>
            <a href="#"><i class="bx bxl-facebook"></i></a>
          </div>
        </form>
      </div>

      <!-- Panel Switching for Login/Register -->
      <div class="toggle-box">
        <div class="toggle-panel toggle-left">
          <h1>Hello, Welcome!</h1>
          <p>Don't have an Account?</p>
          <button class="btn-main register-btn" type="button">Register</button>
        </div>
        <div class="toggle-panel toggle-right">
          <h1>Welcome Back!</h1>
          <p>Already have an Account?</p>
          <button class="btn-main login-btn">Login</button>
        </div>
      </div>
    </div>

    <!-- Bootstrap Bundle JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="script.js"></script>
</body>
</html>

<?php ob_end_flush(); // End output buffering ?>