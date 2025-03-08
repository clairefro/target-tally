document.addEventListener("DOMContentLoaded", () => {
  let recognition = null;
  let isListening = false;

  // DOM Elements
  const elements = initializeElements();

  // Game state
  const state = initializeGameState();

  // Arrow values mapping
  const arrowValues = initializeArrowValues();

  // Possible arrow scores
  const possibleArrows = [
    "M",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "X",
  ];

  // Hide UI elements initially
  hideInitialElements();

  // Set up event listeners
  setupEventListeners();
  //   initSpeechRecognition();

  /*** INITIALIZATION FUNCTIONS ***/

  function initializeElements() {
    return {
      gameSelection: document.querySelector(".game-selection"),
      gameScreen: document.querySelector(".game-screen"),
      countdownScreen: document.querySelector(".countdown-screen"),
      gameOverScreen: document.querySelector(".game-over"),
      scoreTallyScreen: document.getElementById("score-tally-screen"),
      scoreTallyBtn: document.getElementById("score-tally-btn"),
      arrowCallingBtn: document.getElementById("arrow-calling-btn"),
      startRoundBtn: document.getElementById("start-round-btn"),
      currentRoundSpan: document.getElementById("current-round"),
      stopwatchDisplay: document.getElementById("stopwatch"),
      arrowsDisplay: document.getElementById("arrows-display"),
      inputDisplay: document.getElementById("input-display"),
      feedbackDisplay: document.getElementById("feedback"),
      countdownDisplay: document.getElementById("countdown"),
      backspaceBtn: document.getElementById("backspace-btn"),
      submitBtn: document.getElementById("submit-btn"),
      playAgainBtn: document.getElementById("play-again-btn"),
      numBtns: document.querySelectorAll(".num-btn"),
      numberpad: document.querySelector(".numberpad"),
      resultsTable: document.getElementById("results-table"),
      resultsBody: document.getElementById("results-body"),
      finalScore: document.getElementById("final-score"),
      micBtn: document.getElementById("mic-btn"),
    };
  }

  function initializeGameState() {
    return {
      gameType: "",
      currentRound: 0,
      totalRounds: 10,
      gameActive: false,
      roundActive: false,
      countdown: 3,
      countdownTimer: null,
      stopwatchTime: 0,
      stopwatchInterval: null,
      currentArrows: [],
      correctSum: 0,
      userInput: "",
      gameResults: [],
      gameStarted: false,
    };
  }

  function initializeArrowValues() {
    return {
      M: 0,
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      10: 10,
      X: 10,
    };
  }

  function hideInitialElements() {
    elements.startRoundBtn.style.display = "none";
    elements.numberpad.style.display = "none";
  }

  function setupEventListeners() {
    elements.scoreTallyBtn.addEventListener("click", () =>
      initGame("Score Tally")
    );
    elements.arrowCallingBtn.addEventListener("click", () =>
      initGame("Arrow Calling")
    );
    elements.startRoundBtn.addEventListener("click", startRound);

    elements.numBtns.forEach((btn) => {
      btn.addEventListener("click", () => handleUserInput(btn.dataset.value));
    });

    elements.backspaceBtn.addEventListener("click", handleBackspace);
    elements.submitBtn.addEventListener("click", submitAnswer);
    elements.playAgainBtn.addEventListener("click", handlePlayAgain);
    elements.micBtn.addEventListener("click", toggleSpeechRecognition);
  }

  /*** SCORING FUNCTIONS ***/

  // Calculate accuracy coefficient for a given difference
  function calculateAccuracyCoefficient(isCorrect, difference) {
    if (isCorrect) return 1;
    if (difference === 1) return 0.75;
    if (difference === 2) return 0.5;
    if (difference === 3) return 0.25;
    return 0; // More than 3 off
  }

  // Calculate speed coefficient for a given time in seconds
  function calculateSpeedCoefficient(timeInSeconds) {
    if (timeInSeconds <= 2.0) {
      // Maximum speed coefficient if time is 2.0 seconds or less
      return 1;
    } else {
      // LINEAR decay for times > 2.0 seconds
      // Formula: 1 - min(1, (timeInSeconds - 2.0) / 6)
      const linearDecay = (timeInSeconds - 2.0) / 6;
      return Math.max(0, 1 - Math.min(1, linearDecay));
    }
  }

  /*** GAME MANAGEMENT FUNCTIONS ***/

  // Reset all game-related elements and states
  function resetGame() {
    // Reset UI elements
    resetUIElements();

    // Clear timers
    clearTimers();

    // Reset game states
    resetGameState();
  }

  function resetUIElements() {
    elements.scoreTallyScreen.style.display = "none";
    elements.numberpad.style.display = "none";
    elements.inputDisplay.textContent = "";
    elements.arrowsDisplay.textContent = "";
    elements.feedbackDisplay.textContent = "";
    elements.feedbackDisplay.className = "feedback";
    elements.feedbackDisplay.style.display = "block";
    elements.feedbackDisplay.style.visibility = "hidden";
    elements.stopwatchDisplay.textContent = "00:00:000";
  }

  function clearTimers() {
    if (state.countdownTimer) {
      clearInterval(state.countdownTimer);
    }
    if (state.stopwatchInterval) {
      clearInterval(state.stopwatchInterval);
    }
  }

  function resetGameState() {
    state.currentRound = 0;
    state.gameResults = [];
    state.userInput = "";
    state.currentArrows = [];
    state.correctSum = 0;
    state.stopwatchTime = 0;
    state.roundActive = false;
    state.gameStarted = false;
  }

  function prepTallyScoreGame() {
    elements.scoreTallyScreen.style.display = "block";
  }

  // Game initialization
  function initGame(type) {
    resetGame();

    state.gameType = type;
    state.gameActive = true;

    // Update UI
    updateUIForGameStart();

    // Prepare for first round
    state.currentRound = 1;
    elements.currentRoundSpan.textContent = state.currentRound;
  }

  function updateUIForGameStart() {
    // Hide game selection, show game screen
    elements.gameSelection.classList.remove("active");
    elements.gameScreen.classList.add("active");

    // Update game type title
    elements.startRoundBtn.style.display = "block";
    document.getElementById("game-type-title").textContent = state.gameType;
  }

  /*** ROUND MANAGEMENT FUNCTIONS ***/

  // Prepare for the next round
  function prepareNextRound() {
    resetRoundElements();

    state.currentRound++;
    elements.currentRoundSpan.textContent = state.currentRound;

    // Check if we've reached the end of the game
    if (state.currentRound <= state.totalRounds) {
      startCountdown();
    } else {
      endGame();
    }
  }

  function resetRoundElements() {
    elements.inputDisplay.textContent = "";
    elements.feedbackDisplay.textContent = "";
    elements.feedbackDisplay.className = "feedback";
    elements.feedbackDisplay.style.visibility = "hidden";
    state.userInput = "";
  }

  // Start a round (initial button press)
  function startRound() {
    prepTallyScoreGame();
    state.gameStarted = true;
    elements.startRoundBtn.style.display = "none";
    startCountdown();
  }

  // Start the countdown for a round
  function startCountdown() {
    state.countdown = 3;
    elements.countdownScreen.classList.add("active");
    elements.countdownDisplay.textContent = state.countdown;

    state.countdownTimer = setInterval(updateCountdown, 1000);
  }

  function updateCountdown() {
    state.countdown--;
    updateCountdownDisplay();

    if (state.countdown <= 0) {
      clearInterval(state.countdownTimer);

      // Add a slight delay before hiding to allow the final animation to complete
      setTimeout(() => {
        elements.countdownScreen.classList.remove("active");
        startRoundActive();
      }, 500);
    }
  }

  function updateCountdownDisplay() {
    // Clear existing content
    elements.countdownDisplay.textContent = "";

    // For "Go!" message when countdown reaches 0
    const displayText = state.countdown === 0 ? "Go!" : state.countdown;

    // Create a new animated number/text
    const countdownElement = document.createElement("div");
    countdownElement.textContent = displayText;
    countdownElement.className = "countdown-number animate-countdown";
    // Add the animated element to the display
    elements.countdownDisplay.appendChild(countdownElement);
  }

  // Start active round after countdown
  function startRoundActive() {
    state.roundActive = true;

    // Set up for Score Tally mode
    if (state.gameType === "Score Tally") {
      setupScoreTallyRound();
    }
  }

  function setupScoreTallyRound() {
    elements.numberpad.style.display = "grid";
    generateArrows();
    displayArrows();
    resetInput();
    startStopwatch();
  }

  function resetInput() {
    state.userInput = "";
    elements.inputDisplay.textContent = "";
    elements.feedbackDisplay.textContent = "";
    elements.feedbackDisplay.style.visibility = "hidden";

    if (isListening && recognition) {
      recognition.stop();
    }
  }

  function startStopwatch() {
    state.stopwatchTime = 0;
    updateStopwatch();
    state.stopwatchInterval = setInterval(updateStopwatch, 10);
  }

  /*** ARROW FUNCTIONS ***/

  // Generate random arrows for Score Tally
  function generateArrows() {
    state.currentArrows = [];
    state.correctSum = 0;

    // Generate 3 random arrows
    for (let i = 0; i < 3; i++) {
      const arrow = getRandomArrow();
      state.currentArrows.push(arrow);
      state.correctSum += arrowValues[arrow];
    }
    state.currentArrows.sort((a, b) => {
      // Define arrow rank order (X is highest, M is lowest)
      const arrowRank = {
        X: 12,
        10: 11,
        9: 10,
        8: 9,
        7: 8,
        6: 7,
        5: 6,
        4: 5,
        3: 4,
        2: 3,
        1: 2,
        M: 1,
      };

      // Sort in descending order (highest to lowest)
      return arrowRank[b] - arrowRank[a];
    });
  }

  function getRandomArrow() {
    return possibleArrows[Math.floor(Math.random() * possibleArrows.length)];
  }

  // Display arrows on screen
  function displayArrows() {
    elements.arrowsDisplay.textContent = state.currentArrows.join(" - ");
  }

  /*** TIMER FUNCTIONS ***/

  // Update stopwatch display
  function updateStopwatch() {
    state.stopwatchTime += 10;
    elements.stopwatchDisplay.textContent = formatTime(state.stopwatchTime);
  }

  function formatTime(time) {
    const milliseconds = time % 1000;
    const seconds = Math.floor(time / 1000) % 60;
    const minutes = Math.floor(time / (1000 * 60));

    return (
      (minutes < 10 ? "0" + minutes : minutes) +
      ":" +
      (seconds < 10 ? "0" + seconds : seconds) +
      ":" +
      (milliseconds < 10
        ? "00" + milliseconds
        : milliseconds < 100
        ? "0" + milliseconds
        : milliseconds)
    );
  }

  /*** USER INPUT FUNCTIONS ***/

  // Handle user input for Score Tally
  function handleUserInput(value) {
    if (state.roundActive) {
      state.userInput += value;
      elements.inputDisplay.textContent = state.userInput;
    }
  }

  // Handle backspace for Score Tally
  function handleBackspace() {
    if (state.roundActive && state.userInput.length > 0) {
      state.userInput = state.userInput.slice(0, -1);
      elements.inputDisplay.textContent = state.userInput;
    }
  }

  // Handle Play Again button click
  function handlePlayAgain() {
    resetGame();
    elements.gameOverScreen.classList.remove("active");
    elements.gameSelection.classList.add("active");
  }

  // Submit answer for Score Tally
  function submitAnswer() {
    if (state.roundActive && state.userInput !== "") {
      stopRoundTimers();
      state.roundActive = false;

      if (isListening && recognition) {
        recognition.stop();
      }

      const userAnswer = processUserAnswer();
      showFeedback(userAnswer);

      // Schedule next round
      setTimeout(() => {
        if (state.currentRound < state.totalRounds) {
          prepareNextRound();
        } else {
          endGame();
        }
      }, 2000);
    }
  }

  function stopRoundTimers() {
    clearInterval(state.stopwatchInterval);
  }

  function processUserAnswer() {
    const userSum = parseInt(state.userInput);
    const isCorrect = userSum === state.correctSum;
    const difference = Math.abs(userSum - state.correctSum);
    const timeInSeconds = state.stopwatchTime / 1000;

    // Calculate coefficients using reusable functions
    const accuracyCoefficient = calculateAccuracyCoefficient(
      isCorrect,
      difference
    );
    const speedCoefficient = calculateSpeedCoefficient(timeInSeconds);

    // Store result with coefficients
    state.gameResults.push({
      round: state.currentRound,
      arrows: state.currentArrows.join("-"),
      userAnswer: userSum,
      correctAnswer: state.correctSum,
      time: state.stopwatchTime,
      correct: isCorrect,
      difference: difference,
      accuracyCoefficient: accuracyCoefficient,
      speedCoefficient: speedCoefficient,
    });

    return { isCorrect, difference };
  }

  function showFeedback(answer) {
    elements.feedbackDisplay.style.visibility = "visible";
    if (answer.isCorrect) {
      elements.feedbackDisplay.textContent = "✓ Correct!";
      elements.feedbackDisplay.className = "feedback correct";
    } else {
      elements.feedbackDisplay.textContent = `✗ Incorrect. Correct answer: ${state.correctSum}`;
      elements.feedbackDisplay.className = "feedback incorrect";
    }
  }

  /*** GAME ENDING FUNCTIONS ***/

  // End game and show results
  function endGame() {
    updateGameStateOnEnd();
    showGameOverScreen();
    displayFinalResults();
  }

  function updateGameStateOnEnd() {
    state.gameActive = false;
    state.roundActive = false;
    state.gameStarted = false;
  }

  function showGameOverScreen() {
    elements.gameScreen.classList.remove("active");
    elements.gameOverScreen.classList.add("active");
  }

  function displayFinalResults() {
    // Calculate final metrics
    const metrics = calculateGameMetrics();

    // Display score summary
    displayScoreSummary(metrics);

    // Populate results table
    populateResultsTable();
  }

  function calculateGameMetrics() {
    // Basic metrics
    const correctAnswers = state.gameResults.filter(
      (result) => result.correct
    ).length;
    const accuracy = (correctAnswers / state.totalRounds) * 100;

    // Time metrics
    let totalTime = 0;
    let averageTime = 0;
    let fastestTime = Infinity;
    let slowestTime = 0;

    state.gameResults.forEach((result) => {
      const timeInSeconds = result.time / 1000;
      totalTime += timeInSeconds;

      if (timeInSeconds < fastestTime) {
        fastestTime = timeInSeconds;
      }

      if (timeInSeconds > slowestTime) {
        slowestTime = timeInSeconds;
      }
    });

    averageTime = totalTime / state.gameResults.length || 0;

    // Calculate average coefficients using stored values or calculate them if missing
    let totalAccuracyCoefficient = 0;
    let totalSpeedCoefficient = 0;

    state.gameResults.forEach((result) => {
      // Use existing coefficients or calculate them if they don't exist
      let accuracyCoefficient = result.accuracyCoefficient;
      if (accuracyCoefficient === undefined) {
        accuracyCoefficient = calculateAccuracyCoefficient(
          result.correct,
          result.difference || 0
        );
        result.accuracyCoefficient = accuracyCoefficient; // Store for future use
      }

      let speedCoefficient = result.speedCoefficient;
      if (speedCoefficient === undefined) {
        speedCoefficient = calculateSpeedCoefficient(result.time / 1000);
        result.speedCoefficient = speedCoefficient; // Store for future use
      }

      totalAccuracyCoefficient += accuracyCoefficient;
      totalSpeedCoefficient += speedCoefficient;
    });

    const accuracyCoefficient = state.gameResults.length
      ? totalAccuracyCoefficient / state.gameResults.length
      : 0;

    const speedCoefficient = state.gameResults.length
      ? totalSpeedCoefficient / state.gameResults.length
      : 0;

    // Calculate TMI score (max 300)
    // TMI combines accuracy coefficient and speed coefficient with equal weights
    const accuracyWeight = 0.5;
    const speedWeight = 0.5;

    const combinedCoefficient =
      accuracyCoefficient * accuracyWeight + speedCoefficient * speedWeight;

    const tallyMasteryScore = Math.round(300 * combinedCoefficient);

    return {
      correctAnswers,
      accuracy,
      totalTime,
      averageTime,
      fastestTime,
      slowestTime,
      weightedAccuracy: accuracyCoefficient * 100, // Convert to percentage for display
      accuracyCoefficient,
      speedCoefficient,
      tallyMasteryScore,
    };
  }

  function displayScoreSummary(metrics) {
    elements.finalScore.innerHTML = `
          <p><strong>Weighted Accuracy:</strong> ${metrics.weightedAccuracy.toFixed(
            1
          )}%</p>
          <p><strong>Average Time:</strong> ${metrics.averageTime.toFixed(
            2
          )} seconds</p>
          <p><strong>Fastest Time:</strong> ${
            metrics.fastestTime === Infinity
              ? "N/A"
              : metrics.fastestTime.toFixed(2) + " seconds"
          }</p>
          <p><strong>Slowest Time:</strong> ${metrics.slowestTime.toFixed(
            2
          )} seconds</p>
          <div class="mastery-score">
            <p><strong>Tally Mastery Score:</strong> ${
              metrics.tallyMasteryScore
            }/300</p>
            <p class="score-breakdown">
              <span>Accuracy (50%): ${(
                metrics.accuracyCoefficient * 100
              ).toFixed(1)}%</span> • 
              <span>Speed (50%): ${(metrics.speedCoefficient * 100).toFixed(
                1
              )}%</span>
            </p>
          </div>
        `;
  }

  function populateResultsTable() {
    elements.resultsBody.innerHTML = "";

    // Update the table header to include coefficients
    const tableHeader = document.querySelector("#results-table thead tr");
    if (tableHeader) {
      tableHeader.innerHTML = `
          <th>End</th>
          <th>Arrows</th>
          <th>Your Answer</th>
          <th>Correct Answer</th>
          <th>Time (s)</th>
          <th>Result</th>
        `;
    }

    state.gameResults.forEach((result) => {
      const row = document.createElement("tr");
      const difference = !result.correct ? result.difference || 0 : 0;

      // Assign class based on correctness or how close the answer was
      if (result.correct) {
        row.className = "correct";
      } else {
        row.className = "incorrect";
      }

      row.innerHTML = `
            <td>${result.round}</td>
            <td>${result.arrows}</td>
            <td>${result.userAnswer}</td>
            <td>${result.correctAnswer}</td>
            <td>${(result.time / 1000).toFixed(2)}</td>
            <td>${
              result.correct
                ? "✓"
                : `✗ ${difference > 0 ? `(off by ${difference})` : ""}`
            }</td>
          `;

      elements.resultsBody.appendChild(row);
    });
  }

  function initSpeechRecognition() {
    // Check if speech recognition is supported
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.log("Speech recognition not supported");
      elements.micBtn.style.display = "none";
      return false;
    }

    // Create the recognition object only once
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    try {
      // Initialize the recognition object
      recognition = new SpeechRecognition();

      // Configure recognition settings
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      // Set up event handlers
      recognition.onstart = function () {
        isListening = true;
        elements.micBtn.classList.add("listening");
      };

      recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript.trim();

        // Convert speech to number
        const number = extractNumberFromSpeech(transcript);
        if (number !== null) {
          state.userInput = number.toString();
          elements.inputDisplay.textContent = state.userInput;
        }
      };
      recognition.onend = function () {
        isListening = false;
        elements.micBtn.classList.remove("listening");
      };

      recognition.onerror = function (event) {
        console.error("Speech recognition error", event.error);
        isListening = false;
        elements.micBtn.classList.remove("listening");
      };

      // Request permission once at initialization
      // This will trigger the permission prompt once at the beginning
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            // Immediately stop the stream - we just needed the permission
            stream.getTracks().forEach((track) => track.stop());
            console.log("Microphone permission granted");
          })
          .catch((err) => {
            console.error("Microphone permission denied:", err);
            elements.micBtn.style.display = "none";
          });
      }

      return true;
    } catch (error) {
      console.error("Error initializing speech recognition:", error);
      elements.micBtn.style.display = "none";
      return false;
    }
  }

  // Extract a number from speech transcript
  function extractNumberFromSpeech(transcript) {
    // First, try to extract direct numbers
    const directMatch = transcript.match(
      /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty)\b/i
    );

    // Number words mapping
    const numberWords = {
      zero: 0,
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      eleven: 11,
      twelve: 12,
      thirteen: 13,
      fourteen: 14,
      fifteen: 15,
      sixteen: 16,
      seventeen: 17,
      eighteen: 18,
      nineteen: 19,
      twenty: 20,
      thirty: 30,
    };

    if (directMatch) {
      const word = directMatch[0].toLowerCase();
      if (numberWords[word] !== undefined) {
        return numberWords[word];
      }
    }

    // Complex number parsing (like "twenty one")
    if (transcript.match(/\btwenty\s+one\b/i)) return 21;
    if (transcript.match(/\btwenty\s+two\b/i)) return 22;
    if (transcript.match(/\btwenty\s+three\b/i)) return 23;
    if (transcript.match(/\btwenty\s+four\b/i)) return 24;
    if (transcript.match(/\btwenty\s+five\b/i)) return 25;
    if (transcript.match(/\btwenty\s+six\b/i)) return 26;
    if (transcript.match(/\btwenty\s+seven\b/i)) return 27;
    if (transcript.match(/\btwenty\s+eight\b/i)) return 28;
    if (transcript.match(/\btwenty\s+nine\b/i)) return 29;

    // Try to find digits
    const digits = transcript.match(/\d+/);
    if (digits) {
      // Limit to 2 digits (0-30 range)
      const num = parseInt(digits[0]);
      if (!isNaN(num) && num <= 30) {
        return num;
      }
    }

    return null;
  }

  // Toggle speech recognition
  function toggleSpeechRecognition() {
    // If recognition isn't initialized yet, try to initialize it
    if (!recognition) {
      if (!initSpeechRecognition()) {
        return;
      }
    }

    // Toggle between listening and not listening
    if (isListening) {
      recognition.stop();
    } else if (state.roundActive) {
      // Only allow listening during an active round
      try {
        // This shouldn't prompt for permissions again if already granted
        recognition.start();
      } catch (e) {
        console.error("Could not start speech recognition:", e);

        // If there's an error, try to recreate the recognition object
        if (e.name === "NotAllowedError") {
          console.log("Attempting to reinitialize speech recognition...");
          recognition = null;
          initSpeechRecognition();
        }
      }
    }
  }
});
