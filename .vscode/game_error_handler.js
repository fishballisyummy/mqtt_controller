// ========== Global Error Handler for All Games ==========
class GameErrorHandler {
    constructor() {
        this.setupGlobalHandlers();
        this.errorLog = [];
        this.maxErrorLog = 50;
    }

    setupGlobalHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.logError('Global Error', event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
            this.showUserError('發生未預期的錯誤，請重新整理頁面');
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('Unhandled Promise Rejection', event.reason);
            this.showUserError('操作失敗，請重試');
            event.preventDefault();
        });

        // Canvas context loss handler
        this.setupCanvasErrorHandler();
    }

    setupCanvasErrorHandler() {
        const checkCanvasContext = () => {
            const canvases = document.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                const ctx = canvas.getContext('webgl') || canvas.getContext('2d');
                if (!ctx) {
                    this.logError('Canvas Context Lost', null, { canvasId: canvas.id });
                    this.handleCanvasError(canvas);
                }
            });
        };

        // Check periodically
        setInterval(checkCanvasContext, 5000);
    }

    handleCanvasError(canvas) {
        const container = canvas.parentElement;
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'canvas-error';
            errorDiv.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    圖形渲染失敗
                    <button onclick="location.reload()">重新整理</button>
                </div>
            `;
            container.appendChild(errorDiv);
            canvas.style.display = 'none';
        }
    }

    logError(type, error, additionalInfo = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            type: type,
            message: error?.message || 'Unknown error',
            stack: error?.stack,
            additionalInfo: additionalInfo,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.errorLog.push(errorEntry);
        
        // Keep log size manageable
        if (this.errorLog.length > this.maxErrorLog) {
            this.errorLog.shift();
        }

        console.error(`[${type}]`, error, additionalInfo);
    }

    showUserError(message) {
        // Remove existing error messages
        const existingErrors = document.querySelectorAll('.user-error');
        existingErrors.forEach(el => el.remove());

        // Create new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'user-error';
        errorDiv.innerHTML = `
            <div class="user-error-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add styles if not already present
        if (!document.querySelector('#error-styles')) {
            const style = document.createElement('style');
            style.id = 'error-styles';
            style.textContent = `
                .user-error {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                    background: rgba(255, 107, 107, 0.9);
                    color: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    animation: slideIn 0.3s ease;
                }
                
                .user-error-content {
                    padding: 15px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .user-error button {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    margin-left: auto;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                }
                
                .canvas-error {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    text-align: center;
                }
                
                .canvas-error .error-message {
                    padding: 20px;
                }
                
                .canvas-error button {
                    margin-top: 10px;
                    padding: 10px 20px;
                    background: #4ecdc4;
                    color: #1a1a2e;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(errorDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }

    getErrorLog() {
        return [...this.errorLog];
    }

    clearErrorLog() {
        this.errorLog = [];
    }
}

// ========== Game Performance Monitor ==========
class GamePerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: 0,
            memoryUsage: 0,
            renderTime: 0,
            lastFrameTime: performance.now()
        };
        this.frameCount = 0;
        this.fpsUpdateInterval = 1000;
        this.lastFpsUpdate = performance.now();
    }

    startMonitoring() {
        this.monitorFrame();
        this.monitorMemory();
    }

    monitorFrame() {
        const now = performance.now();
        const deltaTime = now - this.metrics.lastFrameTime;
        
        this.frameCount++;
        this.metrics.renderTime = deltaTime;
        this.metrics.lastFrameTime = now;

        // Update FPS every second
        if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            this.metrics.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            
            this.onPerformanceUpdate();
        }

        requestAnimationFrame(() => this.monitorFrame());
    }

    monitorMemory() {
        if (performance.memory) {
            this.metrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1048576); // MB
        }
        
        setTimeout(() => this.monitorMemory(), 2000);
    }

    onPerformanceUpdate() {
        // Override in specific games to update UI
        console.log('Performance:', this.metrics);
    }

    getMetrics() {
        return { ...this.metrics };
    }
}

// ========== Safe Storage Manager ==========
class SafeStorageManager {
    constructor() {
        this.isLocalStorageAvailable = this.checkLocalStorage();
    }

    checkLocalStorage() {
        try {
            const testKey = '__test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn('localStorage not available:', e);
            return false;
        }
    }

    setItem(key, value) {
        try {
            if (this.isLocalStorageAvailable) {
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                // Fallback to session storage or memory
                sessionStorage.setItem(key, JSON.stringify(value));
            }
            return true;
        } catch (e) {
            console.error('Failed to save to storage:', e);
            return false;
        }
    }

    getItem(key, defaultValue = null) {
        try {
            let value;
            if (this.isLocalStorageAvailable) {
                value = localStorage.getItem(key);
            } else {
                value = sessionStorage.getItem(key);
            }
            
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.error('Failed to read from storage:', e);
            return defaultValue;
        }
    }

    removeItem(key) {
        try {
            if (this.isLocalStorageAvailable) {
                localStorage.removeItem(key);
            } else {
                sessionStorage.removeItem(key);
            }
            return true;
        } catch (e) {
            console.error('Failed to remove from storage:', e);
            return false;
        }
    }

    clear() {
        try {
            if (this.isLocalStorageAvailable) {
                localStorage.clear();
            } else {
                sessionStorage.clear();
            }
            return true;
        } catch (e) {
            console.error('Failed to clear storage:', e);
            return false;
        }
    }
}

// ========== Initialize Global Error Handler ==========
document.addEventListener('DOMContentLoaded', () => {
    window.gameErrorHandler = new GameErrorHandler();
    window.safeStorage = new SafeStorageManager();
    
    // Add performance monitoring to games that need it
    if (document.querySelector('#webglCanvas')) {
        window.performanceMonitor = new GamePerformanceMonitor();
        window.performanceMonitor.startMonitoring();
    }
});

// ========== Utility Functions ==========
window.GameUtils = {
    // Safe function execution with error handling
    safeExecute: function(fn, fallback = null, context = 'Unknown') {
        try {
            return fn();
        } catch (error) {
            if (window.gameErrorHandler) {
                window.gameErrorHandler.logError(`Safe Execute (${context})`, error);
            }
            return fallback;
        }
    },

    // Debounce function for performance
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function for performance
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Check if element is in viewport
    isInViewport: function(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    // Format bytes for display
    formatBytes: function(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
};