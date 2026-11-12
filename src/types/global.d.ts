export { };

declare global {
    interface Console {
        log(...args: any[]): void;
    }

    interface Performance {
        now(): number;
    }

    type FILE = {
        close(): number;
        puts(str: string): number;
        printf(format: string, ...args: unknown[]): number;
        flush(): void;
        seek(offset: number | bigint, whence: number): number;
        tell(): number;
        tello(): bigint;
        eof(): boolean;
        fileno(): number;
        error(): boolean;
        clearerr(): void;
        read(buffer: ArrayBuffer, position: number, length: number): number;
        write(buffer: ArrayBuffer, position: number, length: number): number;
        getline(): string | null;
        readAsString(maxSize?: number): string;
        getByte(): number;
        putByte(byte: number): number;
    };

    const scriptArgs: string[];
    function print(...args: unknown[]): void;
}
