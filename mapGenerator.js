const WIDTH = 200;
const HEIGHT = 200;

// Terrain Types
const SEA = 0;
const PLAINS = 1;
const MOUNTAINS = 2;

function generateMap() {
    const map = [];

    for (let y = 0; y < HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < WIDTH; x++) {
            // Calculate distance from the center to determine edge proximity
            // dx and dy range from -0.5 to 0.5
            const dx = (x / WIDTH) - 0.5;
            const dy = (y / HEIGHT) - 0.5;

            // Distance from center, normalized to ~0 (center) to ~1.41 (corners)
            const distanceToCenter = Math.sqrt(dx * dx + dy * dy) * 2;

            // Hardcoded edge boundaries (guaranteed sea)
            const isAbsoluteEdge = x <= 1 || x >= WIDTH - 2 || y <= 1 || y >= HEIGHT - 2;

            if (isAbsoluteEdge || Math.random() < Math.pow(distanceToCenter, 4)) {
                // The further from the center, the higher the chance of Sea
                row.push(SEA);
            } else {
                // If not Sea, decide between Plains and Mountains
                // Plains are the most common, Mountains are less common (15% chance)
                if (Math.random() < 0.15) {
                    row.push(MOUNTAINS);
                } else {
                    row.push(PLAINS);
                }
            }
        }
        map.push(row);
    }

    return map;
}

// 2. Console Visualization
function visualizeMap(map) {
    // We use two characters per tile to make the map look more proportional (square)
    const symbols = {
        [SEA]: '~~',       // Blue sea
        [PLAINS]: '..',    // Green plains
        [MOUNTAINS]: '^^'  // Gray rocky mountains
    };

    console.log("=== GENERATED MAP (50x50) ===");
    for (let y = 0; y < map.length; y++) {
        let line = '';
        for (let x = 0; x < map[y].length; x++) {
            line += symbols[map[y][x]];
        }
        console.log(line);
    }
}

// Execute generator and visualize
const myRandomMap = generateMap();
visualizeMap(myRandomMap);
