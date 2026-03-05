// ============================================
// Game Loop and Event Handlers
// ============================================

// メインゲームループ
function animate() {
    requestAnimationFrame(animate);
    if (gameState.isGameOver) {
        return;
    }
    if (window.canoeGroup) {
        // カヌーを前進
        window.canoeGroup.position.z -= gameState.speed * 0.1;
        
        // カメラをカヌーに追従（視点はあまり変わらない）
        const targetCameraZ = window.canoeGroup.position.z + 10;
        const targetCameraY = window.canoeGroup.position.y + 6;
        
        // スムーズなカメラ移動（lerp）
        camera.position.z += (targetCameraZ - camera.position.z) * 0.1;
        camera.position.y += (targetCameraY - camera.position.y) * 0.05; // Y軸はさらにゆっくり
        
        // カメラの向きも滑らかに
        const lookAtTarget = new THREE.Vector3(
            window.canoeGroup.position.x * 0.3, // X軸の影響を減らす
            window.canoeGroup.position.y,
            window.canoeGroup.position.z - 5
        );
        camera.lookAt(lookAtTarget);
        
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

// Restart button event listener
const restartBtn = document.getElementById('restartBtn');
if (restartBtn) {
    restartBtn.addEventListener('click', restartGame);
}

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
    loadBridgeDataAndStart();
});
