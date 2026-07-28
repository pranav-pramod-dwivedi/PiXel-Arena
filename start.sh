#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
node serve.js &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null" EXIT INT TERM
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:5500 2>/dev/null; then
    break
  fi
  sleep 0.3
done
LOCAL_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' || ipconfig getifaddr en0 2>/dev/null || echo "localhost")
echo "Opening http://${LOCAL_IP}:5500"
if command -v xdg-open &>/dev/null; then
  xdg-open "http://${LOCAL_IP}:5500"
elif command -v open &>/dev/null; then
  open "http://${LOCAL_IP}:5500"
fi
wait $SERVER_PID
