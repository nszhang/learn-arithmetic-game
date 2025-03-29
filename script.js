// Learn Arithmetic Game

// Constants
const CONSTANTS = {
    ANSWER_OPTIONS: 4,
    MIN_MULTIPLIER: 1,
    MAX_MULTIPLIER: 12,
    TIMER_INTERVAL: 100,
    TRANSITION_DELAY: 2000,
    LOW_TIME_THRESHOLD: 3,
    MAX_ATTEMPTS: 100
};

// Game state
const gameState = {
    currentScreen: 'selection',
    selectedOperation: null,
    selectedNumbers: new Set(),
    isMixedMode: false,
    score: 0,
    questionsAnswered: 0,
    questionsCorrect: 0,
    totalQuestions: 10,
    timeLimit: 10,
    currentQuestion: null,
    correctAnswer: null,
    options: [],
    timeRemaining: 10,
    timerInterval: null,
    isTransitioning: false,
    lastActionTime: Date.now(),
    soundEnabled: true,
    pendingTimeouts: [],
    lastSelections: {
        operation: null,
        numbers: new Set()
    },
    usedQuestions: new Set()
};

// DOM Elements
const screens = {
    selection: document.getElementById('selection-screen'),
    game: document.getElementById('game-screen'),
    results: document.getElementById('results-screen')
};

// Get DOM elements
const operationButtons = document.querySelectorAll('.operation-btn');
const numberButtons = document.querySelectorAll('.number-btn');
const startMixedButton = document.getElementById('start-mixed');
const questionCountSlider = document.getElementById('question-count');
const questionCountDisplay = document.getElementById('question-count-display');
const timeLimitSlider = document.getElementById('time-limit');
const timeLimitDisplay = document.getElementById('time-limit-display');
const currentOperationDisplay = document.getElementById('current-operation');
const scoreDisplay = document.getElementById('score');
const questionProgressDisplay = document.getElementById('question-progress');
const timerDisplay = document.getElementById('timer');
const timerBar = document.getElementById('timer-bar');
const questionDisplay = document.getElementById('question');
const answerButtons = document.querySelectorAll('.answer-btn');
const feedbackDisplay = document.getElementById('feedback');
const resultsContent = document.getElementById('results-content');
const practiceAgainButton = document.getElementById('practice-again');
const returnToMenuButton = document.getElementById('return-to-menu');
const backToMenuButton = document.getElementById('back-to-menu');

// Audio elements
const correctSound = document.getElementById('correct-sound');
const wrongSound = document.getElementById('wrong-sound');
const timerTickSound = document.getElementById('timer-tick');
const soundToggleButton = document.getElementById('sound-toggle');
const soundOnIcon = document.getElementById('sound-on-icon');
const soundOffIcon = document.getElementById('sound-off-icon');

// UI Utility Class
class UIManager {
    static updateButtonStyle(button, isSelected, selectedClass = 'selected') {
        button.classList.toggle(selectedClass, isSelected);
    }

    static updateFeedback(message, isError = false) {
        if (feedbackDisplay) {
            feedbackDisplay.textContent = message;
            feedbackDisplay.className = `text-center text-lg font-bold mb-4 ${isError ? 'text-red-600' : 'text-green-600'}`;
            feedbackDisplay.classList.remove('hidden');
        }
    }

    static hideFeedback() {
        if (feedbackDisplay) {
            feedbackDisplay.classList.add('hidden');
        }
    }

    static highlightCorrectAnswer(correctAnswer, highlightClass = 'bg-green-500') {
        answerButtons.forEach(button => {
            if (button.textContent.trim() === correctAnswer.toString()) {
                button.classList.add(highlightClass, 'text-white');
            }
        });
    }

    static resetAnswerButtons() {
        answerButtons.forEach(button => {
            button.classList.remove('bg-green-500', 'bg-red-500', 'text-white');
        });
    }

    static updateTimer(timeRemaining, totalTime) {
        if (timerDisplay) {
            timerDisplay.textContent = timeRemaining;
        }
        if (timerBar) {
            timerBar.style.width = `${(timeRemaining * 1000 / totalTime) * 100}%`;
        }
    }
}

