export { };

declare global {
    type FILE = {
        fileno: () => number;
        readAsString: () => string;
    };
    const scriptArgs: string[];
    function print(...args: any[]): void;
    const native: {
        dlopen(path: string): number | null;
        dlsym(handle: number, symbol: string): number | null;
        invoke(handle: number, args: any[], returnType?: string): number | null;
        dlclose(handle: number): number | null;
    };
}
