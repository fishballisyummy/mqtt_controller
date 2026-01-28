// ========== Gesture Recognition Module ==========
class GestureRecognitionSystem {
    constructor() {
        this.pose = null;
        this.isModelLoaded = false;
        this.cameraStarted = false;
        this.modelLoadPromise = null;
        this.fallbackMode = false;
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

                if (typeof Pose === 'undefined') {
                    throw new Error('MediaPipe not loaded');
                }

                this.pose = new Pose({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                    }
                });

                this.pose.setOptions({
                    modelComplexity: 1, // Use balanced model for better performance
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: false,
                    minDetectionConfidence: 0.6, // Increased confidence threshold
                    minTrackingConfidence: 0.6
                });

                clearTimeout(timeout);
                this.isModelLoaded = true;
                resolve();
            } catch (error) {
                console.error('MediaPipe initialization failed:', error);
                this.enableFallbackMode();
                resolve();
            }
        });

        return this.modelLoadPromise;
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
                        width: { ideal: 640 }, // Reduced resolution for better performance
                        height: { ideal: 480 }
                    },
                    audio: false
                });
                videoElement.srcObject = stream;
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

    classifyGesture(landmarks, handType) {
        if (this.fallbackMode) return null;

        try {
            const wristKey = handType === 'right' ? 15 : 16;
            const thumbKey = handType === 'right' ? 17 : 22;
            const indexKey = handType === 'right' ? 18 : 23;
            const middleKey = handType === 'right' ? 19 : 24;
            const ringKey = handType === 'right' ? 20 : 25;
            const pinkyKey = handType === 'right' ? 21 : 26;

            const wrist = landmarks[wristKey];
            const thumb = landmarks[thumbKey];
            const index = landmarks[indexKey];
            const middle = landmarks[middleKey];
            const ring = landmarks[ringKey];
            const pinky = landmarks[pinkyKey];

            if (!wrist || !wrist.visibility || wrist.visibility < 0.7) return null;

            // Enhanced gesture detection with more strict thresholds
            const isThumbOpen = thumb && thumb.visibility > 0.7 && thumb.y < wrist.y - 0.04;
            const isIndexOpen = index && index.visibility > 0.7 && index.y < wrist.y - 0.05;
            const isMiddleOpen = middle && middle.visibility > 0.7 && middle.y < wrist.y - 0.05;
            const isRingOpen = ring && ring.visibility > 0.7 && ring.y < wrist.y - 0.04;
            const isPinkyOpen = pinky && pinky.visibility > 0.7 && pinky.y < wrist.y - 0.04;

            const openFingers = [isIndexOpen, isMiddleOpen, isRingOpen, isPinkyOpen].filter(Boolean).length;

            // Improved classification logic
            if (openFingers >= 3) {
                return 'paper';
            } else if (openFingers === 2 && isIndexOpen && isMiddleOpen) {
                return 'scissors';
            } else if (openFingers <= 1) {
                return 'rock';
            }
            
            return null;
        } catch (error) {
            console.error('Gesture classification error:', error);
            return null;
        }
    }

    async processFrame(videoElement, onResults) {
        if (this.fallbackMode || !this.pose || !this.isModelLoaded) return;

        try {
            await this.pose.send({ image: videoElement });
            // Results will be handled by the onResults callback
        } catch (error) {
            console.error('Frame processing error:', error);
        }
    }

    setResultsCallback(callback) {
        if (this.pose) {
            this.pose.onResults = callback;
        }
    }

    cleanup() {
        if (this.pose) {
            this.pose.close();
            this.pose = null;
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
                    await this.gestureSystem.processFrame(
                        this.uiController.elements.video,
                        (results) => this.onGestureResults(results)
                    );
                },
                width: 640,
                height: 480
            });
            this.camera.start();
        }
    }

    onGestureResults(results) {
        if (!this.game.isGameActive || !results.poseLandmarks) {
            return;
        }

        // Draw skeleton on canvas (simplified)
        this.drawSkeleton(results);

        // Classify gestures from both hands
        const rightGesture = this.gestureSystem.classifyGesture(results.poseLandmarks, 'right');
        const leftGesture = this.gestureSystem.classifyGesture(results.poseLandmarks, 'left');

        // Use the most confident gesture
        let finalGesture = null;
        if (rightGesture && leftGesture) {
            finalGesture = rightGesture; // Prefer right hand
        } else if (rightGesture) {
            finalGesture = rightGesture;
        } else if (leftGesture) {
            finalGesture = leftGesture;
        }

        if (finalGesture && finalGesture !== this.game.lastDetectedGesture) {
            this.game.lastDetectedGesture = finalGesture;
            this.uiController.updateGestureDisplay(`檢測到: ${this.uiController.getGestureName(finalGesture)}`);
            this.processGesture(finalGesture);
        }
    }

    drawSkeleton(results) {
        // Simplified skeleton drawing - would need canvas overlay
        // This is a placeholder for the skeleton visualization
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