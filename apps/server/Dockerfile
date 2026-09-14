# Se construye con contexto en la raíz del repo (ver docker-compose.yml):
# necesita packages/shared y el package.json raíz para los workspaces.
FROM node:22-bookworm-slim

# better-sqlite3 compila un binding nativo si no hay binario prebuilt para
# la plataforma exacta del contenedor.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --workspace apps/server --workspace packages/shared --include-workspace-root

COPY packages/shared packages/shared
COPY apps/server apps/server

ENV NODE_ENV=production
ENV RUTA_DB=/datos/organizador.sqlite3
EXPOSE 3001

WORKDIR /app/apps/server
CMD ["npx", "tsx", "src/index.ts"]
