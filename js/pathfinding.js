// ==========================================
// A* PATHFINDING ALGORITHM
// ==========================================

class AStarNode {
    constructor(x, y, g = 0, h = 0, parent = null) {
        this.x = x;
        this.y = y;
        this.g = g;
        this.h = h;
        this.f = g + h;
        this.parent = parent;
    }
}

// Check if a tile is walkable for a given unit type
function isWalkable(tx, ty, unitType) {
    if (tx < 0 || tx >= WIDTH || ty < 0 || ty >= HEIGHT) return false;
    const terrain = map[ty][tx];
    
    if (unitType === 'SHIP') {
        return terrain === TERRAIN.SEA;
    } else {
        return terrain !== TERRAIN.SEA;
    }
}

// Find path from (startX, startY) to (endX, endY) using A*
function findPath(startX, startY, endX, endY, unitType) {
    startX = Math.floor(startX); startY = Math.floor(startY);
    endX = Math.floor(endX); endY = Math.floor(endY);

    // If end is not walkable, try to find the nearest walkable neighbor to the end
    if (!isWalkable(endX, endY, unitType)) {
        let bestDist = Infinity;
        let bestEnd = null;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                let nx = endX + dx, ny = endY + dy;
                if (isWalkable(nx, ny, unitType)) {
                    let d = Math.abs(startX - nx) + Math.abs(startY - ny); // Manhattan to start
                    if (d < bestDist) {
                        bestDist = d;
                        bestEnd = { x: nx, y: ny };
                    }
                }
            }
        }
        if (!bestEnd) return null; // Completely unreachable
        endX = bestEnd.x;
        endY = bestEnd.y;
    }

    if (startX === endX && startY === endY) return [];

    let openList = [];
    let closedMap = new Uint8Array(WIDTH * HEIGHT); // 1 = closed
    let openMap = new Map(); // key: "x,y", value: AStarNode

    let startNode = new AStarNode(startX, startY, 0, Math.abs(startX - endX) + Math.abs(startY - endY));
    openList.push(startNode);
    openMap.set(`${startX},${startY}`, startNode);
    
    let iterations = 0;
    const MAX_ITERATIONS = 3000; // Safeguard against infinite loops

    const getNeighbors = (node) => {
        let neighbors = [];
        // Diagonal and orthogonal
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                let nx = node.x + dx; let ny = node.y + dy;
                if (isWalkable(nx, ny, unitType)) {
                    // Prevent corner cutting
                    if (dx !== 0 && dy !== 0) {
                        if (!isWalkable(node.x + dx, node.y, unitType) || !isWalkable(node.x, node.y + dy, unitType)) continue;
                    }
                    neighbors.push({x: nx, y: ny, cost: (dx !== 0 && dy !== 0) ? 1.414 : 1});
                }
            }
        }
        return neighbors;
    };

    while (openList.length > 0) {
        iterations++;
        if (iterations > MAX_ITERATIONS) return null; 

        // Get node with lowest F score
        let lowestIndex = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < openList[lowestIndex].f || 
               (openList[i].f === openList[lowestIndex].f && openList[i].h < openList[lowestIndex].h)) {
                lowestIndex = i;
            }
        }

        let current = openList[lowestIndex];

        // Reached the destination
        if (current.x === endX && current.y === endY) {
            let path = [];
            let curr = current;
            while (curr.parent) {
                path.push({ tx: curr.x, ty: curr.y });
                curr = curr.parent;
            }
            return path.reverse();
        }

        openList.splice(lowestIndex, 1);
        openMap.delete(`${current.x},${current.y}`);
        closedMap[current.y * WIDTH + current.x] = 1;

        let neighbors = getNeighbors(current);
        for (let neighbor of neighbors) {
            if (closedMap[neighbor.y * WIDTH + neighbor.x] === 1) continue;

            let gScore = current.g + neighbor.cost;
            let key = `${neighbor.x},${neighbor.y}`;
            let neighborNode = openMap.get(key);
            
            if (!neighborNode) {
                let hScore = Math.abs(neighbor.x - endX) + Math.abs(neighbor.y - endY);
                neighborNode = new AStarNode(neighbor.x, neighbor.y, gScore, hScore, current);
                openList.push(neighborNode);
                openMap.set(key, neighborNode);
            } else if (gScore < neighborNode.g) {
                neighborNode.parent = current;
                neighborNode.g = gScore;
                neighborNode.f = neighborNode.g + neighborNode.h;
            }
        }
    }
    
    return null; // Path not found
}
