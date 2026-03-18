// ========== Gesture Recognition Module with MediaPipe Hands ==========
class GestureRecognitionSystem {
    constructor() {
        this.hands = null;
        this.isModelLoaded = false;
        this.cameraStarted = false;
        this.modelLoadPromise = null;
        this.fallbackMode = false;
        this.canvas = null;
        this.canvasCtx = null;
        this.drawingUtils = null;
    }

    async initializeModel() {
        if (this.modelLoadPromise) {
            return this.modelLoadPromise;
        }

        this.modelLoadPromise = new Promise(async (resolve, reject) => {
            try {
                // Try to load MediaPipe with timeout
                const timeout = setTimeout(() => {
                    this.enableFallbackMode();
                    resolve();
                }, 10000); // 10 second timeout

                if (typeof Hands === 'undefined') {
                    throw new Error('MediaPipe Hands not loaded');
                }

                this.hands = new Hands({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                    }
                });

                this.hands.setOptions({
                    maxNumHands: 2,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                // Initialize canvas for drawing landmarks
                this.initializeCanvas();

                clearTimeout(timeout);
                this.isModelLoaded = true;
                console.log('MediaPipe Hands model loaded successfully');
                resolve();
            } catch (error) {
                console.error('MediaPipe Hands initialization failed:', error);
                this.enableFallbackMode();
                resolve();
            }
        });

        return this.modelLoadPromise;
    }

    initializeCanvas() {
        // Create canvas overlay for drawing hand landmarks
        const videoContainer = document.querySelector('.video-container');
        if (!videoContainer) return;

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '10';
        videoContainer.appendChild(this.canvas);

        this.canvasCtx = this.canvas.getContext('2d');
        
        // Load drawing utils if available
        if (typeof window.drawConnectors !== 'undefined') {
            this.drawingUtils = window;
        }
    }

    enableFallbackMode() {
        this.fallbackMode = true;
        console.log('Fallback mode enabled - using manual input');
    }

    async startCamera(videoElement) {
        if (this.cameraStarted && !this.fallbackMode) return true;

        try {
            if (!this.fallbackMode) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    },
                    audio: false
                });
                videoElement.srcObject = stream;
                
                // Set canvas dimensions to match video
                if (this.canvas) {
                    this.canvas.width = videoElement.videoWidth || 640;
                    this.canvas.height = videoElement.videoHeight || 480;
                }
                
