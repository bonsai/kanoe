// Pose Controller for Kanoe Game
// Uses MediaPipe Pose Detection to control the game with head movements

class PoseController {
    constructor() {
        this.pose = null;
        this.camera = null;
        this.isRunning = false;
        this.onPoseDetected = null;
        this.statusElement = null;
        this.outputCanvas = null;
        this.outputCtx = null;
        
        // Head position tracking
        this.headPosition = {
            x: 0,
            y: 0,
            z: 0
        };
        
        // Thresholds for head movements
        this.thresholds = {
            headDown: 0.15,      // Nose to shoulder distance threshold
            headLeft: 0.1,       // Head tilt left threshold
            headRight: 0.1,      // Head tilt right threshold
            confidence: 0.5      // Minimum confidence for detection
        };
        
        // Current gesture state
        this.currentGesture = {
            isDucking: false,
            steerLeft: false,
            steerRight: false
        };
        
        // Smoothing for gestures
        this.gestureHistory = [];
        this.historySize = 3;
    }
    
    async init() {
        try {
            this.statusElement = document.getElementById('poseStatus');
            this.outputCanvas = document.getElementById('output-canvas');
            this.outputCtx = this.outputCanvas.getContext('2d');
            
            // Set canvas size
            this.outputCanvas.width = 160;
            this.outputCanvas.height = 120;
            
            // Initialize MediaPipe Pose
            this.pose = new Pose({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });
            
            this.pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            this.pose.onResults(this.onResults.bind(this));
            
            // Start camera
            await this.startCamera();
            
            this.updateStatus('📷 ポーズ検出：起動中...', 'orange');
            
        } catch (error) {
            console.error('Pose Controller initialization error:', error);
            this.updateStatus('📷 エラー：' + error.message, 'red');
        }
    }
    
    async startCamera() {
        try {
            const videoElement = document.getElementById('input-video');
            
            // Get camera stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });
            
            videoElement.srcObject = stream;
            
            return new Promise((resolve, reject) => {
                videoElement.onloadedmetadata = () => {
                    videoElement.play();
                    this.camera = new Camera(videoElement, {
                        onFrame: async () => {
                            await this.pose.send({ image: videoElement });
                        },
                        width: 640,
                        height: 480
                    });
                    this.camera.start();
                    this.isRunning = true;
                    this.updateStatus('📷 ポーズ検出：準備完了', 'green');
                    // Dispatch event to notify other scripts that pose controller is ready
                    window.dispatchEvent(new Event('poseControllerReady'));
                    resolve();
                };
                
                videoElement.onerror = (err) => {
                    reject(new Error('Camera error: ' + err.message));
                };
                
                setTimeout(() => {
                    if (!this.isRunning) {
                        reject(new Error('Camera timeout'));
                    }
                }, 10000);
            });
            
        } catch (error) {
            console.error('Camera error:', error);
            this.updateStatus('📷 カメラエラー：権限を確認してください', 'red');
            throw error;
        }
    }
    
    onResults(results) {
        if (!this.outputCtx || !results.poseLandmarks) {
            return;
        }
        
        // Draw video frame
        this.outputCtx.save();
        this.outputCtx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
        this.outputCtx.drawImage(results.image, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
        
        // Draw pose landmarks
        if (results.poseLandmarks) {
            this.drawLandmarks(results.poseLandmarks);
            this.detectHeadGesture(results.poseLandmarks);
        }
        
        this.outputCtx.restore();
    }
    
    drawLandmarks(landmarks) {
        const ctx = this.outputCtx;
        
        // Draw connections (MediaPipe Pose landmark indices)
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 7],  // Left face outline
            [0, 4], [4, 5], [5, 6],          // Right face outline
            [9, 10],                         // Mouth
            [11, 12],                        // Shoulders
            [11, 13], [13, 15],              // Left arm
            [12, 14], [14, 16]               // Right arm
        ];
        
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        
        connections.forEach(([i, j]) => {
            if (landmarks[i] && landmarks[j] && 
                landmarks[i].visibility > 0.5 && landmarks[j].visibility > 0.5) {
                ctx.beginPath();
                ctx.moveTo(landmarks[i].x * this.outputCanvas.width, 
                          landmarks[i].y * this.outputCanvas.height);
                ctx.lineTo(landmarks[j].x * this.outputCanvas.width, 
                          landmarks[j].y * this.outputCanvas.height);
                ctx.stroke();
            }
        });
        
