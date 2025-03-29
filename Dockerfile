# Use PHP 8.1 with Apache
FROM php:8.1-apache

# Enable mod_rewrite for Apache
RUN a2enmod rewrite

# Install necessary system dependencies
RUN apt-get update && \
    apt-get install -y libpq-dev && \
    docker-php-ext-install pdo pdo_pgsql pgsql

# Enable required PHP extensions
RUN docker-php-ext-enable pdo_pgsql pgsql

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . /var/www/html/

# Set permissions for Apache
RUN chown -R www-data:www-data /var/www/html

# Expose Apache port 80
EXPOSE 80