// ============================================
// Head Control Integration (MediaPipe Pose)
// Adds head movement controls to the Kanoe game
// ============================================

// Steering state
let steeringState = {
    left: false,
    right: false,
    speed: 0.15
};

// Setup pose detection callback
function setupHeadControls() {
    if (window.poseController) {
        window.poseController.setCallback((gesture) => {
            if (gameState.isGameOver) return;
            
            // Handle ducking (head down)
            if (gesture.isDucking) {
                duck(true);
            } else {
                duck(false);
            }
            
            // Handle steering (head left/right)
            steeringState.left = gesture.steerLeft;
            steeringState.right = gesture.steerRight;
        });
    }
}

// Apply steering in game loop - called from animate()
function applySteering() {
    if (!window.canoeGroup || gameState.isGameOver) return;
    
    if (steeringState.left) {
        window.canoeGroup.position.x = Math.max(
            -35,
            window.canoeGroup.position.x - steeringState.speed
        );
        // Tilt canoe when steering
        window.canoeGroup.rotation.z = Math.min(
            0.3,
            window.canoeGroup.rotation.z + 0.05
        );
    } else if (steeringState.right) {
        window.canoeGroup.position.x = Math.min(
            35,
            window.canoeGroup.position.x + steeringState.speed
        );
        // Tilt canoe when steering
        window.canoeGroup.rotation.z = Math.max(
            -0.3,
            window.canoeGroup.rotation.z - 0.05
        );
    } else {
        // Return to center rotation
        window.canoeGroup.rotation.z *= 0.9;
    }
}

// Wait for game to load and setup head controls
setTimeout(() => {
    setupHeadControls();
    console.log('Head controls initialized');
}, 1000);
