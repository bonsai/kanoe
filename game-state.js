// ============================================
// Game State Management
// ============================================

// 橋の高さ・幅データ（idで紐付け）
const bridgeDimensions = {
    1: { height: 8.0, width: 35.0 },
    2: { height: 6.5, width: 28.0 },
    3: { height: 5.0, width: 40.0 },
    4: { height: 7.0, width: 30.0 },
    5: { height: 5.5, width: 25.0 },
    6: { height: 6.0, width: 20.0 },
    7: { height: 8.5, width: 32.0 },
    8: { height: 9.0, width: 15.0 },
    9: { height: 12.0, width: 40.0 },
    10: { height: 4.0, width: 18.0 }
};

// ゲーム状態
let gameState = {
    score: 0,
    speed: 1.0,
    position: 0,
    isDucking: false,
    isGameOver: false,
    currentBridgeIndex: 0,
    canoeHeight: 2.0,
    normalHeight: 2.0,
    duckingHeight: 0.8,
    bridgeSpacing: 50
};

// 次に生成する橋のインデックス
let nextSpawnIndex = 3;

// 橋データ（初期は空、fetchで取得）
let bridgeData = [];

// DOM要素
const canvas = document.getElementById('gameCanvas');
const scoreElement = document.getElementById('score');
const speedElement = document.getElementById('speed');
const altitudeElement = document.getElementById('altitude');
const bridgeInfoElement = document.getElementById('bridgeInfo');
const nextBridgeElement = document.getElementById('nextBridge');
const warningElement = document.getElementById('warning');
const duckingIndicator = document.getElementById('duckingIndicator');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const paddleBtn = document.getElementById('paddleBtn');
const duckBtn = document.getElementById('duckBtn');
const seaAnimation = document.getElementById('seaAnimation');

// 海アニメーション用タイムアウト
let seaTimeout = null;