// Game Logic Class
class GameLogic {
    static generateOptions(correctAnswer, operation) {
        const options = new Set([correctAnswer]);
        while (options.size < CONSTANTS.ANSWER_OPTIONS) {
            let wrongAnswer;
            const variation = (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
            
            if (operation === 'multiplication') {
                wrongAnswer = correctAnswer + variation * (1 + Math.floor(Math.random() * (correctAnswer / 2)));
            } else {
                wrongAnswer = correctAnswer + variation;
            }
            
            if (wrongAnswer >= 0) {
                options.add(wrongAnswer);
            }
        }
        return Array.from(options).sort((a, b) => a - b);
    }

    static getOperationSymbol(operation) {
        return {
            'addition': '+',
            'subtraction': '−',
            'multiplication': '×'
        }[operation];
    }

    static calculateMaxQuestions(numbers, operation) {
        if (operation === 'multiplication') {
            return numbers.length * CONSTANTS.MAX_MULTIPLIER;
        } else if (operation === 'subtraction') {
            return numbers.reduce((total, n) => total + n + 1, 0);
        }
        return numbers.length * numbers.length;
    }
}

// Helper function for safe audio playback
function playSoundSafely(audioElement) {
    if (!audioElement || !gameState.soundEnabled) return;
    
    try {
        audioElement.pause();
        audioElement.currentTime = 0;
        
        setTimeout(() => {
            try {
                const playPromise = audioElement.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn('Audio playback error:', error);
                    });
                }
            } catch (e) {
                console.warn('Audio play attempt failed:', e);
            }
        }, 50);
    } catch (e) {
        console.warn('Audio playback setup failed:', e);
    }
}

// Sound toggle functions
function toggleSound() {
    gameState.soundEnabled = !gameState.soundEnabled;
    updateSoundToggleUI();
    try {
        localStorage.setItem('soundEnabled', gameState.soundEnabled.toString());
    } catch (e) {}
}

function updateSoundToggleUI() {
    if (soundOnIcon && soundOffIcon) {
        soundOnIcon.classList.toggle('hidden', !gameState.soundEnabled);
        soundOffIcon.classList.toggle('hidden', gameState.soundEnabled);
    }
}

function initSoundToggle() {
    try {
        const savedSoundState = localStorage.getItem('soundEnabled');
        if (savedSoundState !== null) {
            gameState.soundEnabled = savedSoundState === 'true';
            updateSoundToggleUI();
        }
    } catch (e) {}
    
    if (soundToggleButton) {
        soundToggleButton.addEventListener('click', toggleSound);
    }
}

// Function to stop the game and return to menu
function stopGame() {
    // Set transitioning flag to prevent further game actions
    gameState.isTransitioning = true;

    // Clear the timer if it's running
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }

    // Clear any pending timeouts
    gameState.pendingTimeouts.forEach(timeout => clearTimeout(timeout));
    gameState.pendingTimeouts = [];

    // Remove all confetti elements
    const confettiElements = document.querySelectorAll('.confetti');
    confettiElements.forEach(element => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    });

    // Hide feedback
    UIManager.hideFeedback();

    // Reset button styles
    UIManager.resetAnswerButtons();

    // Reset game state
    resetGame();

    // Reset transitioning flag
    gameState.isTransitioning = false;

    // Show selection screen
    showSelectionScreen();
}

// Initialize the game
function initGame() {
    // Initialize sliders
    if (questionCountSlider && questionCountDisplay) {
        questionCountSlider.addEventListener('input', () => {
            gameState.totalQuestions = parseInt(questionCountSlider.value);
            questionCountDisplay.textContent = questionCountSlider.value;
        });
    }
    
    if (timeLimitSlider && timeLimitDisplay) {
        timeLimitSlider.addEventListener('input', () => {
            gameState.timeLimit = parseInt(timeLimitSlider.value);
            timeLimitDisplay.textContent = timeLimitSlider.value;
        });
    }

    // Initialize back to menu button
    if (backToMenuButton) {
        backToMenuButton.addEventListener('click', stopGame);
    }
    
    // Initialize operation buttons
    operationButtons.forEach(button => {
        button.addEventListener('click', () => {
            const operation = button.getAttribute('data-operation');
            if (gameState.selectedOperation === operation) {
                gameState.selectedOperation = null;
                button.classList.remove('selected');
            } else {
                operationButtons.forEach(b => b.classList.remove('selected'));
                gameState.selectedOperation = operation;
                button.classList.add('selected');
            }
        });
    });
    
    // Initialize number buttons
    numberButtons.forEach(button => {
        button.addEventListener('click', () => {
            const number = parseInt(button.getAttribute('data-number'));
            if (gameState.selectedNumbers.has(number)) {
                gameState.selectedNumbers.delete(number);
                button.classList.remove('selected');
            } else {
                gameState.selectedNumbers.add(number);
                button.classList.add('selected');
            }
        });
    });
    
    // Initialize start mixed button
    if (startMixedButton) {
        startMixedButton.addEventListener('click', () => {
            if (!gameState.selectedOperation && gameState.selectedNumbers.size === 0) {
                alert('Please select at least one operation and one number to practice!');
                return;
            }
            if (!gameState.selectedOperation) {
                alert('Please select an operation to practice!');
                return;
            }
            if (gameState.selectedNumbers.size === 0) {
                alert('Please select at least one number to practice!');
                return;
            }
            gameState.isMixedMode = true;
            startGame();
        });
    }
    
    // Initialize game control buttons
    if (practiceAgainButton) {
        practiceAgainButton.addEventListener('click', () => {
            resetGame();
            startGame();
        });
    }
    
    if (returnToMenuButton) {
        returnToMenuButton.addEventListener('click', () => {
            resetGame();
            showSelectionScreen();
        });
    }
    
    // Initialize answer buttons
    answerButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!gameState.isTransitioning) {
                checkAnswer(parseInt(button.textContent));
            }
        });
    });
    
    initSoundToggle();
    
    showSelectionScreen();
}

