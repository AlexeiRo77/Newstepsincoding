# The production frontend: build the bundle, serve it with Caddy (which also proxies /api and gets the
# HTTPS certificate). Built with the frontend directory as context by deploy/docker-compose.prod.yml.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY --from=caddyfile Caddyfile /etc/caddy/Caddyfile
