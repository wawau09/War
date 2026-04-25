// ==========================================
// 5. INPUT LOGIC
// ==========================================
const btnBuildHut = document.getElementById('btnBuildHut');
const btnBuildBarracks = document.getElementById('btnBuildBarracks');
const btnBuildDock = document.getElementById('btnBuildDock');

function setBuildMode(mode) {
    buildMode = buildMode === mode ? null : mode;
    
    if (btnBuildHut) {
        btnBuildHut.className = buildMode === 'HUT' ? 'active-mode' : '';
        btnBuildHut.innerText = buildMode === 'HUT' ? 'Cancel Building' : 'Build Hut (10 Wood)';
    }
    if (btnBuildBarracks) {
        btnBuildBarracks.className = buildMode === 'BARRACKS' ? 'active-mode' : '';
        btnBuildBarracks.innerText = buildMode === 'BARRACKS' ? 'Cancel Building' : 'Build Military Base (30 W, 10 I)';
    }
    if (btnBuildDock) {
        btnBuildDock.className = buildMode === 'DOCK' ? 'active-mode' : '';
        btnBuildDock.innerText = buildMode === 'DOCK' ? 'Cancel Building' : 'Build Naval Base (40 Wood)';
    }
}

if (btnBuildHut) btnBuildHut.addEventListener('click', () => setBuildMode('HUT'));
if (btnBuildBarracks) btnBuildBarracks.addEventListener('click', () => setBuildMode('BARRACKS'));
if (btnBuildDock) btnBuildDock.addEventListener('click', () => setBuildMode('DOCK'));

const btnSpawnEnemy = document.getElementById('btnSpawnEnemy');
if (btnSpawnEnemy) {
    btnSpawnEnemy.addEventListener('click', () => {
        const rx = Math.random() * (WIDTH * TILE_SIZE - 40) + 20;
        const ry = Math.random() * (HEIGHT * TILE_SIZE - 40) + 20;
        units.push(new Unit(rx, ry, 2));
        logCombat('A wild Enemy appeared!');
    });
}

// Edge Scrolling Logic
window.addEventListener('mousemove', (e) => {
    const edgeSize = 40; 
    const panSpeed = 800; // pixels per second
    panDX = 0; panDY = 0;
    
    // Check if mouse is near screen edges
    if (e.clientX < edgeSize) panDX = -panSpeed;
    else if (e.clientX > window.innerWidth - edgeSize) panDX = panSpeed;
    
    if (e.clientY < edgeSize) panDY = -panSpeed;
    else if (e.clientY > window.innerHeight - edgeSize) panDY = panSpeed;
});

if (canvas) {
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const worldX = ((e.clientX - rect.left) / camera.zoom) + camera.x;
        const worldY = ((e.clientY - rect.top) / camera.zoom) + camera.y;
        mouseTileX = Math.floor(worldX / TILE_SIZE);
        mouseTileY = Math.floor(worldY / TILE_SIZE);
    });
    
    canvas.addEventListener('mouseleave', () => { 
        mouseTileX = -1; mouseTileY = -1; 
    });

    // Helper for unit building (so we can run it locally and remotely)
function executeBuildCommand(playerId, cmd) {
    const b = activeBuildings.find(building => building.id === cmd.buildingId);
    if (!b) return;

    if (cmd.unitType === 'WORKER') {
        if (playerId === myPlayerId) {
            playerResources.food -= 10; updateResUI();
        }
        const worker = new Unit(b.tileX * TILE_SIZE + TILE_SIZE/2, b.tileY * TILE_SIZE + TILE_SIZE + 5, playerId, cmd.newUnitId);
        units.push(worker);
    } else if (cmd.unitType === 'SOLDIER') {
        if (playerId === myPlayerId) {
            playerResources.wood -= 10; playerResources.food -= 10; updateResUI();
        }
        const soldier = new Unit(b.tileX * TILE_SIZE + TILE_SIZE/2, b.tileY * TILE_SIZE + TILE_SIZE + 5, playerId, cmd.newUnitId);
        soldier.type = 'SOLDIER'; soldier.hp = 200; soldier.maxHp = 200; soldier.dps = 40; soldier.speed = 50; soldier.color = '#e74c3c';
        units.push(soldier);
    } else if (cmd.unitType === 'SHIP') {
        if (playerId === myPlayerId) {
            playerResources.wood -= 30; updateResUI();
        }
        const ship = new Unit(b.tileX * TILE_SIZE + TILE_SIZE/2, b.tileY * TILE_SIZE + TILE_SIZE + 5, playerId, cmd.newUnitId);
        ship.type = 'SHIP'; ship.hp = 300; ship.maxHp = 300; ship.dps = 50; ship.speed = 120; ship.radius = 12; ship.color = '#3498db';
        units.push(ship);
    }
}

canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const worldX = ((e.clientX - rect.left) / camera.zoom) + camera.x;
        const worldY = ((e.clientY - rect.top) / camera.zoom) + camera.y;
        const tx = Math.floor(worldX / TILE_SIZE);
        const ty = Math.floor(worldY / TILE_SIZE);
        
        if (e.button === 0) { // Left Click
            if (buildMode) {
                if (buildMode === 'HUT') {
                    if (playerResources.wood >= 10 && canBuildAt(tx, ty, 'HUT')) {
                        playerResources.wood -= 10; updateResUI();
                        
                        const buildId = generateNetworkId();
                        const b = new Building(tx, ty, 'HUT', buildId);
                        b.team = myPlayerId; activeBuildings.push(b);
                        
                        const spawnUnitId = generateNetworkId();
                        const worker = new Unit((tx * TILE_SIZE) + TILE_SIZE/2, (ty * TILE_SIZE) + TILE_SIZE/2, myPlayerId, spawnUnitId);
                        units.push(worker);
                        
                        createFloatingText('-10 Wood', tx * TILE_SIZE + TILE_SIZE/2, ty * TILE_SIZE, '#ff9800');
                        if (typeof broadcastCommand === 'function') broadcastCommand({ action: 'construct', playerId: myPlayerId, command: { type: 'construct', buildingType: 'HUT', tx, ty, buildId, spawnUnitId } });
                        setBuildMode('HUT');
                    } else if (playerResources.wood < 10) {
                        createFloatingText('Not enough wood!', tx * TILE_SIZE + TILE_SIZE/2, ty * TILE_SIZE, '#f44336');
                    }
                } else if (buildMode === 'BARRACKS') {
                    if (playerResources.wood >= 30 && playerResources.iron >= 10 && canBuildAt(tx, ty, 'BARRACKS')) {
                        playerResources.wood -= 30; playerResources.iron -= 10; updateResUI();
                        
                        const buildId = generateNetworkId();
                        const b = new Building(tx, ty, 'BARRACKS', buildId);
                        b.team = myPlayerId; activeBuildings.push(b);
                        
                        const spawnUnitId = generateNetworkId();
                        const soldier = new Unit((tx * TILE_SIZE) + TILE_SIZE/2, (ty * TILE_SIZE) + TILE_SIZE/2, myPlayerId, spawnUnitId);
                        soldier.type = 'SOLDIER'; soldier.hp = 200; soldier.maxHp = 200; soldier.dps = 40; soldier.speed = 50;
                        units.push(soldier);
                        
                        createFloatingText('-30 W, -10 I', tx * TILE_SIZE + TILE_SIZE/2, ty * TILE_SIZE, '#ff9800');
                        if (typeof broadcastCommand === 'function') broadcastCommand({ action: 'construct', playerId: myPlayerId, command: { type: 'construct', buildingType: 'BARRACKS', tx, ty, buildId, spawnUnitId } });
                        setBuildMode('BARRACKS');
                    } else if (playerResources.wood < 30 || playerResources.iron < 10) {
                        createFloatingText('Need 30 Wood, 10 Iron!', tx * TILE_SIZE + TILE_SIZE/2, ty * TILE_SIZE, '#f44336');
                    }
                } else if (buildMode === 'DOCK') {
                    if (playerResources.wood >= 40 && canBuildAt(tx, ty, 'DOCK')) {
                        playerResources.wood -= 40; updateResUI();
                        
                        const buildId = generateNetworkId();
                        const b = new Building(tx, ty, 'DOCK', buildId);
                        b.team = myPlayerId; activeBuildings.push(b);
                        
                        const spawnUnitId = generateNetworkId();
                        const ship = new Unit((tx * TILE_SIZE) + TILE_SIZE/2, (ty * TILE_SIZE) + TILE_SIZE/2, myPlayerId, spawnUnitId);
                        ship.type = 'SHIP'; ship.hp = 300; ship.maxHp = 300; ship.dps = 50; ship.speed = 120; ship.radius = 12;
                        units.push(ship);
                        
                        createFloatingText('-40 Wood', tx * TILE_SIZE + TILE_SIZE/2, ty * TILE_SIZE, '#ff9800');
                        if (typeof broadcastCommand === 'function') broadcastCommand({ action: 'construct', playerId: myPlayerId, command: { type: 'construct', buildingType: 'DOCK', tx, ty, buildId, spawnUnitId } });
                        setBuildMode('DOCK');
                    } else if (playerResources.wood < 40) {
                        createFloatingText('Need 40 Wood!', tx * TILE_SIZE + TILE_SIZE/2, ty * TILE_SIZE, '#f44336');
                    }
                }
            } else {
                // Unit Selection
                let clickedUnit = false;
                for (let u of units) {
                    if (u.team === myPlayerId) {
                        const dist = Math.sqrt((u.x - worldX)**2 + (u.y - worldY)**2);
                        if (dist <= u.radius * 2) {
                            if (!e.shiftKey) units.forEach(un => un.isSelected = false);
                            u.isSelected = true;
                            clickedUnit = true;
                            break;
                        }
                    }
                }
                if (!clickedUnit && !e.shiftKey) {
                    units.forEach(un => un.isSelected = false);
                }
                updateQueueUI();
            }
        }
    });

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (buildMode) {
            setBuildMode(buildMode); // Cancel
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const worldX = ((e.clientX - rect.left) / camera.zoom) + camera.x;
        const worldY = ((e.clientY - rect.top) / camera.zoom) + camera.y;
        const tx = Math.floor(worldX / TILE_SIZE);
        const ty = Math.floor(worldY / TILE_SIZE);
        
        // Command selected units
        const selectedUnits = units.filter(u => u.team === myPlayerId && u.isSelected);
        const isResource = TILE_RESOURCES[map[ty][tx]] !== undefined && TILE_RESOURCES[map[ty][tx]].length > 0;
        
        let clickedEnemy = null;
        for (let un of units) {
            if (un.team !== myPlayerId) {
                const dist = Math.sqrt((un.x - worldX)**2 + (un.y - worldY)**2);
                if (dist <= un.radius * 2) { clickedEnemy = un; break; }
            }
        }
        
        const b = activeBuildings.find(b => b.tileX === tx && b.tileY === ty && b.team === myPlayerId);
        if (b && selectedUnits.length === 0) {
            let buildCmd = null;
            const newUnitId = generateNetworkId();
            if (b.type === 'TOWNHALL' && playerResources.food >= 10) {
                buildCmd = { type: 'build_unit', buildingId: b.id, unitType: 'WORKER', newUnitId: newUnitId };
            } else if (b.type === 'BARRACKS' && playerResources.wood >= 10 && playerResources.food >= 10) {
                buildCmd = { type: 'build_unit', buildingId: b.id, unitType: 'SOLDIER', newUnitId: newUnitId };
            } else if (b.type === 'DOCK' && playerResources.wood >= 30) {
                buildCmd = { type: 'build_unit', buildingId: b.id, unitType: 'SHIP', newUnitId: newUnitId };
            }
            
            if (buildCmd) {
                executeBuildCommand(myPlayerId, buildCmd);
                if (typeof broadcastCommand === 'function') {
                    broadcastCommand({ action: 'build', command: buildCmd, playerId: myPlayerId });
                }
            }
        } else {
            selectedUnits.forEach(u => {
                let cmd;
                if (clickedEnemy) {
                    cmd = { type: 'attack', targetId: clickedEnemy.id };
                    u.issueCommand({ type: 'attack', target: clickedEnemy }, e.shiftKey);
                } else if (isResource && u.type === 'WORKER') {
                    cmd = { type: 'gather', tx: tx, ty: ty, worldX: worldX, worldY: worldY };
                    u.issueCommand(cmd, e.shiftKey);
                } else {
                    cmd = { type: 'move', x: worldX, y: worldY };
                    u.issueCommand(cmd, e.shiftKey);
                }
                if (typeof broadcastCommand === 'function') {
                    broadcastCommand({ action: 'unit_cmd', unitId: u.id, command: cmd, shiftKey: e.shiftKey });
                }
            });
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            const selectedCombatUnits = units.filter(u => u.team === myPlayerId && u.isSelected && (u.type === 'SOLDIER' || u.type === 'SHIP'));
            if (selectedCombatUnits.length > 0) {
                selectedCombatUnits.forEach(u => {
                    let cmd = { type: 'heal' };
                    u.issueCommand(cmd, e.shiftKey);
                    createFloatingText('RETURNING', u.x, u.y, '#2196F3');
                    
                    if (typeof broadcastCommand === 'function') {
                        broadcastCommand({ action: 'unit_cmd', unitId: u.id, command: cmd, shiftKey: e.shiftKey });
                    }
                });
            }
        } else if (e.code === 'KeyA' || e.key === 'a' || e.key === 'A' || e.key === 'ㅁ') {
            const selectedShips = units.filter(u => u.team === myPlayerId && u.isSelected && u.type === 'SHIP');
            selectedShips.forEach(u => {
                if (u.cannonCooldown <= 0) {
                    u.cannonCooldown = 1000;
                    projectiles.push(new Projectile(u.x, u.y, -1, 0, u.dps, u.team));
                    if (typeof broadcastCommand === 'function') {
                        broadcastCommand({ action: 'fire_cannon', unitId: u.id, dirX: -1, dirY: 0, dps: u.dps, team: u.team });
                    }
                } else {
                    createFloatingText('Reloading...', u.x, u.y - 15, '#ff9800');
                }
            });
        } else if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D' || e.key === 'ㅇ') {
            const selectedShips = units.filter(u => u.team === myPlayerId && u.isSelected && u.type === 'SHIP');
            selectedShips.forEach(u => {
                if (u.cannonCooldown <= 0) {
                    u.cannonCooldown = 1000;
                    projectiles.push(new Projectile(u.x, u.y, 1, 0, u.dps, u.team));
                    if (typeof broadcastCommand === 'function') {
                        broadcastCommand({ action: 'fire_cannon', unitId: u.id, dirX: 1, dirY: 0, dps: u.dps, team: u.team });
                    }
                } else {
                    createFloatingText('Reloading...', u.x, u.y - 15, '#ff9800');
                }
            });
        }
    });
}
