// Learn Arithmetic Game

// Game state
const gameState = {
    currentScreen: 'selection',
    selectedOperations: new Set(),  // Back to multiple operations
    selectedNumbers: new Set(),
    excludedNumbers: new Set(),  // Add this line
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
        operations: new Set(),  // Back to multiple operations
        numbers: new Set()
    },
    usedQuestions: new Set()
};

// Constants
const CONSTANTS = {
    TIMER_INTERVAL: 100,
    LOW_TIME_THRESHOLD: 3,
    TRANSITION_DELAY: 1500,
    ANSWER_OPTIONS: 4,
    MIN_MULTIPLIER: 1,
    MAX_MULTIPLIER: 10, // Changed from 12 to 10
    MAX_ATTEMPTS: 100 // Add this line
};

// Operation symbols and names
const OPERATION_SYMBOLS = {
    'addition': '+',
    'subtraction': '−',
    'multiplication': '×'
};

const OPERATION_NAMES = {
    'addition': 'Addition',
    'subtraction': 'Subtraction',
    'multiplication': 'Multiplication'
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
const numberExcludes = document.querySelectorAll('.number-exclude');
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

// UI Manager class
const UIManager = {
    resetAnswerButtons() {
        answerButtons.forEach(button => {
            button.className = 'answer-btn bg-white hover:bg-blue-100 text-blue-700 font-semibold py-3 px-6 border border-blue-500 rounded-lg shadow-md transition duration-200 transform hover:scale-105 active:scale-95';
        });
    },
    
    highlightCorrectAnswer(correctAnswer) {
        answerButtons.forEach(button => {
            if (parseInt(button.textContent) === correctAnswer) {
                button.classList.add('bg-green-200', 'text-green-800');
            }
        });
    },
    
    updateFeedback(message, isError = false) {
        if (feedbackDisplay) {
            feedbackDisplay.textContent = message;
            feedbackDisplay.className = `text-center text-lg font-bold mb-4 ${isError ? 'text-red-600' : 'text-green-600'}`;
            feedbackDisplay.classList.remove('hidden');
        }
    },
    
    hideFeedback() {
        if (feedbackDisplay) {
            feedbackDisplay.classList.add('hidden');
        }
    }
};

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
    while (gameState.pendingTimeouts.length > 0) {
        clearTimeout(gameState.pendingTimeouts.pop());
    }

    // Reset game state
    gameState.currentQuestion = null;
    gameState.correctAnswer = null;
    gameState.options = [];
    gameState.usedQuestions.clear(); // Clear used questions when stopping game
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
            if (gameState.selectedOperations.has(operation)) {
                gameState.selectedOperations.delete(operation);
                button.classList.remove('selected');
            } else {
                gameState.selectedOperations.add(operation);
                button.classList.add('selected');
            }
        });
    });
    
    // Initialize number buttons and exclusion checkboxes
    numberButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Ignore clicks on the checkbox
            if (e.target.type === 'checkbox') return;
            
            // Don't allow selection if number is excluded
            const number = parseInt(button.dataset.number);
            if (gameState.excludedNumbers.has(number)) {
                return;
            }
            
            button.classList.toggle('selected');
            if (button.classList.contains('selected')) {
                gameState.selectedNumbers.add(number);
                // If number is selected, it can't be excluded
                const checkbox = button.querySelector('.number-exclude');
                checkbox.checked = false;
                gameState.excludedNumbers.delete(number);
            } else {
                gameState.selectedNumbers.delete(number);
            }
        });
    });

    // Initialize exclusion checkboxes
    numberExcludes.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the button click
            const numberBtn = button.closest('.number-btn');
            const number = parseInt(numberBtn.dataset.number);
            
            // Toggle excluded state
            if (button.classList.contains('bg-red-500')) {
                // Removing exclusion
                button.classList.remove('bg-red-500', 'opacity-100');
                button.classList.add('opacity-0');
                numberBtn.classList.remove('cursor-not-allowed', 'opacity-50');
                gameState.excludedNumbers.delete(number);
            } else {
                // Adding exclusion
                // If number is excluded, it can't be selected
                gameState.selectedNumbers.delete(number);
                numberBtn.classList.remove('selected');
                numberBtn.classList.add('cursor-not-allowed', 'opacity-50');
                button.classList.remove('opacity-0');
                button.classList.add('bg-red-500', 'opacity-100');
                gameState.excludedNumbers.add(number);
            }
        });
    });
    
    // Initialize start mixed button
    if (startMixedButton) {
        startMixedButton.addEventListener('click', () => {
            if (!gameState.selectedOperations.size && gameState.selectedNumbers.size === 0) {
                alert('Please select at least one operation and one number to practice!');
                return;
            }
            if (!gameState.selectedOperations.size) {
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
    if (gameState.lastSelections.operations.size > 0) {
        gameState.selectedOperations = new Set(gameState.lastSelections.operations);
        operationButtons.forEach(button => {
            const operation = button.getAttribute('data-operation');
            if (gameState.lastSelections.operations.has(operation)) {
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
    gameState.lastSelections.operations = new Set(gameState.selectedOperations);
    gameState.lastSelections.numbers = new Set(gameState.selectedNumbers);
    
    // Initialize game state
    gameState.score = 0;
    gameState.questionsAnswered = 0;
    gameState.questionsCorrect = 0;
    gameState.isTransitioning = false;
    
    // Update displays
    scoreDisplay.textContent = gameState.score;
    updateQuestionProgress();
    
    showScreen('game');
    
    // Generate first question without transition
    gameState.isTransitioning = false;
    generateQuestion();
    startTimer();
}

// Generate a new question
function generateQuestion() {
    console.log('Generate question called');
    console.log('Current used questions:', Array.from(gameState.usedQuestions));
    
    // Reset answer buttons first
    answerButtons.forEach(button => {
        button.className = 'answer-btn bg-white hover:bg-blue-100 text-blue-700 font-semibold py-3 px-6 border border-blue-500 rounded-lg shadow-md transition duration-200 transform hover:scale-105 active:scale-95';
    });

    // Get available numbers (selected numbers minus excluded numbers)
    const availableNumbers = Array.from(gameState.selectedNumbers)
        .filter(num => !gameState.excludedNumbers.has(num));

    console.log('Available numbers:', availableNumbers);

    if (availableNumbers.length === 0) {
        updateFeedback('Please select at least one number that is not excluded', true);
        return;
    }

    let num1, num2, answer;
    let questionKey;
    let attempts = 0;
    let validQuestion = false;
    
    // Randomly select one of the chosen operations
    const operations = Array.from(gameState.selectedOperations);
    const currentOperation = operations[Math.floor(Math.random() * operations.length)];
    
    // Check if we've used all possible questions
    const maxPossible = getMaxPossibleQuestions();
    console.log('Max possible questions:', maxPossible, 'Used questions:', gameState.usedQuestions.size);
    
    // Only clear if we've used ALL possible questions AND we've tried all combinations
    if (gameState.usedQuestions.size >= maxPossible && attempts >= CONSTANTS.MAX_ATTEMPTS) {
        console.log('All possible questions used and max attempts reached, clearing used questions');
        gameState.usedQuestions.clear();
        console.log('Used questions cleared, now:', Array.from(gameState.usedQuestions));
    }
    
    // Keep trying until we get a valid, unused question
    do {
        validQuestion = true;
        
        if (currentOperation === 'subtraction') {
            num1 = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
            num2 = Math.floor(Math.random() * (num1 + 1));
            // For subtraction, ensure num2 is not an excluded number if it's in the range of selected numbers
            if (num2 <= Math.max(...Array.from(gameState.selectedNumbers)) && gameState.excludedNumbers.has(num2)) {
                validQuestion = false;
                continue;
            }
            answer = num1 - num2;
            questionKey = `${num1}-${num2}`;
        } else if (currentOperation === 'multiplication') {
            // For multiplication, use one available number and one from 1-10
            num1 = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
            do {
                num2 = Math.floor(Math.random() * CONSTANTS.MAX_MULTIPLIER) + CONSTANTS.MIN_MULTIPLIER;
            } while (gameState.excludedNumbers.has(num2));
            
            answer = num1 * num2;
            // For multiplication, order doesn't matter, so always use smaller number first
            const min = Math.min(num1, num2);
            const max = Math.max(num1, num2);
            questionKey = `${min}×${max}`;
            // Keep original order for display
            if (min !== num1) {
                [num1, num2] = [num2, num1];
            }
        } else {
            // For addition, both numbers must be from available numbers
            num1 = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
            num2 = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
            answer = num1 + num2;
            // For addition, order doesn't matter
            questionKey = `${Math.min(num1, num2)}+${Math.max(num1, num2)}`;
        }
        
        console.log('Trying question:', questionKey, 'Used?', gameState.usedQuestions.has(questionKey));
        
        attempts++;
    } while ((gameState.usedQuestions.has(questionKey) || !validQuestion) && attempts < CONSTANTS.MAX_ATTEMPTS);

    // If we couldn't find a valid question after max attempts, clear used questions and try again
    if (attempts >= CONSTANTS.MAX_ATTEMPTS) {
        console.log('Max attempts reached without finding valid question, clearing used questions');
        gameState.usedQuestions.clear();
        generateQuestion();
        return;
    }
    
    // Mark this question as used
    gameState.usedQuestions.add(questionKey);
    console.log('Added question to used:', questionKey);
    console.log('Updated used questions:', Array.from(gameState.usedQuestions));
    
    // Store current question info
    gameState.currentQuestion = { num1, num2, operation: currentOperation };
    gameState.correctAnswer = answer;

    // Update the question display
    questionDisplay.textContent = `${num1} ${OPERATION_SYMBOLS[currentOperation]} ${num2} = ?`;
    currentOperationDisplay.textContent = OPERATION_NAMES[currentOperation];

    // Generate options
    gameState.options = generateOptions(answer, currentOperation);

    // Update answer buttons
    gameState.options.forEach((option, index) => {
        answerButtons[index].textContent = option;
    });
}

// Helper function to calculate maximum possible unique questions
function getMaxPossibleQuestions() {
    const numbers = Array.from(gameState.selectedNumbers)
        .filter(num => !gameState.excludedNumbers.has(num));
    const currentOperation = Array.from(gameState.selectedOperations)[0];
    
    if (currentOperation === 'multiplication') {
        // For multiplication, each available number can be paired with numbers 1-10
        // But we need to account for commutative property (4x5 is same as 5x4)
        return numbers.length * 10; 
    } else if (currentOperation === 'subtraction') {
        // For subtraction, each selected number can be paired with numbers 0 to itself
        let total = 0;
        numbers.forEach(n => {
            total += n + 1; // +1 because we include 0
        });
        return total;
    } else { // addition
        // For addition, it's combinations of available numbers
        // Account for commutative property (4+5 is same as 5+4)
        return (numbers.length * (numbers.length + 1)) / 2;
    }
}

// Update the question progress display
function updateQuestionProgress() {
    questionProgressDisplay.textContent = `${gameState.questionsAnswered + 1}/${gameState.totalQuestions}`;
}

// Start the timer
function startTimer() {
    // Don't start a new timer if we're transitioning
    if (gameState.isTransitioning) return;

    const totalTime = gameState.timeLimit * 1000;
    gameState.timeRemaining = gameState.timeLimit;
    
    // Clear any existing timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    const startTime = Date.now();
    updateTimer(totalTime, totalTime);
    
    gameState.timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = totalTime - elapsed;
        const seconds = Math.ceil(remaining / 1000);
        
        if (remaining <= 0) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
            timeUp();
        } else {
            if (seconds !== gameState.timeRemaining) {
                gameState.timeRemaining = seconds;
                updateTimer(remaining, totalTime);
                if (seconds <= CONSTANTS.LOW_TIME_THRESHOLD) {
                    playSoundSafely(timerTickSound);
                }
            }
        }
    }, CONSTANTS.TIMER_INTERVAL);
}

// Update timer display and bar
function updateTimer(timeRemaining, totalTime) {
    if (timerDisplay) {
        timerDisplay.textContent = Math.ceil(timeRemaining / 1000);
    }
    if (timerBar) {
        const percentage = Math.max(0, Math.min(100, (timeRemaining / totalTime) * 100));
        timerBar.style.width = `${percentage}%`;
        
        // Update color based on time remaining
        if (Math.ceil(timeRemaining / 1000) <= CONSTANTS.LOW_TIME_THRESHOLD) {
            timerBar.classList.add('bg-red-500');
            timerBar.classList.remove('bg-blue-500');
        } else {
            timerBar.classList.add('bg-blue-500');
            timerBar.classList.remove('bg-red-500');
        }
    }
}

// Handle time's up
function timeUp() {
    if (gameState.isTransitioning) return;
    
    gameState.isTransitioning = true;
    
    // Clear and nullify timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    playSoundSafely(wrongSound);
    
    // Show correct answer
    answerButtons.forEach(button => {
        const buttonAnswer = parseInt(button.textContent);
        if (buttonAnswer === gameState.correctAnswer) {
            button.className = 'answer-btn bg-green-200 text-green-800 font-semibold py-3 px-6 border border-green-500 rounded-lg shadow-md transition duration-200';
        }
    });
    
    if (feedbackDisplay) {
        feedbackDisplay.textContent = 'Time\'s up!';
        feedbackDisplay.className = 'text-center text-lg font-bold mb-4 text-red-600';
        feedbackDisplay.classList.remove('hidden');
    }
    
    const timeout = setTimeout(() => {
        if (gameState.questionsAnswered < gameState.totalQuestions - 1) {
            gameState.questionsAnswered++;
            updateQuestionProgress();
            
            // Clear feedback
            if (feedbackDisplay) {
                feedbackDisplay.classList.add('hidden');
            }
            
            // Reset and clear all answer buttons
            answerButtons.forEach(button => {
                button.textContent = '';  
                button.className = 'answer-btn bg-white hover:bg-blue-100 text-blue-700 font-semibold py-3 px-6 border border-blue-500 rounded-lg shadow-md transition duration-200 transform hover:scale-105 active:scale-95';
            });
            
            // Clear the question display
            questionDisplay.textContent = '';
            currentOperationDisplay.textContent = '';
            
            // Show next question
            showNextQuestion();
        } else {
            showResults();
        }
    }, CONSTANTS.TRANSITION_DELAY);
    
    // Track the timeout
    gameState.pendingTimeouts.push(timeout);
}

// Function to prepare and show next question
function showNextQuestion() {
    console.log('Showing next question...');
    
    // Clear all pending timeouts
    while (gameState.pendingTimeouts.length > 0) {
        clearTimeout(gameState.pendingTimeouts.pop());
    }
    
    // Clear timer interval
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    // Reset game state but keep used questions
    gameState.currentQuestion = null;
    gameState.correctAnswer = null;
    gameState.options = [];
    gameState.isTransitioning = false;
    
    // Clear UI first
    questionDisplay.textContent = '';
    currentOperationDisplay.textContent = '';
    answerButtons.forEach(button => {
        button.textContent = '';
        button.className = 'answer-btn bg-white hover:bg-blue-100 text-blue-700 font-semibold py-3 px-6 border border-blue-500 rounded-lg shadow-md transition duration-200 transform hover:scale-105 active:scale-95';
    });
    
    // Force a browser reflow to ensure UI is cleared
    void questionDisplay.offsetHeight;
    
    // Now generate new question
    console.log('Generating new question...');
    generateQuestion();
    
    // Start timer
    console.log('Starting timer...');
    startTimer();
}

// Check the player's answer
function checkAnswer(playerAnswer) {
    if (gameState.isTransitioning) return;
    
    // Clear all pending timeouts
    while (gameState.pendingTimeouts.length > 0) {
        clearTimeout(gameState.pendingTimeouts.pop());
    }
    
    gameState.isTransitioning = true;
    
    // Clear and nullify timer
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    const isCorrect = playerAnswer === gameState.correctAnswer;
    
    // Update button styles
    answerButtons.forEach(button => {
        const buttonAnswer = parseInt(button.textContent);
        if (buttonAnswer === gameState.correctAnswer) {
            button.className = 'answer-btn bg-green-200 text-green-800 font-semibold py-3 px-6 border border-green-500 rounded-lg shadow-md transition duration-200';
        } else if (buttonAnswer === playerAnswer && !isCorrect) {
            button.className = 'answer-btn bg-red-500 text-white font-semibold py-3 px-6 border border-red-600 rounded-lg shadow-md transition duration-200';
        }
    });
    
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
    
    const timeout = setTimeout(() => {
        if (gameState.questionsAnswered < gameState.totalQuestions - 1) {
            gameState.questionsAnswered++;
            updateQuestionProgress();
            
            // Clear feedback
            if (feedbackDisplay) {
                feedbackDisplay.classList.add('hidden');
            }
            
            // Reset and clear all answer buttons
            answerButtons.forEach(button => {
                button.textContent = '';  
                button.className = 'answer-btn bg-white hover:bg-blue-100 text-blue-700 font-semibold py-3 px-6 border border-blue-500 rounded-lg shadow-md transition duration-200 transform hover:scale-105 active:scale-95';
            });
            
            // Clear the question display
            questionDisplay.textContent = '';
            currentOperationDisplay.textContent = '';
            
            // Show next question
            showNextQuestion();
        } else {
            showResults();
        }
    }, CONSTANTS.TRANSITION_DELAY);
    
    // Track the timeout
    gameState.pendingTimeouts.push(timeout);
}

// Show results
function showResults() {
    showScreen('results');
    
    const accuracy = Math.round((gameState.questionsCorrect / gameState.totalQuestions) * 100);
    const timeBonus = Math.round(gameState.score / gameState.totalQuestions);
    
    resultsContent.innerHTML = `
        <div class="text-2xl font-bold mb-4">Game Over!</div>
        <div class="text-xl mb-2">Score: ${gameState.score}</div>
        <div class="text-lg mb-2">Accuracy: ${accuracy}%</div>
        <div class="text-lg mb-4">Average Time Bonus: ${timeBonus}</div>
    `;
    
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
    // Clear all game state
    gameState.score = 0;
    gameState.questionsAnswered = 0;
    gameState.questionsCorrect = 0;
    gameState.currentQuestion = null;
    gameState.correctAnswer = null;
    gameState.options = [];
    gameState.usedQuestions.clear(); // Clear used questions on reset
    gameState.isTransitioning = false;
    
    // Clear timer if running
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
    
    // Clear any pending timeouts
    while (gameState.pendingTimeouts.length > 0) {
        clearTimeout(gameState.pendingTimeouts.pop());
    }

    // Reset UI elements
    scoreDisplay.textContent = '0';
    questionDisplay.textContent = '';
    currentOperationDisplay.textContent = '';
    updateQuestionProgress();
    
    // Reset answer buttons
    answerButtons.forEach(button => {
        button.textContent = '';
        button.className = 'answer-btn bg-white hover:bg-blue-100 text-blue-700 font-semibold py-3 px-6 border border-blue-500 rounded-lg shadow-md transition duration-200';
    });
    
    // Reset timer bar
    timerBar.style.width = '100%';
    timerBar.classList.remove('bg-red-500');
    timerBar.classList.add('bg-blue-500');
}

// Generate answer options for a question
function generateOptions(correctAnswer, operation) {
    const usedAnswers = new Set([correctAnswer]);
    const options = [correctAnswer];

    // Generate wrong answers within a reasonable range
    while (options.length < CONSTANTS.ANSWER_OPTIONS) {
        let wrongAnswer;
        if (operation === 'multiplication') {
            // For multiplication, use nearby multiples
            const diff = Math.floor(Math.random() * 5) - 2; // -2 to +2
            wrongAnswer = correctAnswer + (diff * Math.max(1, Math.floor(correctAnswer / 10)));
        } else {
            // For addition/subtraction, use nearby numbers
            const diff = Math.floor(Math.random() * 5) + 1;
            wrongAnswer = correctAnswer + (Math.random() < 0.5 ? diff : -diff);
        }
        
        // Ensure wrong answer is positive and not already used
        if (wrongAnswer >= 0 && !usedAnswers.has(wrongAnswer)) {
            options.push(wrongAnswer);
            usedAnswers.add(wrongAnswer);
        }
    }

    // Shuffle options
    return options.sort(() => Math.random() - 0.5);
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});
