// generate-icons.mjs
import sharp from 'sharp';
await sharp('public/icon-source.svg').resize(192, 192).png().toFile('public/pwa-192x192.png');
await sharp('public/icon-source.svg').resize(512, 512).png().toFile('public/pwa-512x512.png');
console.log('Icons regenerated');