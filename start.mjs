import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const packageRelease = path.join(packageRoot, 'release');

function getRuntime() {
    let filename;
    if (process.platform === 'darwin') {
        filename = 'qjs-native-macos-universal';
    } else if (process.platform === 'linux') {
        if (process.arch === 'ia32')
            filename = 'qjs-native-linux-32';
        else if (process.arch === 'x64')
            filename = 'qjs-native-linux';
        else
            throw new Error(`Starting scripts is not supported on Linux ${process.arch}.`);
    } else if (process.platform === 'win32') {
        if (process.arch === 'ia32')
            filename = 'qjs-native-32.exe';
        else if (process.arch === 'x64')
            filename = 'qjs-native-64.exe';
        else
            throw new Error(`Starting scripts is not supported on Windows ${process.arch}.`);
    } else {
        throw new Error(`Starting scripts is not supported on ${process.platform}.`);
    }

    const runtime = path.join(packageRelease, filename);
    if (!existsSync(runtime))
        throw new Error(`The platform executable is missing from ${packageRelease}: ${filename}`);
    return runtime;
}

function getDefaultSource() {
    const packageJson = path.resolve(process.cwd(), 'package.json');
    if (existsSync(packageJson)) {
        const project = JSON.parse(readFileSync(packageJson, 'utf8'));
        if (typeof project.main === 'string' && project.main.length > 0)
            return project.main;
    }
    return 'index.js';
}

export function start(args) {
    const [sourceArg, ...scriptArgs] = args;
    const source = path.resolve(process.cwd(), sourceArg ?? getDefaultSource());
    if (!existsSync(source))
        throw new Error(`JavaScript source file not found: ${source}`);

    const result = spawnSync(getRuntime(), [source, ...scriptArgs], {
        cwd: process.cwd(),
        stdio: 'inherit',
    });
    if (result.error)
        throw result.error;
    if (result.status !== 0)
        process.exitCode = result.status ?? 1;
}
