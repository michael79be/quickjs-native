import * as os from 'os';

export function stringToUtf16Bytes(value) {
    const bytes = new Uint8Array(value.length * 2);
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        bytes[i * 2] = code & 0xff;
        bytes[i * 2 + 1] = code >> 8;
    }
    return bytes;
}

function libraryPlatform(path) {
    if (/\.so(?:\.\d+)*$/i.test(path))
        return 'linux';
    if (/\.dylib$/i.test(path))
        return 'darwin';
    if (/\.dll$/i.test(path))
        return 'win32';
    return null;
}

export function loadLibrary(paths, functions) {
    if (typeof paths !== 'string')
        throw new Error('Library paths must be a semicolon-separated string.');
    if (functions === null || typeof functions !== 'object' || Array.isArray(functions))
        throw new Error('Function definitions must be an object.');

    const definitions = Object.entries(functions);
    for (const [name, returnType] of definitions) {
        if (name === 'destroy')
            throw new Error('"destroy" is reserved for the library handle.');
        if (returnType !== 'string' && returnType !== 'number' && returnType !== 'boolean')
            throw new Error(`Unsupported return type for ${name}: ${returnType}`);
    }

    const platform = os.platform;
    const candidates = paths.split(';').map((path) => path.trim()).filter(Boolean)
        .filter((path) => libraryPlatform(path) === platform);
    if (candidates.length === 0)
        throw new Error(`No library path provided for platform ${platform}.`);
    if (typeof native === 'undefined')
        throw new Error('loadLibrary requires the QuickJS native FFI.');

    let handle = null;
    let libraryPath;
    for (const candidate of candidates) {
        handle = native.dlopen(candidate);
        if (handle !== null && handle !== 0) {
            libraryPath = candidate;
            break;
        }
    }
    if (handle === null || handle === 0)
        throw new Error(`Unable to load a native library for ${platform}: ${candidates.join(', ')}`);

    const loaded = Object.create(null);
    let destroyed = false;
    loaded.destroy = () => {
        if (destroyed)
            return;
        native.dlclose(handle);
        destroyed = true;
    };

    try {
        for (const [name, returnType] of definitions) {
            const address = native.dlsym(handle, name);
            if (address === null || address === 0)
                throw new Error(`Function ${name} was not found in ${libraryPath}.`);
            loaded[name] = (args) => {
                if (destroyed)
                    throw new Error(`Cannot call ${name}: library has been destroyed.`);
                if (!Array.isArray(args))
                    throw new Error(`Arguments for ${name} must be an array.`);
                return native.invoke(
                    address,
                    args,
                    returnType === 'boolean' ? 'bool' : returnType,
                );
            };
        }
    } catch (error) {
        loaded.destroy();
        throw error;
    }

    return loaded;
}