                this.cameraStarted = true;
                return true;
            }
        } catch (error) {
            console.error('Camera access failed:', error);
            this.enableFallbackMode();
            return false;
        }
        
        return this.fallbackMode;
    }

    classifyGesture(handLandmarks) {
        if (this.fallbackMode || !handLandmarks || handLandmarks.length === 0) return null;

        try {
            // MediaPipe Hands provides 21 landmarks per hand
            // Landmark indices: 0-wrist, 1-4 thumb, 5-8 index, 9-12 middle, 13-16 ring, 17-20 pinky
            
            // Get key landmarks for each finger
            // For each finger: tip, dip (distal interphalangeal), pip (proximal interphalangeal), mcp (metacarpophalangeal)
            const thumbTip = handLandmarks[4];
            const thumbIp = handLandmarks[3]; // thumb interphalangeal
            const thumbMcp = handLandmarks[2]; // thumb metacarpophalangeal
            
            const indexTip = handLandmarks[8];
            const indexDip = handLandmarks[7];
            const indexPip = handLandmarks[6];
            const indexMcp = handLandmarks[5];
            
            const middleTip = handLandmarks[12];
            const middleDip = handLandmarks[11];
            const middlePip = handLandmarks[10];
            const middleMcp = handLandmarks[9];
            
            const ringTip = handLandmarks[16];
            const ringDip = handLandmarks[15];
            const ringPip = handLandmarks[14];
            const ringMcp = handLandmarks[13];
            
            const pinkyTip = handLandmarks[20];
            const pinkyDip = handLandmarks[19];
            const pinkyPip = handLandmarks[18];
            const pinkyMcp = handLandmarks[17];
            
            const wrist = handLandmarks[0];

            // Improved finger open detection: check if fingertip is significantly above the MCP joint
            // For vertical hand orientation (palm facing camera)
            const isIndexOpen = this.isFingerOpen(indexTip, indexMcp, wrist);
            const isMiddleOpen = this.isFingerOpen(middleTip, middleMcp, wrist);
            const isRingOpen = this.isFingerOpen(ringTip, ringMcp, wrist);
            const isPinkyOpen = this.isFingerOpen(pinkyTip, pinkyMcp, wrist);
            const isThumbOpen = this.isThumbOpen(thumbTip, thumbMcp, wrist);

            // Debug logging
            console.log('Finger states - Index:', isIndexOpen, 'Middle:', isMiddleOpen,
                       'Ring:', isRingOpen, 'Pinky:', isPinkyOpen, 'Thumb:', isThumbOpen);

            const openFingers = [isIndexOpen, isMiddleOpen, isRingOpen, isPinkyOpen].filter(Boolean).length;

            // Rock-Paper-Scissors classification with improved logic
            // PAPER: All four fingers open (thumb doesn't matter)
            if (openFingers >= 4) {
                console.log('Detected: PAPER (all fingers open)');
                return 'paper';
            }
            // SCISSORS: Only index and middle fingers open, ring and pinky closed
            else if (openFingers === 2 && isIndexOpen && isMiddleOpen && !isRingOpen && !isPinkyOpen) {
                console.log('Detected: SCISSORS (index and middle fingers open)');
                return 'scissors';
            }
            // ROCK: No fingers open or only thumb open
            else if (openFingers === 0 || (openFingers <= 1 && isThumbOpen)) {
                console.log('Detected: ROCK (fist or thumb up)');
                return 'rock';
            }
            // Special case: SCISSORS with slight variations
            else if (openFingers === 2 && ((isIndexOpen && isMiddleOpen) || (isIndexOpen && isRingOpen) || (isMiddleOpen && isRingOpen))) {
                console.log('Detected: SCISSORS (two adjacent fingers open)');
                return 'scissors';
            }
            
            console.log('No clear gesture detected, open fingers:', openFingers);
            return null;
        } catch (error) {
            console.error('Gesture classification error:', error);
            return null;
        }
    }

    isFingerOpen(fingertip, fingerBase, wrist) {
        if (!fingertip || !fingerBase || !wrist) return false;
        
        // For vertical hand (palm facing camera), fingertip should be above fingerBase
        // Use a threshold to account for natural finger curvature
        const verticalThreshold = 0.03; // Adjust based on testing
        
        // Check if fingertip is significantly above the base joint
        return fingertip.y < fingerBase.y - verticalThreshold;
    }

    isThumbOpen(thumbTip, thumbBase, wrist) {
        if (!thumbTip || !thumbBase || !wrist) return false;
        
        // Thumb detection is different - check if thumb is extended away from hand
        // Compare thumb tip position relative to wrist
        const thumbThreshold = 0.1;
        const thumbDistance = this.calculateDistance(thumbTip, wrist);
        const baseDistance = this.calculateDistance(thumbBase, wrist);
        
        return thumbDistance > baseDistance + thumbThreshold;
    }

    calculateDistance(point1, point2) {
        if (!point1 || !point2) return 0;
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    async processFrame(videoElement) {
        if (this.fallbackMode || !this.hands || !this.isModelLoaded) return;

        try {
            await this.hands.send({ image: videoElement });
            // Results will be handled by the onResults callback set via setResultsCallback
        } catch (error) {
            console.error('Frame processing error:', error);
        }
    }

    setResultsCallback(callback) {
        if (this.hands) {
            this.hands.onResults = (results) => {
                // Draw hand landmarks on canvas
                this.drawHandLandmarks(results);
                // Call the original callback
                callback(results);
            };
        }
    }

    drawHandLandmarks(results) {
        if (!this.canvasCtx || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            return;
        }

        // Clear canvas
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw hand landmarks
        for (const landmarks of results.multiHandLandmarks) {
            // Draw connections
            if (this.drawingUtils && this.drawingUtils.drawConnectors) {
                this.drawingUtils.drawConnectors(this.canvasCtx, landmarks, this.drawingUtils.HAND_CONNECTIONS, {
                    color: '#00FF00',
                    lineWidth: 2
                });
            }

            // Draw landmarks
            for (const landmark of landmarks) {
                const x = landmark.x * this.canvas.width;
                const y = landmark.y * this.canvas.height;

                this.canvasCtx.beginPath();
                this.canvasCtx.arc(x, y, 3, 0, 2 * Math.PI);
                this.canvasCtx.fillStyle = '#FF0000';
                this.canvasCtx.fill();
            }
        }
    }

    cleanup() {
        if (this.hands) {
            this.hands.close();
            this.hands = null;
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.isModelLoaded = false;
        this.cameraStarted = false;
        this.fallbackMode = false;
    }
}

// ========== Game Logic Module ==========
class RockPaperScissorsGame {
    constructor() {
        this.playerScore = 0;
        this.computerScore = 0;
        this.isGameActive = false;
        this.roundEnded = true;
        this.lastDetectedGesture = null;
        
        this.gestures = ['rock', 'paper', 'scissors'];
        this.gestureNames = {
            rock: '石頭',
            paper: '布',
            scissors: '剪刀'
        };
    }

    playRound(playerGesture) {
        if (!this.isGameActive) return;

        this.isGameActive = false;
        this.roundEnded = true;

        const computerGesture = this.gestures[Math.floor(Math.random() * this.gestures.length)];

        let result;
        if (playerGesture === computerGesture) {
            result = '平局';
            return { result: 'draw', playerGesture, computerGesture, scoreChange: 0 };
        } else if (
            (playerGesture === 'rock' && computerGesture === 'scissors') ||
            (playerGesture === 'paper' && computerGesture === 'rock') ||
            (playerGesture === 'scissors' && computerGesture === 'paper')
        ) {
            result = '您贏了!';
            this.playerScore++;
            return { result: 'win', playerGesture, computerGesture, scoreChange: 1 };
        } else {
            result = '電腦贏了!';
            this.computerScore++;
            return { result: 'lose', playerGesture, computerGesture, scoreChange: -1 };
        }
    }

    reset() {
        this.playerScore = 0;
        this.computerScore = 0;
        this.isGameActive = false;
        this.roundEnded = true;
        this.lastDetectedGesture = null;
    }

    saveHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('rpsHistory') || '[]');
            history.push({
                date: new Date().toLocaleString(),
                playerScore: this.playerScore,
                computerScore: this.computerScore
            });
            // Keep only last 10 games
            if (history.length > 10) {
                history.shift();
            }
            localStorage.setItem('rpsHistory', JSON.stringify(history));
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }
}

