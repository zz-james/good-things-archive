# Omeka Classic + JwtAuth. Omeka core and stock plugins/themes are fetched
# at build time, pinned by commit SHA — this repo carries no Omeka source.
# To upgrade Omeka: bump OMEKA_REF (and plugin/theme refs) and rebuild.

FROM php:8.2-apache AS base

# Pinned upstream sources (match the previously vendored tree exactly)
ARG OMEKA_REF=f1c7353a41792a2b710054f5cca10d40ad286e8b
ARG COINS_REF=a3bb59230a444437c08e1b57dc92bdd65da80bf4
ARG EXHIBITBUILDER_REF=39e790b94fadc5bc7d85b535bd6ea474d62160c4
ARG SIMPLEPAGES_REF=d43e5338500d066f4f9aad70b9da83fc3ee7533f
ARG THEME_BERLIN_REF=265b87f50b9890eb396073ed2818d08134f562fc
ARG THEME_DEFAULT_REF=edfb10514db83c87cd835a727c9b269e17cef143
ARG THEME_SEASONS_REF=297fde6024370115d8bd237c4c512a81acb22f06

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    imagemagick \
    libpng-dev \
    libjpeg-dev \
    libwebp-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    && docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install mysqli gd xml zip \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Omeka core (includes bundled Zend Framework and getID3)
RUN curl -fsSL "https://github.com/omeka/Omeka/archive/${OMEKA_REF}.tar.gz" \
        | tar xz --strip-components=1

# Stock plugins and themes (directory names must match plugin class prefixes)
RUN set -e; \
    fetch() { \
        mkdir -p "$2"; \
        curl -fsSL "https://github.com/omeka/$1/archive/$3.tar.gz" \
            | tar xz --strip-components=1 -C "$2"; \
    }; \
    fetch plugin-Coins           plugins/Coins           "${COINS_REF}"; \
    fetch plugin-ExhibitBuilder  plugins/ExhibitBuilder  "${EXHIBITBUILDER_REF}"; \
    fetch plugin-SimplePages     plugins/SimplePages     "${SIMPLEPAGES_REF}"; \
    fetch theme-berlin           themes/berlin           "${THEME_BERLIN_REF}"; \
    fetch theme-thanksroy        themes/default          "${THEME_DEFAULT_REF}"; \
    fetch theme-seasons          themes/seasons          "${THEME_SEASONS_REF}"

# Local customisations layered onto the stock tree
COPY overlay/phpunit.xml application/tests/phpunit.xml
COPY overlay/config.ini.jwtauth.ini /tmp/config.ini.jwtauth.ini
RUN cat /tmp/config.ini.jwtauth.ini >> application/config/config.ini.changeme \
    && rm /tmp/config.ini.jwtauth.ini

# JwtAuth plugin from the local checkout (its own git repo; actively developed)
COPY plugins/JwtAuth plugins/JwtAuth

RUN cp application/config/config.ini.changeme application/config/config.ini \
    && cp .htaccess.changeme .htaccess \
    && cp application/logs/errors.log.empty application/logs/errors.log \
    && chown -R www-data:www-data files application/logs \
    && chmod -R 755 files application/logs

RUN echo '<Directory /var/www/html>\n    AllowOverride All\n    Require all granted\n</Directory>' \
    >> /etc/apache2/sites-available/000-default.conf

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# ---

FROM base AS prod

RUN composer install --no-dev --no-progress --no-interaction \
    && cd plugins/JwtAuth && composer install --no-dev --no-progress --no-interaction

EXPOSE 80

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]

# ---

FROM base AS test

RUN composer install --no-progress --no-interaction \
    && cd plugins/JwtAuth && composer install --no-progress --no-interaction

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["sh", "-c", "cd application/tests && ../../vendor/bin/phpunit"]
