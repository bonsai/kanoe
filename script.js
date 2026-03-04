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

// Three.js設定
let scene, camera, renderer;
let canoe, canoePerson;
let bridges = [];
let river;
let ambientLight, directionalLight;

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

// 橋データ（初期は空、fetchで取得）
let bridgeData = [];

// 波アニメーション管理用
let wavesAnimationId = null;

// JSONを読み込んでからゲーム初期化
async function loadBridgeDataAndStart() {
    try {
        const res = await fetch('bridges.json');
        let data = await res.json();
        // 高さ・幅を付与
        data = data.map(b => ({
            ...b,
            height: bridgeDimensions[b.id]?.height || 6.0,
            width: bridgeDimensions[b.id]?.width || 25.0
        }));
        // 順番を反転
        bridgeData = data.slice().reverse();
        // 初期化
        initThreeJS();
        updateBridgeInfo();
        animate();
    } catch (e) {
        nextBridgeElement.innerHTML = '橋データの読み込みに失敗しました';
        console.error(e);
    }
}

// Three.js初期化
function initThreeJS() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 10);
    
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ライティング
    ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    // 川を作成
    createRiver();
    
    // カヌーを作成
    createCanoe();
    
    // 初期橋を作成
    createInitialBridges();
}

// 川を作成
function createRiver() {
    const riverGeometry = new THREE.PlaneGeometry(80, 1000);
    const riverMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x4682B4,
        transparent: true,
        opacity: 0.8
    });
    river = new THREE.Mesh(riverGeometry, riverMaterial);
    river.rotation.x = -Math.PI / 2;
    river.position.y = 0;
    scene.add(river);

    // 水の波紋エフェクト
    const waveGeometry = new THREE.PlaneGeometry(80, 1000, 50, 50);
    const waveMaterial = new THREE.MeshLambertMaterial({
        color: 0x5F9EA0,
        transparent: true,
        opacity: 0.3,
        wireframe: false
    });
    window.wavesMesh = new THREE.Mesh(waveGeometry, waveMaterial);
    waves.rotation.x = -Math.PI / 2;
    waves.position.y = 0.1;
    scene.add(window.wavesMesh);

    // 波のアニメーション
    function animateWaves() {
        const positions = window.wavesMesh.geometry.attributes.position;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            const y = Math.sin((x + time) * 0.5) * 0.1 + Math.cos((z + time) * 0.3) * 0.05;
            positions.setY(i, y);
        }
        positions.needsUpdate = true;
        wavesAnimationId = requestAnimationFrame(animateWaves);
    }
    animateWaves();
}

// カヌーを作成
function createCanoe() {
    const canoeGroup = new THREE.Group();
    
    // カヌー本体
    const canoeGeometry = new THREE.CylinderGeometry(0.8, 0.5, 4, 8);
    const canoeMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    canoe = new THREE.Mesh(canoeGeometry, canoeMaterial);
    canoe.rotation.x = Math.PI / 2;
    canoe.position.y = 0.3;
    canoe.castShadow = true;
    canoeGroup.add(canoe);

    // 人物
    const personGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.5, 8);
    const personMaterial = new THREE.MeshLambertMaterial({ color: 0xFF6B6B });
    canoePerson = new THREE.Mesh(personGeometry, personMaterial);
    canoePerson.position.set(0, 1.2, 0);
    canoePerson.castShadow = true;
    canoeGroup.add(canoePerson);

    // 頭
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBB5 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 2.0, 0);
    head.castShadow = true;
    canoeGroup.add(head);

    // パドル
    const paddleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 6);
    const paddleMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const paddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
    paddle.position.set(1, 1.0, 0);
    paddle.rotation.z = Math.PI / 4;
    canoeGroup.add(paddle);

    canoeGroup.position.set(0, gameState.canoeHeight, 0);
    scene.add(canoeGroup);
    
    // グローバル参照用
    window.canoeGroup = canoeGroup;
}

