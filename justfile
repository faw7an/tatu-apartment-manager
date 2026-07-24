default:
    echo "Hello from just"

build:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    # docker compose -f docker-compose.dev.yml up -d db

rebuild:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
    
down:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml down

generate:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml exec api npx prisma generate

migrate:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml exec api npx prisma migrate dev

migrate-reset:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml exec api npx prisma migrate reset 

studio:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml exec api npx prisma studio

db-stop:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml stop db

db-start:
    docker compose -f docker-compose.yml -f docker-compose.dev.yml start db


test:
    echo "run tests here"

# rebuild packages
# docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build