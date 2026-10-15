FROM python:3.13-slim
WORKDIR /app
# Bytecode goes to a container-only path so nothing root/container-owned lands in a bind mount.
ENV PYTHONUNBUFFERED=1 PYTHONPYCACHEPREFIX=/tmp/pycache
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY . .
EXPOSE 8000
# Apply migrations, then serve with auto-reload (the source is bind-mounted by docker-compose.yml).
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
