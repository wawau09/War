// ==========================================
// 4. UNIT & COMBAT & COMMAND SYSTEM
// ==========================================
class Unit {
    constructor(x, y, team, id = null) {
        this.id = id || generateNetworkId();
        this.x = x; this.y = y; this.team = team; // 1=Player, 2=Enemy
        this.type = 'WORKER'; this.isSelected = false;
        this.carriedResource = null;
        this.speed = 45; this.radius = 9;
        this.commands = []; this.currentCommand = null; this.timer = 0;
        
        // Combat
        this.maxHp = 100; this.hp = 100;
        this.attackRange = 60; this.dps = 25;
        this.isAttacking = false; this.attackTarget = null;
        // Make 'My' units always Blue, and 'Enemy' units always Red locally
        this.color = team === myPlayerId ? '#2196F3' : '#f44336';
    }
    
    issueCommand(cmd, queue = false) {
        if (!queue) { this.commands = []; this.currentCommand = null; }
        this.commands.push(cmd);
        if(this.team === myPlayerId) updateQueueUI();
    }

    update(deltaTime) {
        // Auto-Attack logic
        if (!this.isAttacking) {
            for (let e of units) {
                if (e.team !== this.team) {
                    const dist = Math.sqrt((e.x - this.x)**2 + (e.y - this.y)**2);
                    if (dist <= this.attackRange) {
                        this.isAttacking = true; this.attackTarget = e; break;
                    }
                }
            }
        }
        
        if (this.isAttacking && this.attackTarget) {
            const dist = Math.sqrt((this.attackTarget.x - this.x)**2 + (this.attackTarget.y - this.y)**2);
            if (dist > this.attackRange || this.attackTarget.hp <= 0) {
                this.isAttacking = false; this.attackTarget = null;
            } else {
                this.attackTimer = (this.attackTimer || 0) + deltaTime;
                if (this.attackTimer >= 1000) {
                    this.attackTarget.hp -= this.dps;
                    if (this.team === 1) logCombat(`${this.type} attacked enemy for ${this.dps} dmg!`);
                    if (this.attackTarget.hp <= 0) {
                        this.isAttacking = false; this.attackTarget = null;
                        const idx = units.indexOf(this.attackTarget);
                        if (idx > -1) units.splice(idx, 1);
                    }
                    this.attackTimer = 0;
                }
            }
        }

        // Command processing
        if (!this.currentCommand && this.commands.length > 0) {
            this.currentCommand = this.commands.shift(); this.timer = 0;
            if(this.team === myPlayerId) updateQueueUI();
        }

        if (this.currentCommand) {
            if (this.processCommand(this.currentCommand, deltaTime)) {
                this.currentCommand = null;
                if(this.team === 1) updateQueueUI();
            }
        }
    }

    checkCollision(nextX, nextY) {
        let finalX = nextX; let finalY = nextY;
        
        let tx = Math.floor(nextX / TILE_SIZE);
        let ty = Math.floor(this.y / TILE_SIZE);
        if (this.type === 'SHIP') {
            if (!map[ty] || map[ty][tx] === undefined || map[ty][tx] !== TERRAIN.SEA) finalX = this.x;
        } else {
            if (!map[ty] || map[ty][tx] === undefined || map[ty][tx] === TERRAIN.SEA) finalX = this.x;
        }
        
        tx = Math.floor(this.x / TILE_SIZE);
        ty = Math.floor(nextY / TILE_SIZE);
        if (this.type === 'SHIP') {
            if (!map[ty] || map[ty][tx] === undefined || map[ty][tx] !== TERRAIN.SEA) finalY = this.y;
        } else {
            if (!map[ty] || map[ty][tx] === undefined || map[ty][tx] === TERRAIN.SEA) finalY = this.y;
        }
        
        return { x: finalX, y: finalY };
    }

