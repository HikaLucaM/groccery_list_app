import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

if (typeof globalThis.btoa !== 'function') {
  globalThis.btoa = (input) => Buffer.from(String(input), 'binary').toString('base64');
}
