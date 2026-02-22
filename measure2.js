import fs from 'fs';
import zlib from 'zlib';

const buf = fs.readFileSync('./src/assets/cortador.png');
let offset = 8;
let width, height, colorType;
const idatChunks = [];

while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
        width = buf.readUInt32BE(offset + 8);
        height = buf.readUInt32BE(offset + 12);
        colorType = buf.readUInt8(offset + 17);
    } else if (type === 'IDAT') {
        idatChunks.push(buf.subarray(offset + 8, offset + 8 + length));
    } else if (type === 'IEND') {
        break;
    }
    offset += length + 12;
}

const deflated = Buffer.concat(idatChunks);
const inflated = zlib.inflateSync(deflated);

const bpp = colorType === 6 ? 4 : (colorType === 2 ? 3 : 1);
const rowBytes = width * bpp;
const raw = Buffer.alloc(height * rowBytes);

let inOffset = 0;
let outOffset = 0;

function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

for (let y = 0; y < height; y++) {
    const filter = inflated[inOffset++];
    for (let x = 0; x < rowBytes; x++) {
        let v = inflated[inOffset + x];
        const a = x >= bpp ? raw[outOffset + x - bpp] : 0;
        const b = y > 0 ? raw[outOffset - rowBytes + x] : 0;
        const c = (x >= bpp && y > 0) ? raw[outOffset - rowBytes + x - bpp] : 0;

        if (filter === 1) v += a;
        else if (filter === 2) v += b;
        else if (filter === 3) v += Math.floor((a + b) / 2);
        else if (filter === 4) v += paeth(a, b, c);

        raw[outOffset + x] = v & 0xff;
    }
    inOffset += rowBytes;
    outOffset += rowBytes;
}

function getAlpha(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return raw[(y * width + x) * bpp + 3];
}

// The hole is in the upper part, let's start at a rough center of the upper half.
const startX = Math.floor(width / 2);
const startY = Math.floor(height * 0.315);

let minX = startX;
while (minX > 0 && getAlpha(minX - 1, startY) < 128) minX--;

let maxX = startX;
while (maxX < width - 1 && getAlpha(maxX + 1, startY) < 128) maxX++;

let minY = startY;
while (minY > 0 && getAlpha(startX, minY - 1) < 128) minY--;

let maxY = startY;
while (maxY < height - 1 && getAlpha(startX, maxY + 1) < 128) maxY++;

console.log(`Hole bounds: minX=${minX}, maxX=${maxX}, minY=${minY}, maxY=${maxY}`);
console.log(`Hole center %: X=${((minX + maxX) / 2 / width * 100).toFixed(2)}%, Y=${((minY + maxY) / 2 / height * 100).toFixed(2)}%`);
console.log(`Hole size %: W=${((maxX - minX) / width * 100).toFixed(2)}%, H=${((maxY - minY) / height * 100).toFixed(2)}%`);
