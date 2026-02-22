import fs from 'fs';
import zlib from 'zlib';

const buf = fs.readFileSync('./src/assets/cortador.png');
let offset = 8;
let width, height, bitDepth, colorType;
const idatChunks = [];

while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
        width = buf.readUInt32BE(offset + 8);
        height = buf.readUInt32BE(offset + 12);
        bitDepth = buf.readUInt8(offset + 16);
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

// colorType === 6 is RGBA (4 bytes per pixel)
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

let minX = width, minY = height, maxX = 0, maxY = 0;

for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * bpp;
        // assume RGBA
        const alpha = bpp === 4 ? raw[offset + 3] : 255;
        if (alpha < 50) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    }
}
// Expand a bit to avoid edge pixels
console.log(`minX: ${minX}, minY: ${minY}, maxX: ${maxX}, maxY: ${maxY}, width: ${width}, height: ${height}`);
console.log(`HOLE X: ${(minX / width * 100).toFixed(2)}%`);
console.log(`HOLE Y: ${(minY / height * 100).toFixed(2)}%`);
console.log(`HOLE W: ${((maxX - minX) / width * 100).toFixed(2)}%`);
console.log(`HOLE H: ${((maxY - minY) / height * 100).toFixed(2)}%`);