    moveStraight(targetX, targetY, deltaTime) {
        let dx = targetX - this.x; let dy = targetY - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return { arrived: true, stuck: false };
        
        let moveAmt = this.speed * (deltaTime / 1000);
        if (moveAmt >= dist) {
            this.x = targetX; this.y = targetY;
            return { arrived: true, stuck: false };
        }
        
        let nextPos = this.checkCollision(this.x + (dx/dist)*moveAmt, this.y + (dy/dist)*moveAmt);
        if (nextPos.x === this.x && nextPos.y === this.y) {
            return { arrived: false, stuck: true };
        }
        this.x = nextPos.x; this.y = nextPos.y;
        return { arrived: false, stuck: false };
    }

    followPath(targetX, targetY, path, deltaTime) {
        if (!path || path.length === 0) {
            return this.moveStraight(targetX, targetY, deltaTime);
        }
        
        let nextTile = path[0];
        let ntx = nextTile.tx * TILE_SIZE + TILE_SIZE/2;
        let nty = nextTile.ty * TILE_SIZE + TILE_SIZE/2;
        
        let dist = Math.sqrt((ntx - this.x)**2 + (nty - this.y)**2);
        if (dist <= 2) {
            path.shift();
            return this.followPath(targetX, targetY, path, deltaTime);
        }
        
        return this.moveStraight(ntx, nty, deltaTime);
    }