// 橋を作成
function createBridge(bridgeInfo, zPosition) {
    const bridgeGroup = new THREE.Group();
    
    // 橋の種類に応じて異なる形状を作成
    let bridgeColor = 0x696969;
    let bridgeHeight = bridgeInfo.height;
    let bridgeWidth = bridgeInfo.width;
    
    // 橋の種類による色分け
    if (bridgeInfo.type.includes('鉄道')) {
        bridgeColor = 0x4A4A4A;
    } else if (bridgeInfo.type.includes('吊橋')) {
        bridgeColor = 0x8B0000;
    } else if (bridgeInfo.type.includes('トラス')) {
        bridgeColor = 0x2F4F4F;
    }

    // メインの橋桁
    const bridgeDeckGeometry = new THREE.BoxGeometry(bridgeWidth, 1.5, 3);
    const bridgeDeckMaterial = new THREE.MeshLambertMaterial({ color: bridgeColor });
    const bridgeDeck = new THREE.Mesh(bridgeDeckGeometry, bridgeDeckMaterial);
    bridgeDeck.position.set(0, bridgeHeight, 0);
    bridgeDeck.castShadow = true;
    bridgeDeck.receiveShadow = true;
    bridgeGroup.add(bridgeDeck);

    // 橋脚
    const pillarGeometry = new THREE.CylinderGeometry(1, 1.5, bridgeHeight, 8);
    const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
    
    // 左橋脚
    const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    leftPillar.position.set(-bridgeWidth/3, bridgeHeight/2, 0);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;
    bridgeGroup.add(leftPillar);
    
    // 右橋脚
    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    rightPillar.position.set(bridgeWidth/3, bridgeHeight/2, 0);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;
    bridgeGroup.add(rightPillar);

    // トラス構造（トラス橋の場合）
    if (bridgeInfo.type.includes('トラス')) {
        for (let i = 0; i < 5; i++) {
            const trussGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 6);
            const trussMaterial = new THREE.MeshLambertMaterial({ color: bridgeColor });
            const truss = new THREE.Mesh(trussGeometry, trussMaterial);
            truss.position.set(-bridgeWidth/2 + (bridgeWidth/4) * i, bridgeHeight + 1, 0);
            truss.rotation.z = (i % 2 === 0) ? Math.PI/6 : -Math.PI/6;
            bridgeGroup.add(truss);
        }
    }

    // 吊橋のケーブル（吊橋の場合）
    if (bridgeInfo.type.includes('吊橋')) {
        const cableGeometry = new THREE.CylinderGeometry(0.05, 0.05, bridgeWidth, 8);
        const cableMaterial = new THREE.MeshLambertMaterial({ color: 0x2F2F2F });
        const cable = new THREE.Mesh(cableGeometry, cableMaterial);
        cable.position.set(0, bridgeHeight + 3, 0);
        cable.rotation.z = Math.PI / 2;
        bridgeGroup.add(cable);
    }

    bridgeGroup.position.set(0, 0, zPosition);
    scene.add(bridgeGroup);

    return {
        group: bridgeGroup,
        info: bridgeInfo,
        passed: false,
        boundingBox: new THREE.Box3().setFromObject(bridgeGroup)
    };
}

// 初期橋を作成
function createInitialBridges() {
    for (let i = 0; i < Math.min(3, bridgeData.length); i++) {
        const bridge = createBridge(
            bridgeData[i], 
            -gameState.bridgeSpacing * (i + 1)
        );
        bridges.push(bridge);
    }
}

// 3D衝突検出 → 幅内でしゃがみ判定
function checkBridgeDuck() {
    if (!window.canoeGroup) return false;
    const canoeZ = window.canoeGroup.position.z;
    for (let i = 0; i < bridges.length; i++) {
        const bridge = bridges[i];
        const bridgeZ = bridge.group.position.z;
        const bridgeWidth = 3; // 橋の奥行き幅（BoxGeometryのzサイズ）
        // 橋の幅の間に入ったか
        if (!bridge.passed && Math.abs(canoeZ - bridgeZ) < bridgeWidth/2) {
            if (!gameState.isDucking) {
                return true; // しゃがんでいない→ゲームオーバー
            } else {
                // 通過成功
                bridge.passed = true;
                gameState.score += 100;
                gameState.currentBridgeIndex++;
                updateBridgeInfo();
                // 次の橋を生成（重複防止）
                if (nextSpawnIndex < bridgeData.length) {
                    const farthestBridge = bridges.reduce((min, b) => b.group.position.z < min.group.position.z ? b : min);
                    const newBridge = createBridge(
                        bridgeData[nextSpawnIndex],
                        farthestBridge.group.position.z - gameState.bridgeSpacing
                    );
                    bridges.push(newBridge);
                    nextSpawnIndex++;
                }
            }
        }
    }
    return false;
}

// 警告表示チェック
function checkWarning() {
    if (!window.canoeGroup) return;

    const canoePosition = window.canoeGroup.position;
    let showWarning = false;
    
    for (let bridge of bridges) {
        const distance = Math.abs(bridge.group.position.z - canoePosition.z);
        if (distance < 20 && bridge.group.position.z < canoePosition.z) {
            showWarning = true;
            break;
        }
    }
    
    warningElement.style.display = showWarning ? 'block' : 'none';
}

// UI更新
function updateUI() {
    scoreElement.textContent = gameState.score;
    speedElement.textContent = gameState.speed.toFixed(1);
    altitudeElement.textContent = gameState.canoeHeight.toFixed(1);
}

