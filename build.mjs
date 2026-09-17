import { copyFile, mkdir } from 'node:fs/promises';
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
await copyFile(new URL('./smart-ventilation-card.js', import.meta.url), new URL('./dist/smart-ventilation-card.js', import.meta.url));
console.log('Built dist/smart-ventilation-card.js (no runtime dependencies)');
