// Learn Arithmetic Game

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

// Audio elements
const correctSound = document.getElementById('correct-sound');
const wrongSound = document.getElementById('wrong-sound');
const timerTickSound = document.getElementById('timer-tick');
const soundToggleButton = document.getElementById('sound-toggle');
const soundOnIcon = document.getElementById('sound-on-icon');
const soundOffIcon = document.getElementById('sound-off-icon');

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

// Function to initialize audio
function initAudio() {
    const audioInitButton = document.getElementById('enable-audio');
    const audioInitContainer = document.getElementById('audio-init-container');
    
    const enableAudio = () => {
        if (audioInitContainer) {
            audioInitContainer.style.display = 'none';
        }
        
        [correctSound, wrongSound, timerTickSound].forEach(sound => {
            if (sound) {
                const originalVolume = sound.volume;
                sound.volume = 0;
                const promise = sound.play();
                if (promise !== undefined) {
                    promise.then(() => {
                        sound.pause();
                        sound.currentTime = 0;
                        sound.volume = originalVolume;
                    }).catch(() => {
                        sound.volume = originalVolume;
                    });
                }
            }
        });
        
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('keydown', enableAudio);
        if (audioInitButton) {
            audioInitButton.removeEventListener('click', enableAudio);
        }
        
        try {
            sessionStorage.setItem('audioInitialized', 'true');
        } catch (e) {}
        
        console.log('Audio initialized');
    };
    
    if (audioInitButton) {
        audioInitButton.addEventListener('click', enableAudio);
    }
    
    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);
    
    try {
        if (sessionStorage.getItem('audioInitialized') === 'true' && audioInitContainer) {
            audioInitContainer.style.display = 'none';
        }
    } catch (e) {}
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

// Initialize the game
function initGame() {
    // Initialize audio and sound toggle
    initAudio();
    initSoundToggle();
    
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
    const maxAttempts = 100; // Prevent infinite loop
    
    do {
        if (gameState.selectedOperation === 'subtraction') {
            // For subtraction, use one of the selected numbers as minuend
            num1 = numbers[Math.floor(Math.random() * numbers.length)];
            // Generate a random number less than or equal to num1
            num2 = Math.floor(Math.random() * (num1 + 1));
            answer = num1 - num2;
        } else if (gameState.selectedOperation === 'multiplication') {
            // For multiplication, ensure at least one number is from selection
            // and the other can be any number from 1 to 12
            if (Math.random() < 0.5) {
                // Use selected number as first number
                num1 = numbers[Math.floor(Math.random() * numbers.length)];
                num2 = Math.floor(Math.random() * 12) + 1; // Random number 1-12
            } else {
                // Use selected number as second number
                num1 = Math.floor(Math.random() * 12) + 1; // Random number 1-12
                num2 = numbers[Math.floor(Math.random() * numbers.length)];
            }
            answer = num1 * num2;
        } else {
            // Addition remains the same
            num1 = numbers[Math.floor(Math.random() * numbers.length)];
            num2 = numbers[Math.floor(Math.random() * numbers.length)];
            answer = num1 + num2;
        }
        
        // Create a unique key for this question
        // For multiplication, order doesn't matter (2×3 is same as 3×2)
        if (gameState.selectedOperation === 'multiplication') {
            questionKey = [Math.min(num1, num2), Math.max(num1, num2), gameState.selectedOperation].join(',');
        } else {
            questionKey = [num1, num2, gameState.selectedOperation].join(',');
        }
        
        attempts++;
        // If we've tried too many times to find a unique question,
        // clear the used questions set and start over
        if (attempts >= maxAttempts) {
            gameState.usedQuestions.clear();
            attempts = 0;
        }
    } while (gameState.usedQuestions.has(questionKey) && gameState.usedQuestions.size < getMaxPossibleQuestions());
    
    // Add this question to used questions
    gameState.usedQuestions.add(questionKey);
    
    gameState.currentQuestion = {
        num1: num1,
        num2: num2,
        operation: gameState.selectedOperation
    };
    gameState.correctAnswer = answer;
    
    // Generate options
    const options = new Set([answer]);
    while (options.size < 4) {
        let wrongAnswer;
        if (gameState.selectedOperation === 'addition') {
            wrongAnswer = answer + (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
        } else if (gameState.selectedOperation === 'subtraction') {
            wrongAnswer = answer + (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
        } else { // multiplication
            wrongAnswer = answer + (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * (answer / 2)));
        }
        if (wrongAnswer >= 0) {
            options.add(wrongAnswer);
        }
    }
    
    gameState.options = Array.from(options).sort((a, b) => a - b);
    
    // Update UI
    const operationSymbol = {
        'addition': '+',
        'subtraction': '−',
        'multiplication': '×'
    }[gameState.selectedOperation];
    
    questionDisplay.textContent = `${num1} ${operationSymbol} ${num2} = ?`;
    currentOperationDisplay.textContent = operationSymbol;
    
    // Update answer buttons
    const shuffledOptions = [...gameState.options].sort(() => Math.random() - 0.5);
    answerButtons.forEach((button, index) => {
        button.textContent = shuffledOptions[index];
    });
}

// Helper function to calculate maximum possible unique questions
function getMaxPossibleQuestions() {
    const numbers = Array.from(gameState.selectedNumbers);
    
    if (gameState.selectedOperation === 'multiplication') {
        // For multiplication, each selected number can be paired with numbers 1-12
        return numbers.length * 12;
    } else if (gameState.selectedOperation === 'subtraction') {
        // For subtraction, each selected number can be paired with numbers 0 to itself
        let total = 0;
        numbers.forEach(n => {
            total += n + 1; // +1 because we include 0
        });
        return total;
    } else { // addition
        // For addition, it's the number of possible combinations of selected numbers
        return numbers.length * numbers.length;
    }
}

// Update the question progress display
function updateQuestionProgress() {
    questionProgressDisplay.textContent = `${gameState.questionsAnswered + 1}/${gameState.totalQuestions}`;
}

// Start the timer
function startTimer() {
    gameState.timeRemaining = gameState.timeLimit;
    timerDisplay.textContent = gameState.timeRemaining;
    timerBar.style.width = '100%';
    
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    const startTime = Date.now();
    const totalTime = gameState.timeLimit * 1000;
    
    gameState.timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = totalTime - elapsed;
        
        if (remaining <= 0) {
            timeUp();
        } else {
            const seconds = Math.ceil(remaining / 1000);
            if (seconds !== gameState.timeRemaining) {
                gameState.timeRemaining = seconds;
                timerDisplay.textContent = seconds;
                if (seconds <= 3) {
                    playSoundSafely(timerTickSound);
                }
            }
            timerBar.style.width = `${(remaining / totalTime) * 100}%`;
        }
    }, 100);
}

