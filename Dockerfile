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

# --- Runtime: FrankenPHP (Caddy) in Octane worker mode ----------------------
FROM dunglas/frankenphp:1-php8.4-bookworm AS runtime

# Same extension set as before (GD with FreeType/JPEG renders the POD
# watermark); install-php-extensions also pulls and prunes its build deps.
RUN install-php-extensions pdo_pgsql gd mbstring bcmath pcntl zip redis

WORKDIR /app

COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=assets /app/public/build ./public/build

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views \
        storage/logs storage/app/private/pod bootstrap/cache \
    && php artisan package:discover --ansi \
    && php artisan view:cache

EXPOSE 8080

# Octane boots Laravel once per worker and reuses it across requests; Caddy
# serves public/build and public/* directly. Each worker is recycled after
# --max-requests requests so a leak cannot accumulate.
CMD ["php", "artisan", "octane:frankenphp", "--host=0.0.0.0", "--port=8080", "--workers=8", "--max-requests=500"]
