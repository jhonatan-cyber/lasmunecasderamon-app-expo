#!/usr/bin/env bash
set -euo pipefail

if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "::error title=EXPO_TOKEN no configurado::Falta el secreto EXPO_TOKEN. Sigue docs/ROTACION_EXPO_TOKEN.md y relanza el workflow."
  exit 1
fi

if ! account=$(eas whoami 2>&1); then
  printf '%s\n' "$account"
  echo "::error title=EXPO_TOKEN invalido::El secreto EXPO_TOKEN no autentica con Expo. Rótalo siguiendo docs/ROTACION_EXPO_TOKEN.md y relanza el workflow."
  exit 1
fi

echo "EAS autenticado como: $account"