// ========== UI Controller Module ==========
class UIController {
    constructor() {
        this.elements = this.initializeElements();
        this.setupEventListeners();
        this.fallbackButtons = null;
    }

    initializeElements() {
        const elements = {
            video: document.getElementById('video'),
            startBtn: document.getElementById('startBtn'),
            resetBtn: document.getElementById('resetBtn'),
            countdown: document.getElementById('countdown'),
            detectedGesture: document.getElementById('detectedGesture'),
            resultText: document.getElementById('resultText'),
            playerScore: document.getElementById('playerScore'),
            computerScore: document.getElementById('computerScore'),
            computerRock: document.getElementById('computerRock'),
            computerPaper: document.getElementById('computerPaper'),
            computerScissors: document.getElementById('computerScissors')
        };

        // Validate elements exist
        Object.entries(elements).forEach(([key, element]) => {
            if (!element) {
                console.error(`Element not found: ${key}`);
            }
        });

        return elements;
    }

    setupEventListeners() {
        // Enhanced start button with loading states
        if (this.elements.startBtn) {
            this.elements.startBtn.addEventListener('click', () => {
                if (typeof window.gameController !== 'undefined') {
                    window.gameController.startGame();
                }
            });
        }

        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => {
                if (typeof window.gameController !== 'undefined') {
                    window.gameController.resetGame();
                }
            });
        }
    }

    createFallbackButtons() {
        if (this.fallbackButtons) return;

        const container = document.querySelector('.camera-section');
        if (!container) return;

        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'fallback-controls';
        fallbackDiv.innerHTML = `
            <h3>手動選擇</h3>
            <div class="manual-choices">
                <button class="manual-choice rock" data-gesture="rock">
                    <i class="fas fa-hand-rock"></i> 石頭
                </button>
                <button class="manual-choice paper" data-gesture="paper">
                    <i class="fas fa-hand-paper"></i> 布
                </button>
                <button class="manual-choice scissors" data-gesture="scissors">
                    <i class="fas fa-hand-scissors"></i> 剪刀
                </button>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .fallback-controls {
                margin-top: 20px;
                padding: 20px;
                background: rgba(255, 107, 107, 0.2);
                border-radius: 10px;
                text-align: center;
            }
            .manual-choices {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 15px;
            }
            .manual-choice {
                padding: 15px;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s ease;
                min-width: 100px;
            }
            .manual-choice.rock { background: #ffd166; color: #1a1a2e; }
            .manual-choice.paper { background: #06d6a0; color: white; }
            .manual-choice.scissors { background: #118ab2; color: white; }
            .manual-choice:hover { transform: translateY(-2px); }
        `;
        document.head.appendChild(style);

        container.appendChild(fallbackDiv);

        // Add event listeners
        fallbackDiv.querySelectorAll('.manual-choice').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gesture = e.target.dataset.gesture;
                if (typeof window.gameController !== 'undefined') {
                    window.gameController.handleManualChoice(gesture);
                }
            });
        });

        this.fallbackButtons = fallbackDiv;
    }

    updateButtonState(state, text) {
        if (this.elements.startBtn) {
            this.elements.startBtn.textContent = text;
            this.elements.startBtn.disabled = state === 'disabled';
        }
    }

    updateScore(playerScore, computerScore) {
        if (this.elements.playerScore) {
            this.elements.playerScore.textContent = playerScore;
        }
        if (this.elements.computerScore) {
            this.elements.computerScore.textContent = computerScore;
        }
    }

    updateGestureDisplay(text) {
        if (this.elements.detectedGesture) {
            this.elements.detectedGesture.textContent = text;
        }
    }

    updateResult(result, playerGesture, computerGesture, resultType) {
        if (this.elements.resultText) {
            this.elements.resultText.textContent = 
                `${this.getGestureName(playerGesture)} vs ${this.getGestureName(computerGesture)} - ${result}`;
            this.elements.resultText.className = `result-text ${resultType}`;
        }
    }

    getGestureName(gesture) {
        const names = { rock: '石頭', paper: '布', scissors: '剪刀' };
        return names[gesture] || gesture;
    }

    setComputerChoice(choice) {
        // Reset all choices
        ['rock', 'paper', 'scissors'].forEach(gesture => {
            const element = this.elements[`computer${gesture.charAt(0).toUpperCase() + gesture.slice(1)}`];
            if (element) {
                element.style.opacity = '0.5';
            }
        });

        // Highlight selected choice
        const selectedElement = this.elements[`computer${choice.charAt(0).toUpperCase() + choice.slice(1)}`];
        if (selectedElement) {
            selectedElement.style.opacity = '1';
        }
    }

    clearComputerChoice() {
        this.setComputerChoice(null);
    }

    showCountdown(count) {
        if (this.elements.countdown) {
            this.elements.countdown.textContent = count;
        }
    }

    clearCountdown() {
        if (this.elements.countdown) {
            this.elements.countdown.textContent = '';
        }
    }

    showLoadingMessage(message) {
        this.updateGestureDisplay(message);
    }

    enableFallbackMode() {
        this.updateGestureDisplay('手勢識別不可用，請使用手動選擇');
        this.createFallbackButtons();
    }
}

