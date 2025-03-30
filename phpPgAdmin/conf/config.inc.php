<?php

    // Display name for the server on the login screen
    $conf['servers'][0]['desc'] = 'Render PostgreSQL';

    // Hostname or IP address for server
    $conf['servers'][0]['host'] = 'dpg-cvhagj52ng1s73be7i20-a';

    // Database port on server (5432 is the PostgreSQL default)
    $conf['servers'][0]['port'] = 5432;

    // Database SSL mode
    // Set to 'require' to enforce secure connection
    $conf['servers'][0]['sslmode'] = 'require';

    // Default database to connect to
    $conf['servers'][0]['defaultdb'] = 'chandriadb';

    // Specify the path to the database dump utilities for this server.
    $conf['servers'][0]['pg_dump_path'] = '/usr/bin/pg_dump';
    $conf['servers'][0]['pg_dumpall_path'] = '/usr/bin/pg_dumpall';

    // Default language. Use 'auto' to detect browser language.
    $conf['default_lang'] = 'auto';

    // AutoComplete setting for foreign key values
    $conf['autocomplete'] = 'default on';

    // Extra login security to prevent root/admin logins
    $conf['extra_login_security'] = false;

    // Only show owned databases?
    $conf['owned_only'] = false;

    // Show comments on objects
    $conf['show_comments'] = true;

    // Display advanced objects
    $conf['show_advanced'] = false;

    // Display system objects
    $conf['show_system'] = false;

    // Minimum password length
    $conf['min_password_length'] = 1;

    // Width of the left frame in pixels (object browser)
    $conf['left_width'] = 200;

    // Theme for the interface
    $conf['theme'] = 'default';

    // Show OIDs when browsing tables (for versions <=11)
    $conf['show_oids'] = false;

    // Max rows to show on a page
    $conf['max_rows'] = 30;

    // Max characters per field in browse mode
    $conf['max_chars'] = 50;

    // Enable strict XHTML headers
    $conf['use_xhtml_strict'] = false;

    // Base URL for PostgreSQL documentation
    $conf['help_base'] = 'http://www.postgresql.org/docs/%s/interactive/';

    // Configuration for ajax refresh
    $conf['ajax_refresh'] = 3;

    // Plugins management
    $conf['plugins'] = array();

    /*****************************************
     * Don't modify anything below this line *
     *****************************************/
    $conf['version'] = 19;

?>