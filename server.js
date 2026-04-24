const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
// CORS 설정: 클라이언트 HTML 파일이 로컬에서 열리더라도 통신이 가능하게 함
const io = new Server(server, {
    cors: { origin: "*" }
});

// 1. Authoritative Game State (서버가 게임의 유일한 진실을 가짐)
const gameState = {
    players: {} // socket.id 를 키로 사용하는 플레이어 객체
};

// 20 Ticks per second (50ms 마다 게임 상태 업데이트)
const TICK_RATE = 1000 / 20; 

io.on('connection', (socket) => {
    console.log(`[+] Player connected: ${socket.id}`);

    // 새로운 플레이어 생성 및 초기화
    gameState.players[socket.id] = {
        id: socket.id,
        x: 400, // 시작 X 좌표
        y: 300, // 시작 Y 좌표
        targetX: 400,
        targetY: 300,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`, // 랜덤 색상
        commandQueue: [] // 클라이언트로부터 받은 명령 대기열
    };

    // 접속한 클라이언트에게 현재 전체 게임 상태 전송
    socket.emit('init', { id: socket.id, state: gameState });

    // 기존 유저들에게 새 유저 접속 알림
    socket.broadcast.emit('playerJoined', gameState.players[socket.id]);

    // 2. Command 처리 (클라이언트의 상태를 믿지 않고, 의도(Command)만 받음)
    socket.on('command', (cmd) => {
        const player = gameState.players[socket.id];
        if (player) {
            // 명령 유효성 검사(Validation) 후 큐에 삽입
            if (cmd.type === 'move' && typeof cmd.x === 'number' && typeof cmd.y === 'number') {
                player.commandQueue.push(cmd);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`[-] Player disconnected: ${socket.id}`);
        delete gameState.players[socket.id];
        io.emit('playerLeft', socket.id); // 다른 유저들에게 접속 종료 알림
    });
});

// 3. Server Game Loop (모든 물리 연산은 서버에서 진행)
setInterval(() => {
    // 3-1. 큐에 쌓인 명령들을 꺼내어 상태 반영 (Process Commands)
    for (const id in gameState.players) {
        const player = gameState.players[id];
        
        while (player.commandQueue.length > 0) {
            const cmd = player.commandQueue.shift();
            
            if (cmd.type === 'move') {
                player.targetX = cmd.x;
                player.targetY = cmd.y;
            }
        }

        // 3-2. 로직 및 물리 시뮬레이션 (Simulate Physics)
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) { // 도착하지 않았다면 이동
            player.x += (dx / dist) * 5; // 틱당 속도 상수
            player.y += (dy / dist) * 5;
        } else {
            player.x = player.targetX;
            player.y = player.targetY;
        }
    }

    // 3-3. 갱신된 게임 상태를 모든 클라이언트에게 브로드캐스트 (Broadcast State)
    // 최적화를 위해 전체 상태 대신 변경점(Delta)만 보낼 수도 있음
    io.emit('tick', gameState);

}, TICK_RATE);

server.listen(3000, () => {
    console.log('RTS Game Server is running on ws://localhost:3000');
});