// Handle time's up
function timeUp() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    playSoundSafely(wrongSound);
    
    if (feedbackDisplay) {
        feedbackDisplay.textContent = 'Time\'s up!';
        feedbackDisplay.className = 'text-center text-lg font-bold mb-4 text-red-600';
        feedbackDisplay.classList.remove('hidden');
    }
    
    gameState.isTransitioning = true;
    
    setTimeout(() => {
        if (gameState.questionsAnswered < gameState.totalQuestions - 1) {
            gameState.questionsAnswered++;
            updateQuestionProgress();
            generateQuestion();
            startTimer();
            if (feedbackDisplay) {
                feedbackDisplay.classList.add('hidden');
            }
        } else {
            showResults();
        }
        gameState.isTransitioning = false;
    }, 1500);
}

// Check the player's answer
function checkAnswer(playerAnswer) {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    const isCorrect = playerAnswer === gameState.correctAnswer;
    
    if (isCorrect) {
        gameState.score += Math.ceil(gameState.timeRemaining);
        gameState.questionsCorrect++;
        scoreDisplay.textContent = gameState.score;
        playSoundSafely(correctSound);
        
        if (feedbackDisplay) {
            feedbackDisplay.textContent = 'Correct!';
            feedbackDisplay.className = 'text-center text-lg font-bold mb-4 text-green-600';
            feedbackDisplay.classList.remove('hidden');
        }
    } else {
        playSoundSafely(wrongSound);
        
        if (feedbackDisplay) {
            feedbackDisplay.textContent = `Wrong! The answer was ${gameState.correctAnswer}`;
            feedbackDisplay.className = 'text-center text-lg font-bold mb-4 text-red-600';
            feedbackDisplay.classList.remove('hidden');
        }
    }
    
    gameState.isTransitioning = true;
    
    setTimeout(() => {
        if (gameState.questionsAnswered < gameState.totalQuestions - 1) {
            gameState.questionsAnswered++;
            updateQuestionProgress();
            generateQuestion();
            startTimer();
            if (feedbackDisplay) {
                feedbackDisplay.classList.add('hidden');
            }
        } else {
            showResults();
        }
        gameState.isTransitioning = false;
    }, 1500);
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
        
        // Remove confetti after animation
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 5000);
    }
}

// Complete game reset function
function resetGame() {
    // Clear all intervals and timeouts
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    
    gameState.pendingTimeouts.forEach(timeout => clearTimeout(timeout));
    gameState.pendingTimeouts = [];
    
    // Reset game state
    gameState.score = 0;
    gameState.questionsAnswered = 0;
    gameState.questionsCorrect = 0;
    gameState.isTransitioning = false;
    
    // Reset UI elements
    if (scoreDisplay) scoreDisplay.textContent = '0';
    if (timerDisplay) timerDisplay.textContent = gameState.timeLimit;
    if (timerBar) timerBar.style.width = '100%';
    if (feedbackDisplay) feedbackDisplay.classList.add('hidden');
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});
