#!/bin/bash
TRIGGER_FILE="/home/appandor/appandor-system/web/public/.restart_trigger"

echo "[Watcher]: Appandor Restart Pipeline gestartet. Warte auf Signale..."

while true; do
  if [ -f "$TRIGGER_FILE" ]; then
    echo "[Watcher]: Signal erkannt! Lösche Trigger und starte node-app neu..."
    rm -f "$TRIGGER_FILE"
    docker compose restart node-app
  fi
  sleep 1
done
