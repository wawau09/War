// ==========================================
// 1. GLOBAL STATE & RESOURCES
// ==========================================
let gameSeed = 12345;

function seededRandom() {
    let t = gameSeed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

function generateNetworkId() {
    // Generate a unique ID using player ID and timestamp + random
    return myPlayerId + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
}

const playerResources = { wood: 20, iron: 0, coal: 0, food: 0 };
let buildMode = null; // null, 'HUT', 'BARRACKS', 'DOCK'
let mouseTileX = -1; let mouseTileY = -1;
let currentDay = 1;
let dayTimer = 0;
const DAY_DURATION = 60000; // 60 seconds per day

const WIDTH = 120; const HEIGHT = 120; const TILE_SIZE = 22; 
const MAP_PIXEL_WIDTH = WIDTH * TILE_SIZE;
const MAP_PIXEL_HEIGHT = HEIGHT * TILE_SIZE;

const camera = { 
    x: (MAP_PIXEL_WIDTH/2) - (window.innerWidth/2), 
    y: (MAP_PIXEL_HEIGHT/2) - (window.innerHeight/2), 
    width: window.innerWidth, 
    height: window.innerHeight,
    zoom: 1.8,
    initialized: false 
};
let panDX = 0; let panDY = 0;
const TERRAIN = { SEA: 0, PLAINS: 1, MOUNTAINS: 2 };
const TERRAIN_COLORS = { 0: '#1a3b5c', 1: '#2e4c30', 2: '#4a4a4a' };
const TILE_RESOURCES = { [TERRAIN.SEA]: ['food'], [TERRAIN.PLAINS]: ['wood'], [TERRAIN.MOUNTAINS]: ['iron', 'coal'] };

const canvas = document.getElementById('mapCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

if (canvas) {
    canvas.width = camera.width; 
    canvas.height = camera.height;
    
    window.addEventListener('resize', () => {
        camera.width = window.innerWidth;
        camera.height = window.innerHeight;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// UI Helpers
const floatingTexts = [];
const projectiles = [];
function createFloatingText(text, x, y, color = '#ffffff') {
    floatingTexts.push({ text, x, y, life: 1.0, color });
}

function updateResUI() {
    const resWood = document.getElementById('resWood');
    if(resWood) resWood.innerText = playerResources.wood;
    
    const resIron = document.getElementById('resIron');
    if(resIron) resIron.innerText = playerResources.iron;
    
    const resCoal = document.getElementById('resCoal');
    if(resCoal) resCoal.innerText = playerResources.coal;
    
    const resFood = document.getElementById('resFood');
    if(resFood) resFood.innerText = playerResources.food;
}

function logCombat(msg) {
    const logDiv = document.getElementById('combatLog');
    if(logDiv) {
        logDiv.innerHTML += `<div>> ${msg}</div>`;
        logDiv.scrollTop = logDiv.scrollHeight;
    }
}
