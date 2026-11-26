#!/usr/bin/env bash
# Roda os fluxos do UC13 num emulador já ligado, gravando a tela (usado pelo workflow mobile-e2e.yml).
# Uso, a partir de mobile/:  bash .maestro/rodar-ci.sh app.apk
set -u
APK="${1:-app.apk}"
SAIDA=.maestro/artefatos
mkdir -p "$SAIDA/uc13"

adb install -r "$APK"

# screenrecord para sozinho em 180 s; o fluxo inteiro cabe nesse tempo.
adb shell screenrecord --time-limit 180 /sdcard/uc13.mp4 &
GRAVACAO=$!

maestro test .maestro/uc13 \
  --format junit --output "$SAIDA/relatorio.xml" \
  --test-output-dir "$SAIDA/saida"
RESULTADO=$?

kill -INT "$GRAVACAO" 2>/dev/null || true
sleep 3
adb pull /sdcard/uc13.mp4 "$SAIDA/uc13/uc13.mp4" || true

exit "$RESULTADO"
