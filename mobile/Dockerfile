# Ambiente de desenvolvimento: roda o servidor do Expo (Metro) para o Expo Go.
# Os builds instaláveis continuam no EAS (npm run build:apk).
FROM node:24-bookworm-slim

WORKDIR /app

# git é usado pelo Expo CLI; o resto vem do npm
RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 8081

CMD ["npx", "expo", "start"]
