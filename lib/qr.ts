/**
 * Zero-dependency ISO/IEC 18004 QR Code matrix generator (Versions 1-10, EC Level L, Byte mode).
 * Produces a boolean[][] module matrix (true = dark, false = light) for URLs up to 271 bytes.
 */

// [totalCodewords, ecCodewordsPerBlock, numBlocks] for EC Level L, Versions 1..10
const VERSION_INFO_L: Array<[number, number, number]> = [
  [0, 0, 0],       // unused 0
  [26, 7, 1],      // V1:  19 data
  [44, 10, 1],     // V2:  34 data
  [70, 15, 1],     // V3:  55 data
  [100, 20, 1],    // V4:  80 data
  [134, 26, 1],    // V5: 108 data
  [172, 18, 2],    // V6: 136 data
  [196, 20, 2],    // V7: 156 data
  [242, 24, 2],    // V8: 194 data
  [292, 30, 2],    // V9: 232 data
  [346, 18, 4],    // V10: 274 data
];

const ALIGNMENT_POSITIONS: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

// GF(256) with primitive polynomial 0x11d (285)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsComputeEcc(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen);
  const res = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.copyWithin(0, 1);
    res[ecLen - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecLen; j++) {
        res[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return res;
}

function pickVersion(byteLen: number): number {
  for (let v = 1; v <= 10; v++) {
    const [total, ecPerBlock, blocks] = VERSION_INFO_L[v];
    const dataBytes = total - ecPerBlock * blocks;
    const headerBits = 4 + (v >= 10 ? 16 : 8);
    const neededBytes = Math.ceil((headerBits + byteLen * 8) / 8);
    if (neededBytes <= dataBytes) return v;
  }
  throw new Error(`QR payload too long (${byteLen} bytes)`);
}

function encodeDataBits(bytes: Uint8Array, version: number): Uint8Array {
  const [total, ecPerBlock, blocks] = VERSION_INFO_L[version];
  const dataCapacity = total - ecPerBlock * blocks;
  const bits: number[] = [];

  const pushBits = (val: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  // Mode: Byte (0100)
  pushBits(0b0100, 4);
  // Character count
  pushBits(bytes.length, version >= 10 ? 16 : 8);
  // Payload bytes
  for (let i = 0; i < bytes.length; i++) {
    pushBits(bytes[i], 8);
  }
  // Terminator (up to 4 zero bits)
  const maxBits = dataCapacity * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) {
    bits.push(0);
  }
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = new Uint8Array(dataCapacity);
  for (let i = 0; i < bits.length / 8; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
    codewords[i] = b;
  }

  // Pad bytes 0xEC, 0x11
  let idx = bits.length / 8;
  let padToggle = 0;
  while (idx < dataCapacity) {
    codewords[idx++] = padToggle === 0 ? 0xec : 0x11;
    padToggle ^= 1;
  }

  // Split into blocks & interleave
  const shortBlockLen = Math.floor(dataCapacity / blocks);
  const longBlocks = dataCapacity % blocks;
  const dataBlocks: Uint8Array[] = [];
  const eccBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let b = 0; b < blocks; b++) {
    const len = shortBlockLen + (b >= blocks - longBlocks ? 1 : 0);
    const slice = codewords.subarray(offset, offset + len);
    offset += len;
    dataBlocks.push(slice);
    eccBlocks.push(rsComputeEcc(slice, ecPerBlock));
  }

  const finalBytes = new Uint8Array(total);
  let outIdx = 0;
  const maxDataLen = shortBlockLen + (longBlocks > 0 ? 1 : 0);
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < blocks; b++) {
      if (i < dataBlocks[b].length) finalBytes[outIdx++] = dataBlocks[b][i];
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < blocks; b++) {
      finalBytes[outIdx++] = eccBlocks[b][i];
    }
  }
  return finalBytes;
}

function buildMatrix(version: number, codewords: Uint8Array): boolean[][] {
  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunc: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunc = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark;
      isFunc[r][c] = true;
    }
  };

  const drawFinder = (r0: number, c0: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const dark =
          dr >= 0 &&
          dr <= 6 &&
          dc >= 0 &&
          dc <= 6 &&
          (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        setFunc(r0 + dr, c0 + dc, dark);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment patterns
  const align = ALIGNMENT_POSITIONS[version];
  for (const r of align) {
    for (const c of align) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFunc(r + dr, c + dc, dark);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  // Dark module & reserve format info
  setFunc(size - 8, 8, true);
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isFunc[8][i] = true;
      isFunc[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunc[8][size - 1 - i] = true;
    isFunc[size - 1 - i][8] = true;
  }

  // Version info (V7+)
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
    const vBits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((vBits >> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunc(a, b, dark);
      setFunc(b, a, dark);
    }
  }

  // Place data bits (zigzag)
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? size - 1 - vert : vert;
        if (!isFunc[row][col] && bitIdx < totalBits) {
          const b = codewords[bitIdx >> 3];
          modules[row][col] = ((b >> (7 - (bitIdx & 7))) & 1) === 1;
          bitIdx++;
        }
      }
    }
  }

  // Apply mask 0 ((row + col) % 2 === 0) and write format info for EC Level L (01) + Mask 0 (000) -> 0x77c4
  const mask = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunc[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c];
      }
    }
  }

  const formatData = (0b01 << 3) | mask;
  let rem = formatData;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  const formatBits = ((formatData << 10) | rem) ^ 0x5412;

  for (let i = 0; i < 15; i++) {
    const dark = ((formatBits >> i) & 1) === 1;
    // Around top-left
    if (i < 6) modules[8][i] = dark;
    else if (i < 8) modules[8][i + 1] = dark;
    else modules[8][size - 15 + i] = dark;

    if (i < 8) modules[size - 1 - i][8] = dark;
    else if (i < 9) modules[7][8] = dark;
    else modules[14 - i][8] = dark;
  }

  return modules;
}

/**
 * Generates a scannable QR code boolean matrix for the given UTF-8 text.
 */
export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const version = pickVersion(bytes.length);
  const codewords = encodeDataBits(bytes, version);
  return buildMatrix(version, codewords);
}
