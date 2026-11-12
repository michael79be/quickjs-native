import { spawnSync } from 'node:child_process';
import * as PELibrary from 'pe-library';
import * as ResEdit from 'resedit';
import {
    chmodSync,
    cpSync,
    lstatSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngToIco from 'png-to-ico';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const packageRelease = path.join(packageRoot, 'release');
const begin = Buffer.from('QJS_BEGIN');
const end = Buffer.from('QJS_END');

const targets = [
    { platform: 'linux', file: 'qjs-native-linux', output: '-linux' },
    { platform: 'linux-32', file: 'qjs-native-linux-32', output: '-linux-32' },
    { platform: 'macos', file: 'qjs-native-macos', output: '-macos' },
    { platform: 'macos-intel', file: 'qjs-native-macos-intel', output: '-macos-intel' },
    { platform: 'macos-universal', file: 'qjs-native-macos-universal', output: '-macos-universal' },
    { platform: 'windows', file: 'qjs-native-64.exe', output: '.exe' },
    { platform: 'windows-32', file: 'qjs-native-32.exe', output: '-32.exe' },
];

const appTemplate = path.join(packageRoot, 'src', 'bundle.app');
const launcherName = 'qjs-native-launcher';
const launcherUrl = 'https://raw.githubusercontent.com/michael79be/quickjs-native/main/release/qjs-native-launcher';

function crc32(data) {
    let crc = 0xffffffff;
    for (const byte of data) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++)
            crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function readBundle(file) {
    const trailerSize = end.length + 8 + 4;
    if (file.length < trailerSize || !file.subarray(-end.length).equals(end))
        throw new Error('The host executable did not produce a valid bundle.');

    const lengthOffset = file.length - end.length - 8;
    const codeSize = file.readBigUInt64LE(lengthOffset);
    if (codeSize > BigInt(Number.MAX_SAFE_INTEGER))
        throw new Error('The bundled code is too large.');

    const codeOffset = lengthOffset - 4 - Number(codeSize);
    const flagOffset = codeOffset - 1;
    const markerOffset = flagOffset - begin.length;
    if (markerOffset < 0 || !file.subarray(markerOffset, flagOffset).equals(begin))
        throw new Error('The host executable produced an invalid start marker.');

    const flag = file[flagOffset];
    if (flag !== 0 && flag !== 1)
        throw new Error(`The host executable produced an unknown code format (${flag}).`);

    const code = file.subarray(codeOffset, codeOffset + Number(codeSize));
    if (file.readUInt32LE(lengthOffset - 4) !== crc32(code))
        throw new Error('The host executable produced a bundle with an invalid CRC32.');

    return file.subarray(markerOffset);
}

function getHostExecutable() {
    let host;
    if (process.platform === 'darwin') {
        host = 'qjs-native-macos-universal';
    } else if (process.platform === 'linux') {
        if (process.arch === 'ia32')
            host = 'qjs-native-linux-32';
        else if (process.arch === 'x64')
            host = 'qjs-native-linux';
        else
            throw new Error(`Bundling is not supported on Linux ${process.arch}.`);
    } else if (process.platform === 'win32') {
        if (process.arch === 'ia32')
            host = 'qjs-native-32.exe';
        else if (process.arch === 'x64')
            host = 'qjs-native-64.exe';
        else
            throw new Error(`Bundling is not supported on Windows ${process.arch}.`);
    } else {
        throw new Error(`Bundling is not supported on ${process.platform}.`);
    }

    const hostPath = path.join(packageRelease, host);
    if (!lstatSyncSafe(hostPath))
        throw new Error(`The host executable is missing from ${packageRelease}: ${host}`);
    return hostPath;
}

function lstatSyncSafe(file) {
    try {
        return lstatSync(file).isFile();
    } catch (error) {
        if (error.code === 'ENOENT')
            return false;
        throw error;
    }
}

function parseArgs(args) {
    let source;
    let outputDir = path.resolve(process.cwd(), 'release');
    let platform;
    let scheme;
    let icon;
    let makeApp = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--output-dir') {
            if (!args[i + 1] || args[i + 1].startsWith('--'))
                throw new Error('--output-dir requires a directory.');
            outputDir = path.resolve(process.cwd(), args[++i]);
        } else if (args[i] === '--platform') {
            if (!args[i + 1] || args[i + 1].startsWith('--'))
                throw new Error('--platform requires a target.');
            platform = args[++i];
        } else if (args[i] === '--scheme') {
            if (!args[i + 1] || args[i + 1].startsWith('--'))
                throw new Error('--scheme requires a URI scheme.');
            scheme = args[++i];
        } else if (args[i] === '--icon') {
            if (!args[i + 1] || args[i + 1].startsWith('--'))
                throw new Error('--icon requires a PNG file.');
            icon = path.resolve(process.cwd(), args[++i]);
        } else if (args[i] === '--app') {
            makeApp = true;
        } else if (args[i].startsWith('-')) {
            throw new Error(`Unknown option: ${args[i]}`);
        } else if (!source) {
            source = args[i];
        } else {
            throw new Error(`Unexpected argument: ${args[i]}`);
        }
    }
    if (!source)
        throw new Error('Usage: npx quickjs-native bundle <script.js> [--platform <target>] [--app] [--output-dir <directory>]');

    const target = platform ? targets.find((item) => item.platform === platform) : null;
    if (platform && !target)
        throw new Error(`Unknown platform "${platform}". Choose from: ${targets.map((item) => item.platform).join(', ')}`);
    if (makeApp && target && !target.platform.startsWith('macos'))
        throw new Error('--app can only be used with a macOS platform.');
    if (makeApp && process.platform !== 'darwin')
        throw new Error('--app can only be generated on macOS.');
    if (scheme && !makeApp)
        throw new Error('--scheme can only be used with --app.');
    if (scheme && !/^[a-z][a-z0-9+.-]*$/i.test(scheme))
        throw new Error(`Invalid URI scheme: ${scheme}`);
    const selectedTargets = target ? [target] : targets;
    const includesWindows = selectedTargets.some((item) => item.platform.startsWith('windows'));
    if (icon && !includesWindows && !makeApp)
        throw new Error('--icon is supported for Windows targets and macOS apps (use --app for macOS).');
    if (icon && target?.platform.startsWith('macos') && !makeApp)
        throw new Error('--icon on a macOS target requires --app.');

    return {
        source: path.resolve(process.cwd(), source),
        outputDir,
        targets: selectedTargets,
        appTarget: makeApp
            ? target ?? targets.find((item) => item.platform === 'macos-universal')
            : null,
        scheme,
        icon,
    };
}

