declare module 'std' {
    export interface ErrorObject {
        errno?: number;
    }

    export interface EvalScriptOptions {
        backtrace_barrier?: boolean;
        async?: boolean;
    }

    export interface UrlGetOptions {
        binary?: boolean;
        full?: boolean;
    }

    export interface UrlGetResponse<TResponse> {
        response: TResponse | null;
        responseHeaders: string;
        status: number;
    }

    export function exit(code: number): never;
    export function evalScript(
        source: string,
        options: EvalScriptOptions & { async: true },
    ): Promise<{ value: unknown }>;
    export function evalScript(
        source: string,
        options?: EvalScriptOptions & { async?: false },
    ): unknown;
    export function evalScript(
        source: string,
        options: EvalScriptOptions,
    ): unknown | Promise<{ value: unknown }>;
    export function loadScript(filename: string): unknown;
    export function loadFile(filename: string): string | null;
    export function open(filename: string, flags: string, errorObject?: ErrorObject): FILE | null;
    export function popen(command: string, flags: string, errorObject?: ErrorObject): FILE | null;
    export function fdopen(fd: number, flags: string, errorObject?: ErrorObject): FILE | null;
    export function tmpfile(errorObject?: ErrorObject): FILE | null;
    export function puts(value: string): number;
    export function printf(format: string, ...args: unknown[]): number;
    export function sprintf(format: string, ...args: unknown[]): string;

    export const SEEK_SET: number;
    export const SEEK_CUR: number;
    export const SEEK_END: number;
    export const Error: {
        EINVAL: number;
        EIO: number;
        EACCES: number;
        EEXIST: number;
        ENOSPC: number;
        ENOSYS: number;
        EBUSY: number;
        ENOENT: number;
        EPERM: number;
        EPIPE: number;
        EBADF: number;
    };

    export function strerror(errno: number): string;
    export function gc(): void;
    export function getenv(name: string): string | undefined;
    export function setenv(name: string, value: string): void;
    export function unsetenv(name: string): void;
    export function getenviron(): Record<string, string>;

    export function urlGet(
        url: string,
        options: UrlGetOptions & { full: true; binary: true },
    ): UrlGetResponse<ArrayBuffer>;
    export function urlGet(
        url: string,
        options: UrlGetOptions & { full: true; binary?: false },
    ): UrlGetResponse<string>;
    export function urlGet(
        url: string,
        options: UrlGetOptions & { full?: false; binary: true },
    ): ArrayBuffer | null;
    export function urlGet(
        url: string,
        options?: UrlGetOptions & { full?: false; binary?: false },
    ): string | null;
    export function urlGet(
        url: string,
        options: UrlGetOptions,
    ): string | ArrayBuffer | UrlGetResponse<string | ArrayBuffer> | null;

    export function parseExtJSON(source: string): unknown;

    const standardInput: FILE;
    const standardOutput: FILE;
    const standardError: FILE;
    export { standardInput as in, standardOutput as out, standardError as err };
}
