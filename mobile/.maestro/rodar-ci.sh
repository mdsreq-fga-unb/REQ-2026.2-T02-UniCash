#!/usr/bin/env bash
# Roda os fluxos do UC13 num emulador já ligado, gravando a tela (usado pelo workflow mobile-e2e.yml).
# Uso, a partir de mobile/:  bash .maestro/rodar-ci.sh app.apk
set -u
APK="${1:-app.apk}"
SAIDA=.maestro/artefatos
mkdir -p "$SAIDA/uc13"

# Sem o app instalado não há o que testar: para aqui, antes de gravar ou rodar os fluxos.
if ! adb install -r "$APK"; then
  echo "::error::Falha ao instalar $APK no emulador."
  exit 1
fi

# screenrecord para sozinho em 180 s; o fluxo inteiro cabe nesse tempo.
adb shell screenrecord --time-limit 180 /sdcard/uc13.mp4 &
GRAVACAO=$!

maestro test .maestro/uc13 \
  --format junit --output "$SAIDA/relatorio.xml" \
  --test-output-dir "$SAIDA/saida"
RESULTADO=$?

# Pede ao screenrecord do aparelho que finalize o arquivo e espera o processo terminar,
# senão o mp4 sai sem o índice e não abre.
adb shell pkill -INT screenrecord 2>/dev/null || true
for _ in $(seq 1 20); do
  adb shell pidof screenrecord > /dev/null 2>&1 || break
  sleep 1
done
wait "$GRAVACAO" 2>/dev/null || true

if ! adb pull /sdcard/uc13.mp4 "$SAIDA/uc13/uc13.mp4"; then
  # O resumo do PR avisa quando o vídeo falta (resumo-e2e.mjs).
  echo "::warning::O vídeo uc13.mp4 não foi gerado."
fi

exit "$RESULTADO"
