# syntax=docker/dockerfile:1

# --- Frontend assets -------------------------------------------------------
FROM oven/bun:1 AS assets
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY vite.config.ts tsconfig.json biome.json ./
COPY resources ./resources
COPY public ./public
RUN bun run build

# --- Composer dependencies -------------------------------------------------
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress
COPY app ./app
COPY bootstrap ./bootstrap
COPY config ./config
COPY database ./database
COPY resources ./resources
COPY routes ./routes
COPY public ./public
COPY artisan composer.json composer.lock ./
RUN composer dump-autoload --no-dev --optimize --no-interaction --no-scripts

# --- Runtime ---------------------------------------------------------------
FROM php:8.4-cli-bookworm AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
        libonig-dev libzip-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" gd pdo_pgsql mbstring bcmath opcache pcntl zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=assets /app/public/build ./public/build

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
        storage/logs storage/app/private/pod bootstrap/cache \
    && php artisan package:discover --ansi \
    && php artisan view:cache

ENV PHP_CLI_SERVER_WORKERS=8

EXPOSE 8080

# --no-reload lets PHP_CLI_SERVER_WORKERS fork multiple workers (the reload
# watcher otherwise forces a single-process server).
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8080", "--no-reload"]
