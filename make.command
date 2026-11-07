#!/bin/sh

cd quickjs

# Platform build
rm -fR .obj
make clean
make

cd ..

# Cross-compile Linux version
cp -Rvp quickjs quickjs-linux
cd quickjs-linux
brew tap messense/macos-cross-toolchains
brew trust --formula messense/macos-cross-toolchains/x86_64-unknown-linux-gnu
brew install x86_64-unknown-linux-gnu
rm -fR .obj
make clean
cp ../quickjs/qjsc qjsc-host 2>/dev/null || true
make CC=x86_64-unknown-linux-gnu-gcc HOSTCC=clang QJSC=./qjsc-host qjs LIBS="-lpthread -lm -ldl"
make CC=x86_64-unknown-linux-gnu-gcc HOSTCC=clang QJSC=./qjsc-host qjsc LIBS="-lpthread -lm -ldl"
cd ..

# Cross-compile Windows version
cp -Rvp quickjs quickjs-win32
cd quickjs-win32
brew install --cask frankea/whisky/whisky
brew install mingw-w64
cp /opt/homebrew/Cellar/mingw-w64/14.0.0_3/toolchain-x86_64/x86_64-w64-mingw32/bin/libwinpthread-1.dll .
rm -fR .obj
make CONFIG_WIN32=y clean
make CONFIG_WIN32=y CC=x86_64-w64-mingw32-gcc LIBS="-Wl,-Bstatic -lpthread -Wl,-Bdynamic"
