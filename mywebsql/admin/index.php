<?php
// Include the database configuration
include 'config.php';

// Check if the form is submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Get user input and sanitize
    $username = htmlspecialchars($_POST['username-reg']);
    $email = htmlspecialchars($_POST['email-reg']);
    $password = password_hash($_POST['password-reg'], PASSWORD_BCRYPT); // Hash the password

    // Check if username or email already exists
    $check_query = "SELECT * FROM users WHERE username = $1 OR email = $2";
    $check_result = pg_query_params($conn, $check_query, array($username, $email));

    if (pg_num_rows($check_result) > 0) {
        echo "Username or email already exists.";
    } else {
        // Insert new user into the database
        $query = "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)";
        $result = pg_query_params($conn, $query, array($username, $email, $password));

        if ($result) {
            echo "Registration successful. You can now <a href='login.html'>log in</a>.";
        } else {
            echo "Error: Unable to register user.";
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
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    
    <!--BoxIcon CDN-->
    <link href='https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css' rel='stylesheet'>
    
    <link rel="stylesheet" href="style.css">
    
  </head>
  
  <body>
    <!-- Popover -->
      <div id="alertBox" class="alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 w-75" role="alert" style="display: none; z-index: 1055;">
        Username and Password must be between 8 and 20 characters.
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    
    
    <div class="container-main">
      <div class="form-box login">
        <form action="index.php" method="POST">
              <h1>
                <img src="images/chandriaslogo.png">
                   Login
              </h1>
     
          <div class="input-box">
            <input type="text" placeholder="Username" required> 
            <i class='bx bxs-user'></i>
          </div>
          <div class="input-box">
            <!-- Popover -->
            <input type="password" class="form-control" placeholder="Password" required>
  
            <i class='bx bxs-lock' ></i>
          </div>
          <div class="forgot-link">
            <a href="#"> Forgot Password? </a>
          </div>
          <button type="submit" class="btn-main"> Login </button>
          <p>or Login with Social Plaforms</p>
          <div class="social-icons">
            <a href="#">
              <i class='bx bxl-google' ></i>
            </a>
            <a href="#">
              <i class='bx bxl-facebook' ></i>
            </a>
          </div>
        </form>
      </div>
      
    <div class="form-box register">
        <form onsubmit="return validateForm(event)">
          <h1>
            <img src="images/chandriaslogo.png">
             Registration 
          </h1>
          <div class="input-box">
            <input type="text" placeholder="Username" name="username-reg" required> 
            <i class='bx bxs-user'></i>
          </div>
           <div class="input-box">
            <input type="text" placeholder="Email" name="email-reg" required> 
            <i class='bx bxs-envelope'></i>
          </div>
          
          <!-- Popover -->
          <div class="input-box">
            <input type="password" placeholder="Password" name="password-reg" required
              data-bs-toggle="popover" data-bs-trigger="focus" data-bs-html="true"
              data-bs-content="Password should be:<br><br>
               • Minimum of 8 and a maximum of 20 characters.">
            <i class='bx bxs-lock' ></i>
          </div>
          <button type="submit" class="btn-main"> Register </button>
          <p>or Register with Social Plaforms</p>
          <div class="social-icons">
            <a href="#">
              <i class='bx bxl-google' ></i>
            </a>
            <a href="#">
              <i class='bx bxl-facebook' ></i>
            </a>
          </div>
        </form>
      </div>  
      <div class="toggle-box">
        <div class="toggle-panel toggle-left">
          <h1>Hello, Welcome!</h1>
          <p> Don't have an Account? </p>
          <button class="btn-main register-btn" type="submit"> Register </button>
        </div>
        <div class="toggle-panel toggle-right">
          <h1> Welcome Back! </h1>
          <p> Already have an Account? </p>
          <button class="btn-main login-btn"> Login </button>
        </div>
      </div>
      
    </div>
    
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
        var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
          return new bootstrap.Popover(popoverTriggerEl)
        })
      });
      

  function validateForm(event) {
    event.preventDefault(); // Prevent form submission

    const username = document.querySelector('.register input[type="text"]').value.trim();
    const password = document.querySelector('.register input[type="password"]').value.trim();
    const alertBox = document.getElementById("alertBox");

    // Check if username and password meet the criteria
    if (username.length < 8 || username.length > 20 || password.length < 8 || password.length > 20) {
      alertBox.style.display = "block";
      setTimeout(() => {
        alertBox.style.display = "none";
      }, 3000);
      return false; // Prevent submission if invalid
    }
    return true; // Submit if valid
  }

    </script>
    
    <script src="script.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
  
  </body>
</html>