// ============================================
// Game Logic
// ============================================

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
                // デバッグモードでは死なない
                if (window.debugMode) {
                    console.warn('橋に衝突！（デバッグモードのため続行）');
                    bridge.passed = true;
                    gameState.currentBridgeIndex++;
                    updateBridgeInfo();
                    // 次の橋を生成
                    if (nextSpawnIndex < bridgeData.length) {
                        const farthestBridge = bridges.reduce((min, b) => b.group.position.z < min.group.position.z ? b : min);
                        const newBridge = createBridge(
                            bridgeData[nextSpawnIndex],
                            farthestBridge.group.position.z - gameState.bridgeSpacing
                        );
                        bridges.push(newBridge);
                        nextSpawnIndex++;
                    }
                    return false; // ゲームオーバーにしない
                }
                return true; // しゃがんでいない→ゲームオーバー
            } else {
                // 通過成功 - ポイント加算
                bridge.passed = true;
                const bridgePoints = 100;
                gameState.score += bridgePoints;
                
                // ポイント表示
                showPointsPopup(bridgePoints);
                
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

// ポイント表示ポップアップ
function showPointsPopup(points) {
    const popup = document.createElement('div');
    popup.textContent = `+${points}`;
    popup.style.cssText = `
        position: fixed;
        top: 40%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 48px;
        font-weight: bold;
        color: #FFD700;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        z-index: 180;
        pointer-events: none;
        animation: pointsPopup 1s ease-out forwards;
    `;
    
    // アニメーション定義
    if (!document.getElementById('pointsPopupStyle')) {
        const style = document.createElement('style');
        style.id = 'pointsPopupStyle';
        style.textContent = `
            @keyframes pointsPopup {
                0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                100% { opacity: 0; transform: translate(-50%, -100%) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1000);
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
            // Clear waves reference if this is the waves mesh
            if (child === wavesMesh) {
                wavesMesh = null;
            }
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
