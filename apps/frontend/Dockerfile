# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Instala pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copia arquivos de manifesto para aproveitar cache de camadas
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig*.json ./
COPY packages/api-client/package.json ./packages/api-client/
COPY apps/frontend/package.json ./apps/frontend/

# Instala dependências
RUN pnpm install --frozen-lockfile

# Copia o código-fonte
COPY packages/api-client ./packages/api-client
COPY apps/frontend ./apps/frontend

# Compila o frontend
WORKDIR /app/apps/frontend
RUN pnpm run build

# ── Stage 2: Nginx para servir os arquivos estáticos ─────────────────────────
FROM nginx:alpine AS runtime

# Remove configuração padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos compilados
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copia a configuração do nginx para servir SPA
COPY nginx/nginx-frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