// Show a specific screen
function showScreen(screenName) {
    Object.entries(screens).forEach(([name, screen]) => {
        if (screen) {
            screen.classList.toggle('hidden', name !== screenName);
        }
    });
    gameState.currentScreen = screenName;
}

// Show selection screen
function showSelectionScreen() {
    showScreen('selection');
    
    // Restore previous selections if they exist
    if (gameState.lastSelections.operation) {
        gameState.selectedOperation = gameState.lastSelections.operation;
        operationButtons.forEach(button => {
            if (button.getAttribute('data-operation') === gameState.lastSelections.operation) {
                button.classList.add('selected');
            }
        });
    }
    
    if (gameState.lastSelections.numbers.size > 0) {
        gameState.selectedNumbers = new Set(gameState.lastSelections.numbers);
        numberButtons.forEach(button => {
            const number = parseInt(button.getAttribute('data-number'));
            if (gameState.lastSelections.numbers.has(number)) {
                button.classList.add('selected');
            }
        });
    }
    
    gameState.isMixedMode = false;
}

// Start the game
function startGame() {
    // Save current selections before starting
    gameState.lastSelections.operation = gameState.selectedOperation;
    gameState.lastSelections.numbers = new Set(gameState.selectedNumbers);
    
    // Clear used questions for new game
    gameState.usedQuestions.clear();
    
    gameState.score = 0;
    gameState.questionsAnswered = 0;
    gameState.questionsCorrect = 0;
    gameState.isTransitioning = false;
    
    // Update displays
    scoreDisplay.textContent = gameState.score;
    updateQuestionProgress();
    
    showScreen('game');
    generateQuestion();
    startTimer();
}

// Generate a new question
function generateQuestion() {
    const numbers = Array.from(gameState.selectedNumbers);
    let num1, num2, answer;
    let questionKey;
    let attempts = 0;
    
    if (gameState.usedQuestions.size >= GameLogic.calculateMaxQuestions(numbers, gameState.selectedOperation)) {
        gameState.usedQuestions.clear();
    }
    
    do {
        if (gameState.selectedOperation === 'subtraction') {
            num1 = numbers[Math.floor(Math.random() * numbers.length)];
            num2 = Math.floor(Math.random() * (num1 + 1));
            answer = num1 - num2;
        } else if (gameState.selectedOperation === 'multiplication') {
            const useSelectedFirst = Math.random() < 0.5;
            num1 = useSelectedFirst ? 
                numbers[Math.floor(Math.random() * numbers.length)] : 
                Math.floor(Math.random() * CONSTANTS.MAX_MULTIPLIER) + CONSTANTS.MIN_MULTIPLIER;
            num2 = useSelectedFirst ? 
                Math.floor(Math.random() * CONSTANTS.MAX_MULTIPLIER) + CONSTANTS.MIN_MULTIPLIER : 
                numbers[Math.floor(Math.random() * numbers.length)];
            answer = num1 * num2;
        } else {
            num1 = numbers[Math.floor(Math.random() * numbers.length)];
            num2 = numbers[Math.floor(Math.random() * numbers.length)];
            answer = num1 + num2;
        }
        
        questionKey = gameState.selectedOperation === 'multiplication' ?
            [Math.min(num1, num2), Math.max(num1, num2), gameState.selectedOperation].join(',') :
            [num1, num2, gameState.selectedOperation].join(',');
        
        attempts++;
    } while (gameState.usedQuestions.has(questionKey) && attempts < CONSTANTS.MAX_ATTEMPTS);
    
    gameState.usedQuestions.add(questionKey);
    gameState.currentQuestion = { num1, num2, operation: gameState.selectedOperation };
    gameState.correctAnswer = answer;
    
    const operationSymbol = GameLogic.getOperationSymbol(gameState.selectedOperation);
    questionDisplay.textContent = `${num1} ${operationSymbol} ${num2} = ?`;
    currentOperationDisplay.textContent = operationSymbol;
    
    gameState.options = GameLogic.generateOptions(answer, gameState.selectedOperation);
    const shuffledOptions = [...gameState.options].sort(() => Math.random() - 0.5);
    answerButtons.forEach((button, index) => {
        button.textContent = shuffledOptions[index];
    });
}

