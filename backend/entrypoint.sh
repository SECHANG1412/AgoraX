#!/bin/sh

# DB가 뜰 때까지 대기
# /wait-for-it.sh db:3306 -- echo "Database is up"
/wait-for-it.sh db:3306 -t 60 -- echo "Database is up"

alembic upgrade head

# FastAPI 서버 실행 (시그널이 제대로 전달되도록 exec 사용)
exec uvicorn main:app --host=0.0.0.0 --port=8000 --reload