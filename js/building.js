// ==========================================
// 3. BUILDING SYSTEM
// ==========================================
const activeBuildings = [];

class Building {
    constructor(tileX, tileY, type, id = null) {
        this.id = id || generateNetworkId();
        this.tileX = tileX; this.tileY = tileY; this.type = type; this.timer = 0;
        this.hp = 100; // Buildings can have HP too!
    }
    update(deltaTime) {
        if (this.type === 'TOWNHALL') {
            // Food is now generated once per day in main.js
        }
    }
    draw(ctx) {
        const px = this.tileX * TILE_SIZE; const py = this.tileY * TILE_SIZE;
        if (this.type === 'HUT') {
            ctx.fillStyle = '#A0522D'; ctx.fillRect(px + 2, py + 6, TILE_SIZE - 4, TILE_SIZE - 6);
            ctx.beginPath(); ctx.moveTo(px, py + 6); ctx.lineTo(px + TILE_SIZE/2, py); ctx.lineTo(px + TILE_SIZE, py + 6);
            ctx.fillStyle = '#8B4513'; ctx.fill(); ctx.closePath();
        } else if (this.type === 'TOWNHALL') {
            const teamColor = this.team === myPlayerId ? '#2196F3' : '#f44336';
            ctx.fillStyle = teamColor; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); // Base
            ctx.fillStyle = '#FFD700'; ctx.fillRect(px + 4, py - 10, 2, 10); // Flag pole
            // ctx.fillStyle = this.team === myPlayerId ? '#f44336' : '#2196F3'; // Flag
            // ctx.fillRect(px + 6, py - 10, 8, 6); 
        } else if (this.type === 'BARRACKS') {
            ctx.fillStyle = '#78909C'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = '#455A64'; ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else if (this.type === 'DOCK') {
            ctx.fillStyle = '#8D6E63'; ctx.fillRect(px + 4, py, TILE_SIZE - 8, TILE_SIZE);
            ctx.fillStyle = '#5D4037';
            for (let i = 0; i < TILE_SIZE; i += 4) ctx.fillRect(px + 4, py + i, TILE_SIZE - 8, 1);
        }
    }
}

function canBuildAt(tx, ty, type) {
    if (tx < 0 || tx >= WIDTH || ty < 0 || ty >= HEIGHT) return false;
    
    // Check if tile is already occupied
    for (let b of activeBuildings) { if (b.tileX === tx && b.tileY === ty) return false; }
    
    const terrain = map[ty][tx];
    
    if (type === 'HUT' || type === 'BARRACKS' || type === 'TOWNHALL') {
        if (terrain !== TERRAIN.PLAINS) return false;
    } else if (type === 'DOCK') {
        if (terrain !== TERRAIN.SEA) return false;
        // Must be adjacent to Plains
        let adjacentPlains = false;
        if (tx > 0 && map[ty][tx-1] === TERRAIN.PLAINS) adjacentPlains = true;
        if (tx < WIDTH-1 && map[ty][tx+1] === TERRAIN.PLAINS) adjacentPlains = true;
        if (ty > 0 && map[ty-1][tx] === TERRAIN.PLAINS) adjacentPlains = true;
        if (ty < HEIGHT-1 && map[ty+1][tx] === TERRAIN.PLAINS) adjacentPlains = true;
        if (!adjacentPlains) return false;
    }
    
    return true;
}
