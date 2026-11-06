#!/bin/sh

set -e

if [ -z "$1" ]; then
    echo "Error: No script path provided."
    echo "Usage: $0 <script_path.js>"
    exit 1
fi

SCRIPT_PATH="$1"
NAME=$(basename "$SCRIPT_PATH" .js)

export WINEDIR="/Users/michael/Library/Application Support/com.isaacmarovitz.Whisky/Libraries/Wine/bin"
"$WINEDIR/wine64" --version

"$WINEDIR/wine64" quickjs/qjsc.exe -c \
    -fno-string-normalize -fno-map -fno-promise -fno-typedarray \
    -fno-regexp -fno-json -fno-eval -fno-proxy -fno-date -fno-module-loader \
    -o "build/${NAME}.c" "$SCRIPT_PATH"

sed "s/#name#/${NAME}/g" src/_main.c > "build/${NAME}_main.c"

x86_64-w64-mingw32-gcc -Os \
    "build/${NAME}_main.c" "build/${NAME}.c" \
    src/qjs-native.c quickjs/libquickjs.a \
    -I./quickjs -lm \
    -Wl,-Bstatic -lpthread -Wl,-Bdynamic -lmingw32 \
    -o "release/${NAME}.exe"

x86_64-w64-mingw32-strip "release/${NAME}.exe"

"$WINEDIR/wine64" "release/${NAME}.exe"
