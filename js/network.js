// ==========================================
// P2P NETWORK LOGIC (PeerJS)
// ==========================================

let peer = null;
let conn = null; // Current active connection
let isHost = false;
let myPlayerId = 1; // 1 for Host, 2 for Client

function initNetwork() {
    const btnHost = document.getElementById('btnHost');
    const btnJoin = document.getElementById('btnJoin');
    const joinIdInput = document.getElementById('joinIdInput');
    const lobbyStatus = document.getElementById('lobbyStatus');
    const lobbyUI = document.getElementById('lobbyUI');

    btnHost.onclick = () => {
        lobbyStatus.innerText = "Creating Room...";
        peer = new Peer(); // Auto-generate ID
        
        peer.on('open', (id) => {
            isHost = true;
            myPlayerId = 1;
            lobbyStatus.innerHTML = `Room Created!<br>Share this Host ID with your friend:<br><span style="color:#fff; font-size:24px; user-select:all;">${id}</span><br>Waiting for someone to join...`;
        });

        peer.on('connection', (connection) => {
            if (conn) {
                connection.send({ type: 'error', msg: 'Room is full' });
                connection.close();
                return;
            }
            conn = connection;
            setupConnection(conn, lobbyUI);
            
            // Host generates the game seed and sends it to the client to start the game
            const gameSeed = Math.floor(Math.random() * 1000000);
            conn.on('open', () => {
                conn.send({ type: 'start_game', seed: gameSeed });
                startGame(gameSeed);
                lobbyUI.style.display = 'none';
            });
        });
        
        peer.on('error', (err) => {
            lobbyStatus.innerText = "Error: " + err;
        });
    };

    btnJoin.onclick = () => {
        const hostId = joinIdInput.value.trim();
        if (!hostId) {
            lobbyStatus.innerText = "Please enter a valid Host ID";
            return;
        }
        
        lobbyStatus.innerText = "Connecting...";
        peer = new Peer();
        
        peer.on('open', () => {
            isHost = false;
            myPlayerId = 2;
            conn = peer.connect(hostId);
            setupConnection(conn, lobbyUI);
        });
        
        peer.on('error', (err) => {
            lobbyStatus.innerText = "Error: " + err;
        });
    };
}

function setupConnection(connection, lobbyUI) {
    connection.on('data', (data) => {
        if (data.type === 'start_game') {
            startGame(data.seed);
            lobbyUI.style.display = 'none';
        } else if (data.type === 'command') {
            // Receive command from other player
            receiveCommand(data.command);
        }
    });

    connection.on('close', () => {
        alert("The other player disconnected. Game Over.");
        location.reload();
    });
}

function receiveCommand(data) {
    if (data.action === 'unit_cmd') {
        const u = units.find(unit => unit.id === data.unitId);
        if (u) {
            let cmdToExecute = data.command;
            // If it's an attack command, we need to reconstruct the target reference
            if (cmdToExecute.type === 'attack' && cmdToExecute.targetId) {
                const target = units.find(un => un.id === cmdToExecute.targetId);
                if (target) {
                    cmdToExecute.target = target;
                } else {
                    return; // Target not found, ignore command
                }
            }
            u.issueCommand(cmdToExecute, data.shiftKey);
        }
    } else if (data.action === 'build') {
        // Player produced a unit from a building
        executeBuildCommand(data.playerId, data.command);
    } else if (data.action === 'construct') {
        // Player placed a new building
        const cmd = data.command;
        const b = new Building(cmd.tx, cmd.ty, cmd.buildingType, cmd.buildId);
        b.team = data.playerId;
        activeBuildings.push(b);
        
        if (cmd.buildingType === 'HUT' && cmd.spawnUnitId) {
             const worker = new Unit((cmd.tx * TILE_SIZE) + TILE_SIZE/2, (cmd.ty * TILE_SIZE) + TILE_SIZE/2, data.playerId, cmd.spawnUnitId);
             units.push(worker);
        } else if (cmd.buildingType === 'BARRACKS' && cmd.spawnUnitId) {
             const soldier = new Unit((cmd.tx * TILE_SIZE) + TILE_SIZE/2, (cmd.ty * TILE_SIZE) + TILE_SIZE/2, data.playerId, cmd.spawnUnitId);
             soldier.type = 'SOLDIER'; soldier.hp = 200; soldier.maxHp = 200; soldier.dps = 40; soldier.speed = 50;
             units.push(soldier);
        } else if (cmd.buildingType === 'DOCK' && cmd.spawnUnitId) {
             const ship = new Unit((cmd.tx * TILE_SIZE) + TILE_SIZE/2, (cmd.ty * TILE_SIZE) + TILE_SIZE/2, data.playerId, cmd.spawnUnitId);
             ship.type = 'SHIP'; ship.hp = 300; ship.maxHp = 300; ship.dps = 50; ship.speed = 120; ship.radius = 12;
             units.push(ship);
        }
    }
}

function broadcastCommand(cmd) {
    // Send command to the other player
    if (conn && conn.open) {
        conn.send({ type: 'command', command: cmd });
    }
}

// Ensure initNetwork is called when window loads
window.addEventListener('load', () => {
    initNetwork();
});
