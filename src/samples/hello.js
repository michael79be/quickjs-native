import * as os from 'os';
import { loadLibrary, stringToUtf16Bytes } from '../index.mjs';

if (os.platform === 'win32') {
    const kernel32 = loadLibrary('kernel32.dll', {
        GetStdHandle: 'number',
        WriteConsoleW: 'boolean',
    });
    try {
        const stdout = kernel32.GetStdHandle([-11]);
        if (stdout === 0 || stdout === -1)
            throw new Error('Cannot access standard output');

        const messageText = 'Hello world !\r\n';
        const message = stringToUtf16Bytes(messageText);
        const written = new Uint32Array(1);
        const success = kernel32.WriteConsoleW([
            stdout,
            message.buffer,
            messageText.length,
            written.buffer,
            0,
        ]);
        if (!success || written[0] !== messageText.length)
            throw new Error('Cannot write to standard output');
    } finally {
        kernel32.destroy();
    }
} else {
    const library = loadLibrary(
        'libc.so.6;/usr/lib/libSystem.B.dylib',
        { puts: 'number' },
    );
    try {
        library.puts(['Hello world !']);
    } finally {
        library.destroy();
    }
}
