# quickjs-native

QuickJS Native is a modified version of QuickJS with dynamic library loading support.

## API

- `native.dlopen` : load a library (path to dll, so, dsym), returns library handle (integer)
- `native.dlsym` : find library function by name (library handle, function name), returns function handle (integer)
- `native.invoke` : invoke library function with arguments (up to 6 arguments), returns result (integer)
- `native.dlclose` : unload preivous loaded library (library handle)

## Building

```shell
npm run make
```

## CLI

```shell
npx quickjs-native help
npx quickjs-native bundle samples/hello.js
npx quickjs-native bundle samples/hello.js --platform windows --icon icon.png
npx quickjs-native bundle samples/hello.js --platform macos-universal --app --icon icon.png
```

`bundle` creates a platform-specific executable for each target in the package's
`release/` directory. Output files are written to `./release` by default; use
`--output-dir <directory>` to choose another destination. The input may be
JavaScript source or QuickJS bytecode.

`--icon <png>` embeds the icon in Windows executables using a cross-platform
JavaScript PE resource editor. For macOS, use `--app`; the PNG is converted to
ICNS and placed in the generated app bundle. Linux targets do not support icons.