        // Draw nose landmark (key for head detection)
        if (landmarks[0]) {
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(landmarks[0].x * this.outputCanvas.width, 
                   landmarks[0].y * this.outputCanvas.height, 4, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    detectHeadGesture(landmarks) {
        // Check if we have the necessary landmarks
        const nose = landmarks[0];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        
        if (!nose || !leftShoulder || !rightShoulder) {
            return;
        }
        
        const confidence = Math.min(
            nose.visibility || 0,
            leftShoulder.visibility || 0,
            rightShoulder.visibility || 0
        );
        
        if (confidence < this.thresholds.confidence) {
            return;
        }
        
        // Calculate head position relative to shoulders
        const shoulderCenter = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };
        
        const headOffsetX = nose.x - shoulderCenter.x;
        const headOffsetY = nose.y - shoulderCenter.y;

        // Store head position
        this.headPosition = {
            x: headOffsetX,
            y: headOffsetY,
            z: nose.z || 0
        };

        // Detect gestures
        // Note: In MediaPipe coordinates, y increases downward
        // Ducking (head down) means nose.y > shoulder.y (positive offset)
        const gesture = {
            isDucking: headOffsetY > this.thresholds.headDown,
            steerLeft: headOffsetX < -this.thresholds.headLeft,
            steerRight: headOffsetX > this.thresholds.headRight
        };
        
        // Add to history for smoothing
        this.gestureHistory.push(gesture);
        if (this.gestureHistory.length > this.historySize) {
            this.gestureHistory.shift();
        }
        
        // Smooth gestures (majority vote)
        const smoothedGesture = this.smoothGesture();
        
        // Update current gesture
        this.currentGesture = smoothedGesture;
        
        // Notify game
        if (this.onPoseDetected) {
            this.onPoseDetected(smoothedGesture);
        }
        
        // Update status display
        this.updateGestureStatus(smoothedGesture);
    }
    
    smoothGesture() {
        const duckCount = this.gestureHistory.filter(g => g.isDucking).length;
        const leftCount = this.gestureHistory.filter(g => g.steerLeft).length;
        const rightCount = this.gestureHistory.filter(g => g.steerRight).length;
        
        return {
            isDucking: duckCount >= Math.ceil(this.historySize / 2),
            steerLeft: leftCount >= Math.ceil(this.historySize / 2),
            steerRight: rightCount >= Math.ceil(this.historySize / 2)
        };
    }
    
    updateGestureStatus(gesture) {
        if (!this.statusElement) return;
        
        const statusParts = [];
        if (gesture.isDucking) statusParts.push('👇 しゃがみ');
        if (gesture.steerLeft) statusParts.push('👈 左');
        if (gesture.steerRight) statusParts.push('👉 右');
        
        if (statusParts.length > 0) {
            this.statusElement.textContent = '📷 検出中：' + statusParts.join(' + ');
            this.statusElement.style.color = '#FFD700';
        } else {
            this.statusElement.textContent = '📷 ポーズ検出：準備完了';
            this.statusElement.style.color = '#4CAF50';
        }
    }
    
    updateStatus(message, color = 'green') {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            this.statusElement.style.color = color;
        }
    }
    
    setCallback(callback) {
        this.onPoseDetected = callback;
    }
    
    getCurrentGesture() {
        return this.currentGesture;
    }
}

// Create global instance
window.poseController = new PoseController();

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.poseController.init();
    });
} else {
    window.poseController.init();
}
