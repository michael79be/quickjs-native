#!/usr/bin/env node

import { bundle } from './bundle.mjs';
import { showHelp } from './help.mjs';

const [command, ...args] = process.argv.slice(2);

if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
} else if (command === 'bundle') {
    try {
        await bundle(args);
    } catch (error) {
        console.error(`quickjs-native: ${error.message}`);
        process.exitCode = 1;
    }
} else {
    console.error(`Unknown command: ${command}\n`);
    showHelp();
    process.exitCode = 2;
}
