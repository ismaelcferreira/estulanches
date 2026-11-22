# ---- Imagem da aplicação EstuLanches ----
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependências primeiro (aproveita cache de camadas); só produção, sem scripts de instalação
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Código da aplicação (pertence ao root: o processo, rodando como "node", só consegue ler)
COPY src ./src
COPY public ./public

# Executa como usuário não-root
USER node

EXPOSE 3000

# 127.0.0.1 evita ambiguidade IPv4/IPv6 do "localhost" no Alpine
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/server.js"]
