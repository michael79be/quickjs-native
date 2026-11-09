#!/bin/sh

set -e

if [ -z "$1" ]; then
    echo "Error: No script path provided."
    echo "Usage: $0 <script_path.js>"
    exit 1
fi

mkdir -p build
mkdir -p release

SCRIPT_PATH="$1"
NAME=$(basename "$SCRIPT_PATH" .js)

sed "s/#name#/${NAME}/g" src/_main.c > "build/${NAME}_main.c"

# Plarform build

quickjs/qjsc -c \
    -fno-string-normalize -fno-map -fno-promise -fno-typedarray \
    -fno-regexp -fno-json -fno-eval -fno-proxy -fno-date \
    -o "build/${NAME}.c" "$SCRIPT_PATH"

clang -Os \
    "build/${NAME}_main.c" "build/${NAME}.c" \
    src/qjs-native.c quickjs/libquickjs.a \
    -I./quickjs -lm -lpthread \
    -o "release/${NAME}"

# macOS build

rm -fR release/${NAME}.app
cp -Rvp src/bundle.app/ release/${NAME}.app/
rm release/${NAME}.app/Contents/MacOS/.gitkeep
rm release/${NAME}.app/Contents/Resources/.gitkeep
sed -i '' "s/#name#/${NAME}/g" release/${NAME}.app/Contents/Info.plist
cp "release/${NAME}" "release/${NAME}.app/Contents/MacOS/${NAME}"

# Windows build

export WINEDIR="${HOME}/Library/Application Support/com.isaacmarovitz.Whisky/Libraries/Wine/bin"
"$WINEDIR/wine64" --version

"$WINEDIR/wine64" quickjs-win32/qjsc.exe -c \
    -fno-string-normalize -fno-map -fno-promise -fno-typedarray \
    -fno-regexp -fno-json -fno-eval -fno-proxy -fno-date \
    -o "build/${NAME}.c" "$SCRIPT_PATH"

x86_64-w64-mingw32-gcc -Os \
    "build/${NAME}_main.c" "build/${NAME}.c" \
    src/qjs-native.c quickjs-win32/libquickjs.a \
    -I./quickjs -lm \
    -Wl,-Bstatic -lpthread -Wl,-Bdynamic -lmingw32 \
    -o "release/${NAME}.exe"

x86_64-w64-mingw32-strip "release/${NAME}.exe"