function escapeXml(text) {
    return text.replace(/[<>&"']/g, (character) => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
    })[character]);
}

function getMacLauncher(downloadDir) {
    const packagedLauncher = path.join(packageRelease, launcherName);
    const launcherPath = lstatSyncSafe(packagedLauncher)
        ? packagedLauncher
        : path.join(downloadDir, launcherName);

    if (launcherPath !== packagedLauncher) {
        const download = spawnSync(
            'curl',
            [
                '--fail',
                '--location',
                '--silent',
                '--show-error',
                '--connect-timeout',
                '20',
                '--max-time',
                '60',
                launcherUrl,
                '--output',
                launcherPath,
            ],
            { stdio: 'inherit' },
        );
        if (download.error)
            throw download.error;
        if (download.status !== 0)
            throw new Error(`Unable to download the universal macOS launcher (curl exited with status ${download.status}).`);
    }

    for (const architecture of ['arm64', 'x86_64']) {
        const verification = spawnSync('lipo', [
            launcherPath,
            '-verify_arch',
            architecture,
        ], { stdio: 'inherit' });
        if (verification.error)
            throw verification.error;
        if (verification.status !== 0)
            throw new Error(`The macOS launcher is missing ${architecture}: ${launcherPath}`);
    }

    return launcherPath;
}

function createMacApp(outputDir, appName, target, code, scheme, launcherPath, iconPath, temporaryDir) {
    const appPath = path.join(outputDir, `${appName}.app`);
    const contentsPath = path.join(appPath, 'Contents');
    const macOSDir = path.join(contentsPath, 'MacOS');
    const executableName = `${appName}-launcher`;
    const launcherPathInApp = path.join(macOSDir, executableName);
    const runtimePath = path.join(macOSDir, appName);
    const stubPath = path.join(packageRelease, target.file);

    cpSync(appTemplate, appPath, { recursive: true, force: true });
    mkdirSync(macOSDir, { recursive: true });
    writeFileSync(runtimePath, Buffer.concat([readFileSync(stubPath), code]));
    chmodSync(runtimePath, statSync(stubPath).mode & 0o777);

    cpSync(launcherPath, launcherPathInApp);
    chmodSync(launcherPathInApp, statSync(launcherPath).mode & 0o777);

    let identifierName = appName.replace(/[^A-Za-z0-9-]/g, '-').replace(/^-+|-+$/g, '') || 'app';
    if (!/^[A-Za-z]/.test(identifierName))
        identifierName = `app-${identifierName}`;
    const bundleIdentifier = `org.quickjs-native.${identifierName}`;
    const appScheme = (scheme ?? appName.toLowerCase().replace(/[^a-z0-9+.-]/g, '-'))
        .replace(/^[^a-z]+/, '') || 'quickjs-native';
    const plistPath = path.join(contentsPath, 'Info.plist');
    const plist = readFileSync(path.join(appTemplate, 'Contents', 'Info.plist'), 'utf8')
        .replaceAll('#appName#', escapeXml(appName))
        .replaceAll('#executableName#', escapeXml(executableName))
        .replaceAll('#bundleIdentifier#', escapeXml(bundleIdentifier))
        .replaceAll('#scheme#', escapeXml(appScheme));
    writeFileSync(plistPath, plist);
    if (iconPath)
        addMacIcon(iconPath, contentsPath, temporaryDir);
    console.log(`Created ${appPath}`);
}