// Update the question progress display
function updateQuestionProgress() {
    questionProgressDisplay.textContent = `${gameState.questionsAnswered + 1}/${gameState.totalQuestions}`;
}

// Start the timer
function startTimer() {
    const totalTime = gameState.timeLimit * 1000;
    gameState.timeRemaining = gameState.timeLimit;
    UIManager.updateTimer(gameState.timeLimit, totalTime);
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    const startTime = Date.now();
    
    gameState.timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = totalTime - elapsed;
        
        if (remaining <= 0) {
            timeUp();
        } else {
            const seconds = Math.ceil(remaining / 1000);
            if (seconds !== gameState.timeRemaining) {
                gameState.timeRemaining = seconds;
                UIManager.updateTimer(seconds, totalTime);
                if (seconds <= CONSTANTS.LOW_TIME_THRESHOLD) {
                    playSoundSafely(timerTickSound);
                }
            }
        }
    }, CONSTANTS.TIMER_INTERVAL);
}

// Handle time's up
function timeUp() {
    if (gameState.isTransitioning) return;

    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    playSoundSafely(wrongSound);
    UIManager.highlightCorrectAnswer(gameState.correctAnswer);
    UIManager.updateFeedback('Time\'s up!', true);
    
    gameState.isTransitioning = true;
    
    const timeout = setTimeout(() => {
        if (gameState.questionsAnswered < gameState.totalQuestions - 1) {
            UIManager.resetAnswerButtons();
            gameState.questionsAnswered++;
            updateQuestionProgress();
            generateQuestion();
            startTimer();
            UIManager.hideFeedback();
        } else {
            showResults();
        }
        gameState.isTransitioning = false;
    }, CONSTANTS.TRANSITION_DELAY);
    
    // Track the timeout
    gameState.pendingTimeouts.push(timeout);
}

// Check the player's answer
function checkAnswer(playerAnswer) {
    if (gameState.isTransitioning) return;

    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    gameState.isTransitioning = true;
    
    const isCorrect = parseInt(playerAnswer) === gameState.correctAnswer;
    
    if (isCorrect) {
        gameState.score += Math.ceil(gameState.timeRemaining);
        gameState.questionsCorrect++;
        scoreDisplay.textContent = gameState.score;
        playSoundSafely(correctSound);
        
        UIManager.updateFeedback('Correct!');
    } else {
        playSoundSafely(wrongSound);
        
        UIManager.updateFeedback(`Wrong! The answer was ${gameState.correctAnswer}`, true);
    }
    
    const timeout = setTimeout(() => {
        if (gameState.questionsAnswered < gameState.totalQuestions - 1) {
            UIManager.resetAnswerButtons();
            gameState.questionsAnswered++;
            updateQuestionProgress();
            generateQuestion();
            startTimer();
            UIManager.hideFeedback();
        } else {
            showResults();
        }
        gameState.isTransitioning = false;
    }, CONSTANTS.TRANSITION_DELAY);
    
    // Track the timeout
    gameState.pendingTimeouts.push(timeout);
}

// Show results
function showResults() {
    showScreen('results');
    
    const accuracy = (gameState.questionsCorrect / gameState.totalQuestions) * 100;
    const message = `
        <p class="text-xl mb-4">Final Score: <span class="font-bold text-green-600">${gameState.score}</span></p>
        <p class="text-lg mb-2">Questions Correct: <span class="font-bold text-blue-600">${gameState.questionsCorrect}/${gameState.totalQuestions}</span></p>
        <p class="text-lg mb-4">Accuracy: <span class="font-bold text-purple-600">${accuracy.toFixed(1)}%</span></p>
    `;
    
    if (resultsContent) {
        resultsContent.innerHTML = message;
    }
    
    if (accuracy >= 80) {
        createConfetti(100);
    }
}

// Create confetti effect for celebrations
function createConfetti(count) {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    
    for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        confetti.style.opacity = Math.random();
        document.body.appendChild(confetti);
        
        // Remove confetti after animation and track the timeout
        const timeout = setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 5000);
        gameState.pendingTimeouts.push(timeout);
    }
}

// Complete game reset function
function resetGame() {
    // Reset game state
    gameState.score = 0;
    gameState.questionsAnswered = 0;
    gameState.questionsCorrect = 0;
    gameState.currentQuestion = null;
    gameState.correctAnswer = null;
    gameState.options = [];
    gameState.timeRemaining = gameState.timeLimit;
    gameState.isTransitioning = false;
    gameState.usedQuestions.clear(); // Clear used questions when resetting game
    
    // Clear any pending timeouts
    gameState.pendingTimeouts.forEach(timeout => clearTimeout(timeout));
    gameState.pendingTimeouts = [];
    
    // Clear timer interval
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});
