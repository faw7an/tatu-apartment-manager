default:
    echo "Hello from just"

build:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    # docker compose -f docker-compose.dev.yml up -d db
down:
    docker compose -f docker-compose.dev.yml down

test:
    echo "run tests here"

# rebuild packages
# docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build