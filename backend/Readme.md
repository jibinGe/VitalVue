## Docker Commands
docker-compose up --build -d

docker exec -it vitalvue_backend alembic -c /app/alembic.ini revision --autogenerate -m "initial_tables"

docker exec -it vitalvue_backend alembic upgrade head

docker compose exec db psql -U vitalvue_admin -d vitalvue_db -c "\dt"

python files/simulator.py 
## Goal                    CommandCheck 
Current Version         docker compose exec backend alembic current
View History            docker compose exec backend alembic history
Rollback 1 Step         docker compose exec backend alembic downgrade -1
Check for SQL errors    docker compose logs -f db

## Reddis Command Part
docker exec -it vitalvue_redis redis-cli -a secure_redis_password_456

Once inside the 127.0.0.1:6379> prompt, use these commands:

KEYS *: Lists every key currently in Redis (useful to see if your otp:user_id exists).

GET otp:VUE-101: Shows the 6-digit code stored for that specific user.

TTL otp:VUE-101: Shows how many seconds are left before the OTP expires (should be under 300).

FLUSHALL: Clears everything (use this if you want to reset your test environment).

docker exec -it vitalvue_redis redis-cli -a secure_redis_password_456 MONITOR

## DB Backup command
docker exec -t vitalvue_db_container_name pg_dumpall -c -U postgres > vitalvue_backup_$(date +%Y%m%d_%H%M%S).sql

cat vitalvue_backup_20260406.sql | docker exec -i vitalvue_db psql -U vitalvue_admin -d vitalvue_db