#!/bin/sh

export WINEDIR="~/Library/Application Support/com.isaacmarovitz.Whisky/Libraries/Wine/bin"
"$WINEDIR/wine64" --version

"$WINEDIR/wine64" "release/${NAME}.exe"
