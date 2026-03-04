// ============================================
// Head Control Integration (MediaPipe Pose)
// Adds head movement controls to the Kanoe game
// ============================================

// Steering constants
const STEERING_X_LIMIT = 35;
const TILT_Z_LIMIT = 0.3;
const TILT_INCREMENT = 0.05;
const TILT_DAMPING_FACTOR = 0.9;

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
            -STEERING_X_LIMIT,
            window.canoeGroup.position.x - steeringState.speed
        );
        // Tilt canoe when steering
        window.canoeGroup.rotation.z = Math.min(
            TILT_Z_LIMIT,
            window.canoeGroup.rotation.z + TILT_INCREMENT
        );
    } else if (steeringState.right) {
        window.canoeGroup.position.x = Math.min(
            STEERING_X_LIMIT,
            window.canoeGroup.position.x + steeringState.speed
        );
        // Tilt canoe when steering
        window.canoeGroup.rotation.z = Math.max(
            -TILT_Z_LIMIT,
            window.canoeGroup.rotation.z - TILT_INCREMENT
        );
    } else {
        // Return to center rotation
        window.canoeGroup.rotation.z *= TILT_DAMPING_FACTOR;
    }
}

// Wait for pose controller to be ready (event-driven initialization)
window.addEventListener('poseControllerReady', () => {
    setupHeadControls();
    console.log('Head controls initialized');
});
