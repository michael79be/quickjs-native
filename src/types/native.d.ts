export {};

declare global {
    const native: {
        dlopen(path: string): number | null;
        dlsym(handle: number, symbol: string): number | null;
        invoke(handle: number, args: any[], returnType?: string): number | null;
        dlclose(handle: number): number | null;
    };
}
