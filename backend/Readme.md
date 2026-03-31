docker-compose up --build -d

docker exec -it vitalvue_backend alembic -c /app/alembic.ini revision --autogenerate -m "initial_tables"

docker exec -it vitalvue_backend alembic upgrade head

