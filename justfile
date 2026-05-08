default:
    echo "Hello from just"

build:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

test:
    echo "run tests here"
