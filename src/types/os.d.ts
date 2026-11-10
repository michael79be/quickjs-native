declare module 'os' {
    export const platform: string;
    export function getcwd(): [string, string];
    export function realpath(path: string): [string, string];
    export function exec(args: string[], options?: {
        stdout?: number,
        stderr?: number
    }): string;
    export function pipe(): [number, number];
    export function read(handle: number, buffer: ArrayBuffer, pos: number, len: number): void;
    export function close(handle: number): void;
}
