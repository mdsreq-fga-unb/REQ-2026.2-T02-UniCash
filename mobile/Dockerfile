# Ambiente de desenvolvimento: roda o servidor do Expo (Metro) para o Expo Go.
# Os builds instaláveis continuam no EAS (npm run build:apk).
FROM node:22-bookworm-slim

WORKDIR /app

# git é usado pelo Expo CLI; python3/make/g++ são necessários caso o
# better-sqlite3 precise compilar (fallback quando não há binário pré-compilado)
RUN apt-get update \
  && apt-get install -y --no-install-recommends git python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 8081

CMD ["npx", "expo", "start", "--host", "lan"]