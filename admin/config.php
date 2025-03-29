<?php
// Database configuration
$host = 'dpg-cvhagj52ng1s73be7i20-a';        // Change if using a remote DB
$port = '5432';             // Default PostgreSQL port
$dbname = 'chandriadb';  // Name of your database
$user = 'admin';    // Your PostgreSQL username
$password = 'JVqNEOjAKg8z4KsBgcJvYmDVxV9JbAle'; // Your PostgreSQL password

// Create a connection
$conn = pg_connect("host=$host port=$port dbname=$dbname user=$user password=$password");

// Check connection
if (!$conn) {
    die("Error: Unable to connect to the database.");
}
?>