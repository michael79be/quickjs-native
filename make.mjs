import { availableParallelism } from 'node:os';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const jobs = String(availableParallelism());
const releaseDir = path.join(root, 'release');

function run(command, args, cwd = root) {
    const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
    if (result.error)
        throw result.error;
    if (result.status !== 0)
        throw new Error(`${command} exited with status ${result.status}`);
}

function quickjsMake(...args) {
    run('make', ['-C', 'quickjs', ...args]);
}

function prepareRelease() {
    mkdirSync(releaseDir, { recursive: true });
}

function requirePlatform(platform, target) {
    if (process.platform !== platform)
        throw new Error(`Target "${target}" requires ${platform}; current OS is ${process.platform}`);
}

function buildLinux() {
    requirePlatform('linux', 'linux');
    quickjsMake('clean');
    quickjsMake(`-j${jobs}`, 'CONFIG_WERROR=y');
    prepareRelease();
    run('gcc', [
        '-Os',
        'src/qjs-native.c',
        'quickjs/libquickjs.a',
        '-Iquickjs',
        '-lm',
        '-lpthread',
        '-ldl',
        '-o',
        'release/qjs-native-linux',
    ]);
}

function buildLinux32() {
    requirePlatform('linux', 'linux-32bit');
    quickjsMake('clean');
    quickjsMake(`-j${jobs}`, 'CONFIG_WERROR=y', 'CONFIG_M32=y');
    prepareRelease();
    run('gcc', [
        '-m32',
        '-Os',
        'src/qjs-native.c',
        'quickjs/libquickjs.a',
        '-Iquickjs',
        '-lm',
        '-lpthread',
        '-ldl',
        '-o',
        'release/qjs-native-linux-32',
    ]);
}

function buildMacOS() {
    requirePlatform('darwin', 'macos');
    prepareRelease();
    quickjsMake('clean');
    quickjsMake('CONFIG_WERROR=y', 'CC=clang -arch arm64', 'libquickjs.a');
    run('clang', [
        '-arch', 'arm64',
        '-Os',
        'src/qjs-native.c',
        'quickjs/libquickjs.a',
        '-Iquickjs',
        '-lm',
        '-lpthread',
        '-o',
        'release/qjs-native-macos',
    ]);

    quickjsMake('clean');
    quickjsMake('CONFIG_WERROR=y', 'CC=clang -arch x86_64', 'libquickjs.a');
    run('clang', [
        '-arch', 'x86_64',
        '-Os',
        'src/qjs-native.c',
        'quickjs/libquickjs.a',
        '-Iquickjs',
        '-lm',
        '-lpthread',
        '-o',
        'release/qjs-native-macos-intel',
    ]);
    run('lipo', [
        '-create',
        'release/qjs-native-macos',
        'release/qjs-native-macos-intel',
        '-output',
        'release/qjs-native-macos-universal',
    ]);
    run('lipo', [
        'release/qjs-native-macos-universal',
        '-verify_arch',
        'arm64',
    ]);
    run('lipo', [
        'release/qjs-native-macos-universal',
        '-verify_arch',
        'x86_64',
    ]);
}

function buildMingwWindows() {
    quickjsMake('clean', 'CONFIG_WIN32=y', 'CC=x86_64-w64-mingw32-gcc');
    quickjsMake('CONFIG_WIN32=y', 'CC=x86_64-w64-mingw32-gcc');
    prepareRelease();
    run('x86_64-w64-mingw32-gcc', [
        '-Os',
        'src/qjs-native.c',
        'quickjs/libquickjs.a',
        '-Iquickjs',
        '-lm',
        '-Wl,-Bstatic',
        '-lpthread',
        '-Wl,-Bdynamic',
        '-lmingw32',
        '-o',
        'release/qjs-native-64.exe',
    ]);
    run('x86_64-w64-mingw32-strip', ['release/qjs-native-64.exe']);
}

function buildMingwWindows32() {
    quickjsMake('clean', 'CONFIG_WIN32=y', 'CONFIG_M32=y', 'CC=i686-w64-mingw32-gcc');
    quickjsMake('CONFIG_WIN32=y', 'CONFIG_M32=y', 'CC=i686-w64-mingw32-gcc');
    prepareRelease();
    run('i686-w64-mingw32-gcc', [
        '-Os',
        'src/qjs-native.c',
        'quickjs/libquickjs.a',
        '-Iquickjs',
        '-lm',
        '-Wl,-Bstatic',
        '-lpthread',
        '-Wl,-Bdynamic',
        '-lmingw32',
        '-o',
        'release/qjs-native-32.exe',
    ]);
    run('i686-w64-mingw32-strip', ['release/qjs-native-32.exe']);
}

const targets = {
    linux: buildLinux,
    'linux-32bit': buildLinux32,
    macos: buildMacOS,
    'mingw-windows': buildMingwWindows,
    'mingw-windows-32': buildMingwWindows32,
};

const target = process.argv[2] ?? (process.platform === 'darwin'
    ? 'macos'
    : process.platform === 'linux'
        ? 'linux'
        : null);

if (target === '--help' || target === '-h') {
    console.log(`Usage: node make.mjs [target]

Targets:
  linux              Linux x64
  linux-32bit        Linux 32-bit
  macos              macOS arm64, Intel, and universal
  mingw-windows      Windows x64 via MinGW
  mingw-windows-32   Windows 32-bit via MinGW`);
} else if (target === 'all') {
    console.error('Targets must be built individually because they require different host OSes.');
    process.exitCode = 1;
} else if (target && targets[target]) {
    targets[target]();
} else {
    console.error('No native build target for this OS. Choose one with `node make.mjs --help`.');
    process.exitCode = 1;
}
