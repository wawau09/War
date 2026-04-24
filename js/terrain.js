// ==========================================
// 2. TERRAIN & MAP GENERATION
// ==========================================

// --- Simple 2D Value Noise ---
const noiseGridSize = 256;
const noiseValues = new Float32Array(noiseGridSize * noiseGridSize);
for (let i = 0; i < noiseValues.length; i++) noiseValues[i] = seededRandom();

function lerp(a, b, t) { return a + t * (b - a); }
function smoothstep(t) { return t * t * (3 - 2 * t); }

function getNoise(x, y) {
    const ix = Math.floor(x) & 255; const iy = Math.floor(y) & 255;
    const jx = (ix + 1) & 255; const jy = (iy + 1) & 255;
    const fx = smoothstep(x - Math.floor(x)); const fy = smoothstep(y - Math.floor(y));

    const n00 = noiseValues[iy * 256 + ix]; const n10 = noiseValues[iy * 256 + jx];
    const n01 = noiseValues[jy * 256 + ix]; const n11 = noiseValues[jy * 256 + jx];
    return lerp(lerp(n00, n10, fx), lerp(n01, n11, fx), fy);
}

// Generate Map (Noise Based)
const map = [];
const scale = 0.15; // Noise zoom level

function generateMap() {
    map.length = 0; // Clear existing map
    for (let y = 0; y < HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < WIDTH; x++) {
            // 2 Octaves of noise for more natural borders
            let n = getNoise(x * scale, y * scale);
            n += getNoise(x * scale * 2, y * scale * 2) * 0.5;
            n = n / 1.5; // Normalize back to 0~1

            // Keep the island feeling by subtracting distance from center
            const dx = (x / WIDTH) - 0.5; const dy = (y / HEIGHT) - 0.5;
            const dist = Math.sqrt(dx * dx + dy * dy) * 2;
            const finalValue = n - (dist * 0.5);

            if (finalValue < 0.25) {
                row.push(TERRAIN.SEA);
            } else if (finalValue > 0.6) {
                row.push(TERRAIN.MOUNTAINS);
            } else {
                row.push(TERRAIN.PLAINS);
            }
        }
        map.push(row);
    }
}
