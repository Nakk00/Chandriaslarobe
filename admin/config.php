<?php

// Database configuration
$host = 'ep-still-term-a12teoro-pooler.ap-southeast-1.aws.neon.tech'; // Change if using a remote DB
$port = '5432'; // Default PostgreSQL port
$dbname = 'chadriaDB'; // Name of your database
$user = 'chadriaDB_owner'; // Your PostgreSQL username
$password = 'npg_E5swMeF6txLv'; // Your PostgreSQL password

// Create a connection with SSL
$conn = pg_connect("host=$host port=$port dbname=$dbname user=$user password=$password sslmode=require");

// Check connection
if (!$conn) {
    die("Error! cannot connect to DATABASE: " . pg_last_error());
}
?>