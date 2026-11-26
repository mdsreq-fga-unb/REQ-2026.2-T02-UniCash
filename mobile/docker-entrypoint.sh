#!/bin/sh
# Mantém o node_modules do volume em sincronia com o package-lock.json.
# O volume nomeado (mobile_node_modules) persiste entre builds e esconde o
# node_modules da imagem, então dependências novas não chegam sozinhas.
# Aqui o hash do lockfile da última instalação fica gravado no próprio volume;
# se mudou, roda npm ci antes de iniciar o comando.
set -e

LOCK_HASH=$(sha256sum package-lock.json | cut -d' ' -f1)
STAMP=node_modules/.lock-hash

if [ ! -f "$STAMP" ] || [ "$(cat "$STAMP")" != "$LOCK_HASH" ]; then
  echo "package-lock.json mudou: sincronizando dependências (npm ci)..."
  npm ci
  echo "$LOCK_HASH" > "$STAMP"
fi

exec "$@"