// ========== Main Game Controller ==========
class GameController {
    constructor() {
        this.gestureSystem = new GestureRecognitionSystem();
        this.game = new RockPaperScissorsGame();
        this.uiController = new UIController();
        this.camera = null;
        this.countdownInterval = null;
    }

    async startGame() {
        if (!this.game.roundEnded) return;

        try {
            this.uiController.updateButtonState('disabled', '載入中...');
            this.uiController.clearCountdown();
            this.uiController.updateResult('準備開始...', '', '', '');

            // Initialize gesture recognition system
            await this.gestureSystem.initializeModel();

            // Check if fallback mode is enabled
            if (this.gestureSystem.fallbackMode) {
                this.uiController.enableFallbackMode();
                this.uiController.updateButtonState('disabled', '手動模式');
                return;
            }

            // Start camera
            const cameraStarted = await this.gestureSystem.startCamera(this.uiController.elements.video);
            if (!cameraStarted) {
                throw new Error('Camera failed to start');
            }

            // Set up results callback
            this.gestureSystem.setResultsCallback((results) => {
                this.onGestureResults(results);
            });

            // Start countdown
            this.startCountdown();

        } catch (error) {
            console.error('Game start failed:', error);
            this.uiController.showLoadingMessage('啟動失敗，請重新嘗試');
            this.uiController.updateButtonState('enabled', '開始遊戲');
        }
    }