    processCommand(cmd, deltaTime) {
        if (cmd.type === 'move') {
            if (!cmd.pathCalculated) {
                cmd.pathCalculated = true;
                cmd.path = findPath(Math.floor(this.x/TILE_SIZE), Math.floor(this.y/TILE_SIZE), Math.floor(cmd.x/TILE_SIZE), Math.floor(cmd.y/TILE_SIZE), this.type);
                if (cmd.path && cmd.path.length > 0) cmd.path.shift();
            }
            let res = this.followPath(cmd.x, cmd.y, cmd.path, deltaTime);
            if (res.arrived || res.stuck) return true;
            return false;
        } else if (cmd.type === 'attack') {
            if (!cmd.target || cmd.target.hp <= 0) return true;
            const dist = Math.sqrt((cmd.target.x - this.x)**2 + (cmd.target.y - this.y)**2);
            if (dist <= this.attackRange) {
                return false; // Stay in range, auto-attack handles damage
            } else {
                if (!cmd.pathCalculated || (cmd.pathTimer !== undefined && cmd.pathTimer > 1000)) {
                    cmd.pathCalculated = true; cmd.pathTimer = 0;
                    cmd.path = findPath(Math.floor(this.x/TILE_SIZE), Math.floor(this.y/TILE_SIZE), Math.floor(cmd.target.x/TILE_SIZE), Math.floor(cmd.target.y/TILE_SIZE), this.type);
                    if (cmd.path && cmd.path.length > 0) cmd.path.shift();
                }
                cmd.pathTimer += deltaTime;
                let res = this.followPath(cmd.target.x, cmd.target.y, cmd.path, deltaTime);
                if (res.stuck) return true; // Stuck
                return false;
            }
        } else if (cmd.type === 'gather') {
            if (this.type !== 'WORKER') return true; // Only workers can gather
            if (this.carriedResource) {
                // Find nearest base
                let nearestBase = null; let minDist = Infinity;
                for (let b of activeBuildings) {
                    if (b.type === 'TOWNHALL') {
                        const bx = b.tileX * TILE_SIZE + TILE_SIZE/2;
                        const by = b.tileY * TILE_SIZE + TILE_SIZE/2;
                        const dist = Math.sqrt((bx - this.x)**2 + (by - this.y)**2);
                        if (dist < minDist) { minDist = dist; nearestBase = {x: bx, y: by}; }
                    }
                }
                if (!nearestBase) return true; // No base, cancel
                
                // Move to base
                if (minDist > TILE_SIZE) {
                    if (!cmd.returnPathCalculated) {
                        cmd.returnPathCalculated = true;
                        cmd.returnPath = findPath(Math.floor(this.x/TILE_SIZE), Math.floor(this.y/TILE_SIZE), Math.floor(nearestBase.x/TILE_SIZE), Math.floor(nearestBase.y/TILE_SIZE), this.type);
                        if (cmd.returnPath && cmd.returnPath.length > 0) cmd.returnPath.shift();
                    }
                    let res = this.followPath(nearestBase.x, nearestBase.y, cmd.returnPath, deltaTime);
                    if (res.stuck && minDist > 35) return true; // Stuck far away
                } else {
                    // Deposit
                    playerResources[this.carriedResource.type] += this.carriedResource.amount;
                    updateResUI();
                    createFloatingText(`+${this.carriedResource.amount} ${this.carriedResource.type}`, this.x, this.y - 15, '#FFEB3B');
                    this.carriedResource = null;
                    cmd.returnPathCalculated = false; // Reset for next trip
                }
                return false; // Loop gather
            } else {
                // Not carrying, move exactly to target coords
                const targetX = cmd.worldX || (cmd.tx * TILE_SIZE + TILE_SIZE/2);
                const targetY = cmd.worldY || (cmd.ty * TILE_SIZE + TILE_SIZE/2);
                const dist = Math.sqrt((targetX - this.x)**2 + (targetY - this.y)**2);
                
                if (dist > 2) {
                    if (!cmd.gatherPathCalculated) {
                        cmd.gatherPathCalculated = true;
                        cmd.gatherPath = findPath(Math.floor(this.x/TILE_SIZE), Math.floor(this.y/TILE_SIZE), Math.floor(targetX/TILE_SIZE), Math.floor(targetY/TILE_SIZE), this.type);
                        if (cmd.gatherPath && cmd.gatherPath.length > 0) cmd.gatherPath.shift();
                    }
                    let res = this.followPath(targetX, targetY, cmd.gatherPath, deltaTime);
                    if (res.stuck && dist > 35) return true; // Completely stuck
                    if (!res.arrived) return false; // keep moving
                }
                
                // Gather
                cmd.gatherPathCalculated = false; // Reset for next iteration
                if (map[cmd.ty] && map[cmd.ty][cmd.tx] !== undefined) {
                    const available = TILE_RESOURCES[map[cmd.ty][cmd.tx]];
                    if (!available || available.length === 0) return true; // Empty node
                    
                    this.timer += deltaTime;
                    if (this.timer >= 5000) {
                        const res = available[Math.floor(Math.random() * available.length)];
                        const yieldAmt = Math.floor(Math.random() * 4) + 2;
                        this.carriedResource = { type: res, amount: yieldAmt };
                        this.timer = 0;
                    }
                }
                return false; // Always loop
            }
        } else if (cmd.type === 'heal') {
            if (this.type !== 'SOLDIER' && this.type !== 'SHIP') return true;
            
            // Find nearest base
            let nearestBase = null; let minDist = Infinity;
            for (let b of activeBuildings) {
                let validBase = false;
                if (this.type === 'SHIP' && b.type === 'DOCK') validBase = true;
                if (this.type === 'SOLDIER' && (b.type === 'BARRACKS' || b.type === 'TOWNHALL')) validBase = true;
                
                if (validBase) {
                    const bx = b.tileX * TILE_SIZE + TILE_SIZE/2;
                    const by = b.tileY * TILE_SIZE + TILE_SIZE/2;
                    const dist = Math.sqrt((bx - this.x)**2 + (by - this.y)**2);
                    if (dist < minDist) { minDist = dist; nearestBase = {x: bx, y: by}; }
                }
            }
            if (!nearestBase) return true; // No base to return to
            
            if (minDist > TILE_SIZE + 10) {
                if (!cmd.healPathCalculated) {
                    cmd.healPathCalculated = true;
                    cmd.healPath = findPath(Math.floor(this.x/TILE_SIZE), Math.floor(this.y/TILE_SIZE), Math.floor(nearestBase.x/TILE_SIZE), Math.floor(nearestBase.y/TILE_SIZE), this.type);
                    if (cmd.healPath && cmd.healPath.length > 0) cmd.healPath.shift();
                }
                let res = this.followPath(nearestBase.x, nearestBase.y, cmd.healPath, deltaTime);
                if (res.stuck && minDist > 40) return true; // Stuck
                return false; // keep moving
            } else {
                cmd.healPathCalculated = false;
                if (this.hp >= this.maxHp) return true; // Arrived and fully healed!
                
                // Heal over time (Slowed down: +5 HP every 2 seconds)
                this.timer += deltaTime;
                if (this.timer >= 2000) { 
                    this.hp = Math.min(this.maxHp, this.hp + 5);
                    createFloatingText('+5 HP', this.x, this.y - 15, '#4CAF50');
                    this.timer = 0;
                }
                return this.hp >= this.maxHp;
            }
        }
        return true;
    }

