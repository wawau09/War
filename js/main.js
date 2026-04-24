// ==========================================
// 6. MAIN GAME LOOP
// ==========================================
let lastTime = performance.now();

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime; lastTime = currentTime;
    
    // --- Day Logic ---
    dayTimer += deltaTime;
    if (dayTimer >= DAY_DURATION) {
        dayTimer -= DAY_DURATION;
        currentDay++;
        const dayEl = document.getElementById('dayCount');
        if (dayEl) dayEl.innerText = currentDay;
        logCombat(`=== DAY ${currentDay} started! ===`);
        
        // Daily Food Generation from Townhall
        activeBuildings.forEach(b => {
            if (b.type === 'TOWNHALL') {
                playerResources.food += 10;
                updateResUI();
                createFloatingText('+10 Food', b.tileX * TILE_SIZE + TILE_SIZE/2, b.tileY * TILE_SIZE - 10, '#FF6347');
            }
        });
    }

    // Center camera on my player initially
    if (!camera.initialized && typeof units !== 'undefined' && units.length > 0) {
        const player = units.find(u => u.team === myPlayerId);
        if (player) {
            camera.x = player.x - (camera.width / camera.zoom / 2);
            camera.y = player.y - (camera.height / camera.zoom / 2);
            camera.initialized = true;
        }
    }

    // --- Camera Update ---
    camera.x += panDX * (deltaTime / 1000) / camera.zoom;
    camera.y += panDY * (deltaTime / 1000) / camera.zoom;
    if (camera.x < 0) camera.x = 0;
    if (camera.y < 0) camera.y = 0;
    const maxCamX = MAP_PIXEL_WIDTH - (camera.width / camera.zoom);
    const maxCamY = MAP_PIXEL_HEIGHT - (camera.height / camera.zoom);
    if (camera.x > maxCamX) camera.x = Math.max(0, maxCamX);
    if (camera.y > maxCamY) camera.y = Math.max(0, maxCamY);

    // --- Updates ---
    units.forEach(u => u.update(deltaTime));
    activeBuildings.forEach(b => b.update(deltaTime));

    // --- Combat System ---
    for (let i = 0; i < units.length; i++) {
        const attacker = units[i];
        attacker.isAttacking = false; attacker.attackTarget = null;
        let nearestEnemy = null; let minDistance = Infinity;

        for (let j = 0; j < units.length; j++) {
            if (i === j) continue;
            const potential = units[j];
            if (attacker.team !== potential.team && potential.hp > 0) {
                const dist = Math.sqrt((potential.x - attacker.x)**2 + (potential.y - attacker.y)**2);
                if (dist <= attacker.attackRange && dist < minDistance) {
                    minDistance = dist; nearestEnemy = potential;
                }
            }
        }

        if (nearestEnemy) {
            attacker.isAttacking = true; attacker.attackTarget = nearestEnemy;
            const damage = attacker.dps * (deltaTime / 1000);
            nearestEnemy.hp -= damage;
            if (Math.random() < 0.1) createFloatingText('-' + Math.floor(damage*10), nearestEnemy.x, nearestEnemy.y - 15, '#ff0000');
        }
    }

    // --- Death ---
    for (let i = units.length - 1; i >= 0; i--) {
        if (units[i].hp <= 0) {
            logCombat(`Team ${units[i].team} unit was destroyed!`);
            units.splice(i, 1);
            if(units[i]?.team === 1) updateQueueUI();
        }
    }

    if (!ctx) return; // Wait until canvas is initialized
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

    // --- Render Map ---
    if (!window.bgCanvas) {
        window.bgCanvas = document.createElement('canvas');
        window.bgCanvas.width = MAP_PIXEL_WIDTH;
        window.bgCanvas.height = MAP_PIXEL_HEIGHT;
        const bgCtx = window.bgCanvas.getContext('2d', { alpha: false });
        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                bgCtx.fillStyle = TERRAIN_COLORS[map[y][x]];
                bgCtx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    ctx.drawImage(window.bgCanvas, 0, 0);

    // --- Render Entities ---
    activeBuildings.forEach(b => b.draw(ctx));

    // Ghost Building
    if (buildMode && mouseTileX >= 0 && mouseTileY >= 0) {
        const px = mouseTileX * TILE_SIZE; const py = mouseTileY * TILE_SIZE;
        let valid = false;
        if (buildMode === 'HUT') valid = canBuildAt(mouseTileX, mouseTileY, 'HUT') && playerResources.wood >= 10;
        else if (buildMode === 'BARRACKS') valid = canBuildAt(mouseTileX, mouseTileY, 'BARRACKS') && playerResources.wood >= 30 && playerResources.iron >= 10;
        else if (buildMode === 'DOCK') valid = canBuildAt(mouseTileX, mouseTileY, 'DOCK') && playerResources.wood >= 40;
        
        ctx.fillStyle = valid ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        
        ctx.globalAlpha = 0.6;
        if (buildMode === 'HUT') {
            ctx.fillStyle = '#A0522D'; ctx.fillRect(px + 2, py + 6, TILE_SIZE - 4, TILE_SIZE - 6);
            ctx.beginPath(); ctx.moveTo(px, py + 6); ctx.lineTo(px + TILE_SIZE/2, py); ctx.lineTo(px + TILE_SIZE, py + 6);
            ctx.fillStyle = '#8B4513'; ctx.fill();
        } else if (buildMode === 'BARRACKS') {
            ctx.fillStyle = '#78909C'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        } else if (buildMode === 'DOCK') {
            ctx.fillStyle = '#8D6E63'; ctx.fillRect(px + 4, py, TILE_SIZE - 8, TILE_SIZE);
        }
        ctx.globalAlpha = 1.0;
    }

    units.forEach(u => u.draw(ctx));

    // --- Render Floating Texts ---
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 25 * (deltaTime / 1000); ft.life -= 1.0 * (deltaTime / 1000);
        if (ft.life <= 0) { floatingTexts.splice(i, 1); continue; }
        ctx.fillStyle = ft.color; ctx.globalAlpha = ft.life;
        ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y); ctx.globalAlpha = 1.0;
    }
    
    ctx.restore();

    requestAnimationFrame(gameLoop);
}
// --- Initialize Game ---
function startGame(seed) {
    if (seed !== undefined) {
        gameSeed = seed;
    }
    
    // Generate terrain based on seed
    generateMap();
    
    // Initialize starting position
    let startX = Math.floor(WIDTH / 2);
    let startY = Math.floor(HEIGHT / 2);
    let found = false;
    
    // Find nearest PLAINS
    for(let r=0; r<15; r++) {
        for(let dx=-r; dx<=r; dx++) {
            for(let dy=-r; dy<=r; dy++) {
                let tx = startX + dx; let ty = startY + dy;
                if(tx >= 0 && tx < WIDTH && ty >= 0 && ty < HEIGHT) {
                    if (map[ty][tx] === TERRAIN.PLAINS) {
                        startX = tx; startY = ty; found = true; break;
                    }
                }
            }
            if(found) break;
        }
        if(found) break;
    }
    
    // Spawn Townhall for Player 1 (Host)
    const townhallP1 = new Building(startX, startY, 'TOWNHALL');
    townhallP1.hp = 500;
    townhallP1.team = 1;
    activeBuildings.push(townhallP1);
    
    // Spawn Townhall for Player 2 (Client) on the opposite side
    let enemyStartX = WIDTH - startX - 1;
    let enemyStartY = HEIGHT - startY - 1;
    const townhallP2 = new Building(enemyStartX, enemyStartY, 'TOWNHALL');
    townhallP2.hp = 500;
    townhallP2.team = 2;
    activeBuildings.push(townhallP2);
    
    // Spawn initial workers
    const p1Worker = new Unit(startX * TILE_SIZE + TILE_SIZE/2, startY * TILE_SIZE + TILE_SIZE/2, 1);
    const p2Worker = new Unit(enemyStartX * TILE_SIZE + TILE_SIZE/2, enemyStartY * TILE_SIZE + TILE_SIZE/2, 2);
    units.push(p1Worker, p2Worker);

    // Center camera on MY player
    camera.initialized = false; // Force camera to re-center
    // In gameLoop, it will center on a unit that belongs to myPlayerId!
    
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Ensure game doesn't start automatically
// startGame(); // called from network.js
