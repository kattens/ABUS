FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy code
COPY api/ /app/api/
COPY web/ /app/web/
COPY tools/ /app/tools/  # optional if you want check_db.py inside

# default DB path (persisted via volume)
ENV DATABASE_URL=sqlite:///./data/abus.db

EXPOSE 8000
# FastAPI entrypoint (your app module)
CMD ["uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "8000"]
