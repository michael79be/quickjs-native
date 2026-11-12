/// <reference path="./global.d.ts" />
/// <reference path="./native.d.ts" />
/// <reference path="./std.d.ts" />
/// <reference path="./os.d.ts" />

export type NativeReturnType = 'string' | 'number' | 'boolean';

export type NativeReturnValue<T extends NativeReturnType> =
    T extends 'string' ? string | null :
    T extends 'number' ? number :
    boolean;

export type LoadedNativeLibrary<T extends Record<string, NativeReturnType>> = {
    [K in keyof T]: (args: unknown[]) => NativeReturnValue<T[K]>;
} & {
    destroy(): void;
};

export declare function stringToUtf16Bytes(value: string): Uint8Array;

export declare function loadLibrary<T extends Record<string, NativeReturnType>>(
    paths: string,
    functions: T,
): LoadedNativeLibrary<T>;