function validatePng(iconPath) {
    if (!statSync(iconPath).isFile())
        throw new Error(`Icon is not a file: ${iconPath}`);
    const signature = readFileSync(iconPath).subarray(0, 8);
    if (!signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        throw new Error(`Icon must be a PNG file: ${iconPath}`);
}

function runTool(command, args) {
    const result = spawnSync(command, args, { stdio: 'inherit' });
    if (result.error)
        throw result.error;
    if (result.status !== 0)
        throw new Error(`${command} exited with status ${result.status}.`);
}

function addMacIcon(iconPath, contentsPath, temporaryDir) {
    const iconsetPath = path.join(temporaryDir, 'AppIcon.iconset');
    const resourcesPath = path.join(contentsPath, 'Resources');
    const iconPathInApp = path.join(resourcesPath, 'AppIcon.icns');
    const representations = [
        ['icon_16x16.png', 16],
        ['icon_16x16@2x.png', 32],
        ['icon_32x32.png', 32],
        ['icon_32x32@2x.png', 64],
        ['icon_128x128.png', 128],
        ['icon_128x128@2x.png', 256],
        ['icon_256x256.png', 256],
        ['icon_256x256@2x.png', 512],
        ['icon_512x512.png', 512],
        ['icon_512x512@2x.png', 1024],
    ];

    mkdirSync(iconsetPath, { recursive: true });
    for (const [filename, size] of representations) {
        runTool('sips', [
            '-z',
            String(size),
            String(size),
            iconPath,
            '--out',
            path.join(iconsetPath, filename),
        ]);
    }
    mkdirSync(resourcesPath, { recursive: true });
    runTool('iconutil', ['-c', 'icns', iconsetPath, '-o', iconPathInApp]);
}

async function addWindowsIcon(executablePath, icoData) {
    const executable = PELibrary.NtExecutable.from(readFileSync(executablePath));
    const resources = PELibrary.NtExecutableResource.from(executable);
    const iconFile = ResEdit.Data.IconFile.from(icoData);
    if (iconFile.icons.length === 0)
        throw new Error('The PNG-to-ICO conversion produced no icon images.');

    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        resources.entries,
        1,
        0,
        iconFile.icons.map((icon) => icon.data),
    );
    resources.outputResource(executable);
    writeFileSync(executablePath, Buffer.from(executable.generate()));
}

export async function bundle(args) {
    const { source, outputDir, targets: selectedTargets, appTarget, scheme, icon } = parseArgs(args);
    if (!statSync(source).isFile())
        throw new Error(`Not a file: ${source}`);
    if (icon)
        validatePng(icon);

    const available = new Set(readdirSync(packageRelease));
    const requiredTargets = [...selectedTargets];
    if (appTarget && !requiredTargets.some((target) => target.file === appTarget.file))
        requiredTargets.push(appTarget);
    const missing = requiredTargets.map((target) => target.file).filter((file) => !available.has(file));
    if (missing.length)
        throw new Error(`Missing platform executables in ${packageRelease}: ${missing.join(', ')}`);

    const hostPath = getHostExecutable();
    const temporaryDir = mkdtempSync(path.join(os.tmpdir(), 'quickjs-native-'));
    const temporaryBundle = path.join(temporaryDir, 'host-bundle');
    try {
        const result = spawnSync(hostPath, [source, '--bundle', temporaryBundle], {
            cwd: packageRoot,
            stdio: 'inherit',
        });
        if (result.error)
            throw result.error;
        if (result.status !== 0)
            throw new Error(`Host executable exited with status ${result.status}.`);

        const code = readBundle(readFileSync(temporaryBundle));
        mkdirSync(outputDir, { recursive: true });
        const launcherPath = appTarget ? getMacLauncher(temporaryDir) : null;
        const windowsIcon = icon && selectedTargets.some((target) => target.platform.startsWith('windows'))
            ? await pngToIco(icon)
            : null;

        const basename = path.basename(source, path.extname(source)) || path.basename(source);
        for (const target of selectedTargets) {
            const stubPath = path.join(packageRelease, target.file);
            const outputPath = path.join(outputDir, `${basename}${target.output}`);
            const stub = readFileSync(stubPath);
            writeFileSync(outputPath, Buffer.concat([stub, code]));

            if (process.platform !== 'win32') {
                const mode = statSync(stubPath).mode & 0o777;
                chmodSync(outputPath, mode);
            }
            if (windowsIcon && target.platform.startsWith('windows'))
                await addWindowsIcon(outputPath, windowsIcon);
            console.log(`Created ${outputPath}`);
        }
        if (appTarget) {
            createMacApp(outputDir, basename, appTarget, code, scheme, launcherPath, icon, temporaryDir);
        }
    } finally {
        rmSync(temporaryDir, { recursive: true, force: true });
    }
}
