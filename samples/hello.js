import * as os from 'os';
import * as std from 'std';

function stringToUtf16Bytes(str) {
    const utf16Bytes = new Uint8Array(str.length * 2);
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        utf16Bytes[i * 2] = code & 0xFF;
        utf16Bytes[i * 2 + 1] = (code >> 8) & 0xFF;
    }
    return utf16Bytes;
}

if ('darwin' === os.platform) {
    os.exec(['osascript', '-e', 'display dialog "Hello sent from Quick JS" with title "Quick JS" buttons {"OK"} default button "OK"']);
    std.exit(0);
}

const user32 = native.dlopen('user32.dll');

if (user32 !== 0 && user32 !== null) {
    print('Success : user32.dll loaded ! Handle :', user32);

    const msgBoxAddr = native.dlsym(user32, 'MessageBoxW');
    print('Adresse de MessageBoxW :', msgBoxAddr);

    if (msgBoxAddr) {
        const text = stringToUtf16Bytes('« Hello sent from Quick JS »\x00');
        const result = native.invoke(msgBoxAddr, [0, text.buffer, stringToUtf16Bytes('« Quick JS »\x00').buffer, 0]);

        print('Result :', result);
    }

    native.dlclose(user32);
} else {
    print('Error loading user32.dll');
}
