#!/bin/sh

RELEASE_FILE="$1"
NAME=$(basename "$RELEASE_FILE" .exe)
EXT="${RELEASE_FILE##*.}"

cd release

if [ "$EXT" = "exe" ]; then
    export WINEDIR="${HOME}/Library/Application Support/com.isaacmarovitz.Whisky/Libraries/Wine/bin"
    "$WINEDIR/wine64" --version

    "$WINEDIR/wine64" "${NAME}.exe"
else
    "./${NAME}"
fi