    startCountdown() {
        let count = 3;
        this.uiController.showCountdown(count);
        this.uiController.updateButtonState('disabled', `${count}...`);

        this.countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                this.uiController.showCountdown(count);
                this.uiController.updateButtonState('disabled', `${count}...`);
            } else {
                clearInterval(this.countdownInterval);
                this.uiController.clearCountdown();
                this.startGestureDetection();
            }
        }, 1000);
    }

    startGestureDetection() {
        this.game.isGameActive = true;
        this.game.roundEnded = false;
        this.uiController.updateButtonState('enabled', '開始新一輪');
        this.uiController.updateGestureDisplay('請做出手勢');

        // Start MediaPipe detection
        if (!this.gestureSystem.fallbackMode) {
            this.camera = new Camera(this.uiController.elements.video, {
                onFrame: async () => {
                    await this.gestureSystem.processFrame(this.uiController.elements.video);
                },
                width: 640,
                height: 480
            });
            this.camera.start();
        }
    }

    onGestureResults(results) {
        // Update debug information
        this.updateDebugInfo(results);
        
        if (!this.game.isGameActive || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            return;
        }

        // Classify gestures from all detected hands
        let finalGesture = null;
        let highestConfidence = 0;

        for (const handLandmarks of results.multiHandLandmarks) {
            const gesture = this.gestureSystem.classifyGesture(handLandmarks);
            
            if (gesture) {
                // Simple confidence calculation based on number of landmarks
                const confidence = handLandmarks.length / 21; // 21 landmarks per hand
                if (confidence > highestConfidence) {
                    highestConfidence = confidence;
                    finalGesture = gesture;
                }
            }
        }

        if (finalGesture && finalGesture !== this.game.lastDetectedGesture) {
            this.game.lastDetectedGesture = finalGesture;
            this.uiController.updateGestureDisplay(`檢測到: ${this.uiController.getGestureName(finalGesture)}`);
            this.processGesture(finalGesture);
        }
    }

    updateDebugInfo(results) {
        // Update debug panel
        const debugInfo = document.getElementById('debugInfo');
        const debugStatus = document.getElementById('debugStatus');
        const debugHandCount = document.getElementById('debugHandCount');
        const debugFingerState = document.getElementById('debugFingerState');
        const debugClassification = document.getElementById('debugClassification');
        
        if (!debugInfo || !debugStatus) return;
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            debugStatus.textContent = '檢測中';
            debugHandCount.textContent = results.multiHandLandmarks.length;
            
            // Analyze first hand for finger states
            const handLandmarks = results.multiHandLandmarks[0];
            if (handLandmarks && handLandmarks.length >= 21) {
                // Simple finger state detection
                const thumbTip = handLandmarks[4];
                const indexTip = handLandmarks[8];
                const middleTip = handLandmarks[12];
                const ringTip = handLandmarks[16];
                const pinkyTip = handLandmarks[20];
                const wrist = handLandmarks[0];
                
                const isIndexOpen = indexTip && wrist && indexTip.y < wrist.y - 0.02;
                const isMiddleOpen = middleTip && wrist && middleTip.y < wrist.y - 0.02;
                const isRingOpen = ringTip && wrist && ringTip.y < wrist.y - 0.02;
                const isPinkyOpen = pinkyTip && wrist && pinkyTip.y < wrist.y - 0.02;
                
                const fingerStates = [
                    isIndexOpen ? '食指✓' : '食指✗',
                    isMiddleOpen ? '中指✓' : '中指✗',
                    isRingOpen ? '無名指✓' : '無名指✗',
                    isPinkyOpen ? '小指✓' : '小指✗'
                ].join(' ');
                
                debugFingerState.textContent = fingerStates;
                
                // Try to classify for debug display
                const gesture = this.gestureSystem.classifyGesture(handLandmarks);
                debugClassification.textContent = gesture ? this.uiController.getGestureName(gesture) : '未知';
            }
        } else {
            debugStatus.textContent = '未檢測到手部';
            debugHandCount.textContent = '0';
            debugFingerState.textContent = '-';
            debugClassification.textContent = '-';
        }
    }

    processGesture(gesture) {
        const result = this.game.playRound(gesture);
        if (result) {
            this.uiController.setComputerChoice(result.computerGesture);
            this.uiController.updateScore(this.game.playerScore, this.game.computerScore);
            this.uiController.updateResult(
                result.result, 
                result.playerGesture, 
                result.computerGesture,
                result.result
            );

            this.game.isGameActive = false;
            this.game.roundEnded = true;

            if (this.camera) {
                this.camera.stop();
                this.camera = null;
            }

            this.uiController.updateGestureDisplay('回合結束！點擊「開始遊戲」開始新一輪');
        }
    }

    handleManualChoice(gesture) {
        this.processGesture(gesture);
    }

    resetGame() {
        this.game.saveHistory();
        this.game.reset();
        this.uiController.updateScore(0, 0);
        this.uiController.updateResult('遊戲已重置', '', '', '');
        this.uiController.clearComputerChoice();
        this.uiController.updateGestureDisplay('請啟動攝像頭');
        this.uiController.updateButtonState('enabled', '開始遊戲');
        this.uiController.clearCountdown();

        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }

        this.game.isGameActive = false;
        this.game.roundEnded = true;
    }

    cleanup() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        if (this.camera) {
            this.camera.stop();
        }
        this.gestureSystem.cleanup();
    }
}

// ========== Initialize Game ==========
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.gameController = new GameController();
        
        // Set initial UI state
        const uiController = window.gameController.uiController;
        uiController.updateGestureDisplay('請啟動攝像頭');
        uiController.updateResult('準備開始遊戲...', '', '', '');
        uiController.clearComputerChoice();
        
        console.log('Rock Paper Scissors game initialized successfully');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        
        // Show error message to user
        const detectedGesture = document.getElementById('detectedGesture');
        if (detectedGesture) {
            detectedGesture.textContent = '遊戲初始化失敗，請重新整理頁面';
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.gameController) {
        window.gameController.cleanup();
    }
});