# quickjs-native

QuickJS Native is a modified version of QuickJS with dynamic library loading support.

## API

- `native.dlopen` : load a library (path to dll, so, dsym), returns library handle (integer)
- `native.dlsym` : find library function by name (library handle, function name), returns function handle (integer)
- `native.invoke` : invoke library function with arguments (up to 6 arguments), returns result (integer)
- `native.flclose` : unload preivous loaded library (library handle)

## Building

```shell
git submodule update --init --force --remote
./make.command
```

## Packaging

```shell
./build.command samples/hello.js
```