// 橋情報更新
let seaTimeout = null;
function updateBridgeInfo() {
    if (gameState.currentBridgeIndex < bridgeData.length) {
        const bridge = bridgeData[gameState.currentBridgeIndex];
        nextBridgeElement.innerHTML = `
            <strong>${bridge.name}</strong><br>
            距離: ${bridge.distance_from_mouth}km<br>
            種類: ${bridge.type}<br>
            開通: ${bridge.year_opened}<br>
            場所: ${bridge.location}<br>
            高さ: ${bridge.height}m
        `;
        if (seaTimeout) {
            clearTimeout(seaTimeout);
            seaTimeout = null;
        }
    } else {
        nextBridgeElement.innerHTML = '全ての橋を通過しました！<br>おめでとうございます！';
        if (!seaTimeout) {
            seaTimeout = setTimeout(() => {
                showSeaAnimation();
            }, 4000);
        }
    }
}

// しゃがみ動作
function duck(isDucking) {
    if (!window.canoeGroup) return;
    
    gameState.isDucking = isDucking;
    
    if (isDucking) {
        gameState.canoeHeight = gameState.duckingHeight;
        duckingIndicator.style.display = 'block';
    } else {
        gameState.canoeHeight = gameState.normalHeight;
        duckingIndicator.style.display = 'none';
    }
    
    // スムーズな高さ変更
    const targetY = gameState.canoeHeight;
    const currentY = window.canoeGroup.position.y;
    const diff = targetY - currentY;
    window.canoeGroup.position.y += diff * 0.1;
}

// ゲームオーバー
function gameOver() {
    gameState.isGameOver = true;
    finalScoreElement.textContent = gameState.score;
    gameOverElement.style.display = 'block';
}

// ゲーム再開
function restartGame() {
    // シーンをクリア
    if (wavesAnimationId) {
        cancelAnimationFrame(wavesAnimationId);
        wavesAnimationId = null;
    }
    while(scene.children.length > 0) {
        const child = scene.children[0];
        scene.remove(child);
        if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    }
    
    // 状態リセット
    bridges = [];
    gameState = {
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
    nextSpawnIndex = 3; // Reset spawn index
    
    gameOverElement.style.display = 'none';
    duckingIndicator.style.display = 'none';
    warningElement.style.display = 'none';
    if (seaTimeout) {
        clearTimeout(seaTimeout);
        seaTimeout = null;
    }
    
    // 再初期化
    scene.add(ambientLight);
    scene.add(directionalLight);
    createRiver();
    createCanoe();
    createInitialBridges();
    updateBridgeInfo();
    seaAnimation.style.display = 'none';
}

// メインゲームループ
function animate() {
    requestAnimationFrame(animate);
    if (gameState.isGameOver) {
        return;
    }
    if (window.canoeGroup) {
        // カヌーを前進
        window.canoeGroup.position.z -= gameState.speed * 0.1;
        // カメラをカヌーに追従
        camera.position.z = window.canoeGroup.position.z + 10;
        camera.position.y = window.canoeGroup.position.y + 6;
        camera.lookAt(window.canoeGroup.position);
        // しゃがみ動作の更新
        duck(gameState.isDucking);
        // 頭での操縦を適用
        if (typeof applySteering === 'function') {
            applySteering();
        }
        // 橋通過判定
        if (checkBridgeDuck()) {
            gameOver();
            return;
        }
        // 警告チェック
        checkWarning();
        // 古い橋を削除
        bridges = bridges.filter(bridge => {
            if (bridge.group.position.z > window.canoeGroup.position.z + 50) {
                scene.remove(bridge.group);
                return false;
            }
            return true;
        });
    }
    // スコア更新
    gameState.score += Math.floor(gameState.speed * 0.1);
    updateUI();
    renderer.render(scene, camera);
}

// イベントリスナー
paddleBtn.addEventListener('click', () => {
    if (!gameState.isGameOver) {
        gameState.speed = Math.min(gameState.speed + 0.1, 5.0);
    }
});

duckBtn.addEventListener('mousedown', () => {
    if (!gameState.isGameOver) {
        duck(true);
    }
});

duckBtn.addEventListener('mouseup', () => {
    duck(false);
});

duckBtn.addEventListener('mouseleave', () => {
    duck(false);
});

// タッチイベント
duckBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameState.isGameOver) {
        duck(true);
    }
});

duckBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    duck(false);
});

// キーボード操作
window.addEventListener('keydown', (e) => {
    if (gameState.isGameOver) return;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        gameState.speed = Math.min(gameState.speed + 0.1, 5.0);
    }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        duck(true);
    }
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        duck(false);
    }
});

// 海アニメーション用要素をbody直下に追加
const seaAnimation = document.getElementById('seaAnimation'); // Already exists in HTML

// 海アニメーション
function showSeaAnimation() {
    seaAnimation.style.display = 'block';
    // 簡単な波アニメーション
    let t = 0;
    function animateSea() {
        t += 0.03;
        seaAnimation.style.background = `linear-gradient(to top, #0099ff 60%, #fff ${(90 + 10*Math.sin(t))}%)`;
        if (seaAnimation.style.display === 'block') {
            requestAnimationFrame(animateSea);
        }
    }
    animateSea();
}

window.addEventListener('DOMContentLoaded', () => {
    loadBridgeDataAndStart();
});
