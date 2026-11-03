#!/bin/bash

SKETCH="$1"
FQBN="esp8266:esp8266:nodemcuv2"
PORT=$(ls /dev/cu.usbserial* 2>/dev/null | head -1)

if [ -z "$SKETCH" ]; then echo "usage: ./flash.sh <sketch folder> [monitor]"; exit 1; fi
if [ -z "$PORT" ]; then echo "no board found, check the USB cable"; exit 1; fi

cd "$(dirname "$0")"
arduino-cli compile --fqbn $FQBN "$SKETCH" && arduino-cli upload -p "$PORT" --fqbn $FQBN "$SKETCH" || exit 1

if [ "$2" = "monitor" ]; then
  arduino-cli monitor -p "$PORT" -c baudrate=115200
fi
