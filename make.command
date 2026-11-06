#!/bin/sh

cd quickjs

# Cross-compiler Windows version
brew install --cask frankea/whisky/whisky
brew install mingw-w64
cp /opt/homebrew/Cellar/mingw-w64/14.0.0_3/toolchain-x86_64/x86_64-w64-mingw32/bin/libwinpthread-1.dll .
make CONFIG_WIN32=y clean
make CONFIG_WIN32=y CC=x86_64-w64-mingw32-gcc LIBS="-Wl,-Bstatic -lpthread -Wl,-Bdynamic"
