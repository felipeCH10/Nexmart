FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_mysql

# Toda rota inexistente cai no index.php (roteador) e o header Authorization chega ao PHP
RUN a2enmod rewrite \
 && printf '%s\n' \
    'SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1' \
    '<Directory /var/www/html>' \
    '    FallbackResource /index.php' \
    '</Directory>' > /etc/apache2/conf-available/app.conf \
 && a2enconf app

# helpers fica FORA da pasta pública
COPY helpers.php /var/www/app/helpers.php
COPY index.php /var/www/html/index.php