    draw(ctx) {
        // Combat Laser
        if (this.isAttacking && this.attackTarget) {
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.attackTarget.x, this.attackTarget.y);
            ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
        }

        // Gather Animation
        if (this.currentCommand && this.currentCommand.type === 'gather') {
            const pulse = Math.abs(Math.sin(this.timer / 100)) * 6;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + pulse, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255, 235, 59, 0.3)'; ctx.fill(); ctx.stroke();
        }

        if (this.isSelected && this.team === 1) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
            ctx.strokeStyle = '#00FF00'; ctx.lineWidth = 2; ctx.stroke();
        }
        
        ctx.beginPath();
        if (this.type === 'SHIP') {
            ctx.ellipse(this.x, this.y, this.radius * 1.5, this.radius, 0, 0, Math.PI * 2);
            ctx.fillStyle = this.team === 1 ? '#8D6E63' : '#f44336'; ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(this.x - 2, this.y - 8, 4, 10); // sail
        } else if (this.type === 'SOLDIER') {
            // Draw a sturdy square body for the soldier
            ctx.fillStyle = this.color; 
            ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
            ctx.strokeStyle = '#333'; ctx.lineWidth = 2; 
            ctx.strokeRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
            
            // Draw a sword/spear
            ctx.strokeStyle = '#E0E0E0'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(this.x + 2, this.y - 2); ctx.lineTo(this.x + 12, this.y - 12); ctx.stroke();
        } else {
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color; ctx.fill();
            // Worker tool indicator
            ctx.fillStyle = '#FFC107'; ctx.fillRect(this.x + 2, this.y - 8, 6, 4);
        }
        ctx.lineWidth = 1; ctx.strokeStyle = '#fff'; ctx.stroke();

        // HP Bar
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        const bx = this.x - 10; const by = this.y - this.radius - 6;
        ctx.fillStyle = 'rgba(255,0,0,0.7)'; ctx.fillRect(bx, by, 20, 3);
        ctx.fillStyle = 'rgba(76,175,80,0.9)'; ctx.fillRect(bx, by, 20 * hpPercent, 3);
        
        // Resource Carry Indicator
        if (this.carriedResource) {
            ctx.fillStyle = '#fff';
            if (this.carriedResource.type === 'wood') ctx.fillStyle = '#8B4513';
            else if (this.carriedResource.type === 'iron') ctx.fillStyle = '#A9A9A9';
            else if (this.carriedResource.type === 'coal') ctx.fillStyle = '#333333';
            else if (this.carriedResource.type === 'food') ctx.fillStyle = '#FF6347';
            ctx.fillRect(this.x - 4, this.y - 14, 8, 8);
            ctx.strokeStyle = '#fff'; ctx.strokeRect(this.x - 4, this.y - 14, 8, 8);
        }
    }
}

const units = [];

function updateQueueUI() {
    const list = document.getElementById('queueList');
    if (!list) return;
    list.innerHTML = '';
    
    // Find player unit
    const playerUnit = units.find(u => u.team === 1);
    if (!playerUnit) {
        list.innerHTML = '<li class="queue-item" style="color: #f44336; text-align:center;">Unit Dead</li>'; return;
    }

    if (!playerUnit.currentCommand && playerUnit.commands.length === 0) {
        list.innerHTML = '<li class="queue-item" style="color: #888; text-align:center;">Idle</li>'; return;
    }
    if (playerUnit.currentCommand) list.innerHTML += `<li class="queue-item active"><strong>Doing:</strong> ${playerUnit.currentCommand.type.toUpperCase()}</li>`;
    playerUnit.commands.forEach((cmd, i) => { list.innerHTML += `<li class="queue-item">[${i+1}] ${cmd.type.toUpperCase()}</li>`; });
}
