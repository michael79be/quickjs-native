declare module 'os' {
    export interface Stat {
        dev: number;
        ino: number;
        mode: number;
        nlink: number;
        uid: number;
        gid: number;
        rdev: number;
        size: number;
        blocks?: number;
        atime: number;
        mtime: number;
        ctime: number;
    }

    export interface ExecOptions {
        block?: boolean;
        usePath?: boolean;
        file?: string;
        cwd?: string;
        stdin?: number;
        stdout?: number;
        stderr?: number;
        env?: Record<string, string>;
        uid?: number;
        gid?: number;
    }

    export interface WorkerMessageEvent {
        data: unknown;
    }

    export class Worker {
        static parent: Worker | undefined;

        constructor(moduleFilename: string);
        onmessage: ((event: WorkerMessageEvent) => void) | null;
        postMessage(message: unknown): void;
    }

    export const O_RDONLY: number;
    export const O_WRONLY: number;
    export const O_RDWR: number;
    export const O_APPEND: number;
    export const O_CREAT: number;
    export const O_EXCL: number;
    export const O_TRUNC: number;
    export const O_TEXT: number | undefined;
    export const O_BINARY: number | undefined;
    export function open(filename: string, flags: number, mode?: number): number;
    export function close(fd: number): void;
    export function seek(fd: number, offset: number, whence: number): number;
    export function seek(fd: number, offset: bigint, whence: number): bigint;
    export function read(fd: number, buffer: ArrayBuffer, offset: number, length: number): number;
    export function write(fd: number, buffer: ArrayBuffer, offset: number, length: number): number;
    export function isatty(fd: number): boolean;
    export function ttyGetWinSize(fd: number): [width: number, height: number] | null;
    export function ttySetRaw(fd: number): void;
    export function remove(filename: string): number;
    export function rename(oldName: string, newName: string): number;
    export function setReadHandler(fd: number, callback: (() => void) | null): void;
    export function setWriteHandler(fd: number, callback: (() => void) | null): void;

    export function signal(
        signalNumber: number,
        callback: (() => void) | null | undefined,
    ): void;
    export const SIGINT: number;
    export const SIGABRT: number;
    export const SIGFPE: number;
    export const SIGILL: number;
    export const SIGSEGV: number;
    export const SIGTERM: number;
    export const SIGQUIT: number | undefined;
    export const SIGPIPE: number | undefined;
    export const SIGALRM: number | undefined;
    export const SIGUSR1: number | undefined;
    export const SIGUSR2: number | undefined;
    export const SIGCHLD: number | undefined;
    export const SIGCONT: number | undefined;
    export const SIGSTOP: number | undefined;
    export const SIGTSTP: number | undefined;
    export const SIGTTIN: number | undefined;
    export const SIGTTOU: number | undefined;

    export function now(): number;
    export function setTimeout(callback: () => void, delay: number): number;
    export function clearTimeout(handle: number): void;
    export function sleepAsync(delay: number): Promise<void>;
    export const platform: string;
    export function getcwd(): [path: string, error: number];
    export function chdir(path: string): number;
    export function mkdir(path: string, mode?: number): number;
    export function readdir(path: string): [entries: string[], error: number];

    export const S_IFMT: number;
    export const S_IFIFO: number;
    export const S_IFCHR: number;
    export const S_IFDIR: number;
    export const S_IFBLK: number;
    export const S_IFREG: number;
    export const S_IFSOCK: number | undefined;
    export const S_IFLNK: number | undefined;
    export const S_ISGID: number | undefined;
    export const S_ISUID: number | undefined;

    export function stat(path: string): [stat: Stat | null, error: number];
    export function lstat(path: string): [stat: Stat | null, error: number];
    export function utimes(path: string, accessTime: number, modificationTime: number): number;
    export function sleep(delay: number): void;
    export function realpath(path: string): [resolvedPath: string, error: number];
    export function symlink(target: string, linkPath: string): number;
    export function readlink(path: string): [target: string, error: number];
    export function exec(args: string[], options?: ExecOptions): number;
    export function getpid(): number;
    export function waitpid(pid: number, options: number): [result: number, status: number];
    export const WNOHANG: number | undefined;
    export function dup(fd: number): number;
    export function dup2(oldFd: number, newFd: number): number;
    export function pipe(): [readFd: number, writeFd: number] | null;
}
