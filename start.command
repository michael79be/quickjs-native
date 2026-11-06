#!/bin/sh

SCRIPT_PATH="$1"
NAME=$(basename "$SCRIPT_PATH" .js)

export WINEDIR="${HOME}/Library/Application Support/com.isaacmarovitz.Whisky/Libraries/Wine/bin"
"$WINEDIR/wine64" --version

"$WINEDIR/wine64" "release/${NAME}.exe"
