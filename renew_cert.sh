#!/bin/bash

set -e  # Exit on error

# shellcheck disable=SC2046
path=/root/3DLeber
export $(grep -v '^#' ${path}/.env | xargs)

# Проверяем наличие необходимых директорий
if [ ! -d "${path}/certbot/conf" ] || [ ! -d "${path}/certbot/www" ]; then
    echo "Creating certbot directories..."
    mkdir -p "${path}/certbot/conf" "${path}/certbot/www"
fi

# Проверяем статус сайта
status_code=$(curl --write-out '%{http_code}' --silent --output /dev/null "https://${SERVER_IP}/health_check/")

if [[ "${status_code}" == "200" ]] ; then
    echo "Site is healthy, status code: ${status_code}"
    exit 0
else
    # Проверяем наличие docker-compose
    if ! [ -x "$(command -v docker-compose)" ]; then
        echo 'Error: docker-compose is not installed.' >&2
        exit 1
    fi

    echo "Site is down or certificate is invalid, status code: ${status_code}"
    echo "### Running certbot container and renew certificate ..."
    if ! docker-compose -f ${path}/docker-compose.yml restart certbot; then
        echo "Failed to restart certbot container"
        exit 1
    fi

    echo "Waiting for certificate renewal..."
    sleep 15m

    echo "### Reloading nginx ..."

    echo "### Step 1: Update the image (if necessary) ..."
    if ! docker-compose -f ${path}/docker-compose.yml pull app; then
        echo "Failed to pull app image"
        exit 1
    fi

    echo "### Step 2: Stopping and deleting the app container ..."
    if ! docker-compose -f ${path}/docker-compose.yml stop app; then
        echo "Failed to stop app container"
        exit 1
    fi
    if ! docker-compose -f ${path}/docker-compose.yml rm -f app; then
        echo "Failed to remove app container"
        exit 1
    fi

    echo "### Step 3: Recreate and launch the app container ..."
    if ! docker-compose -f ${path}/docker-compose.yml up -d --build app; then
        echo "Failed to start app container"
        exit 1
    fi

    echo "App has been reloaded with the new certificate."
fi
