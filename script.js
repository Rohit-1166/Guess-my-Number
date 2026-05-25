'use strict';

// 1. CONSTANTS AND GAME CONFIGURATION

const DIFFICULTY_CONFIG = {
  easy: { max: 10, startScore: 25, label: '1 and 10' },
  medium: { max: 20, startScore: 20, label: '1 and 20' },
  hard: { max: 50, startScore: 15, label: '1 and 50' },
  extreme: { max: 100, startScore: 10, label: '1 and 100' }
};


// 2. STATE VARIABLES

let currentDifficulty = 'medium';
let maxRange = DIFFICULTY_CONFIG[currentDifficulty].max;
let secretNumber;
let score;
let highScore = 0;

// New feature variables
let timerInterval = null;
let secondsElapsed = 0;
let isTimerRunning = false;
let isMuted = false;
let hintUsed = false;
let highscoresList = [];

// Audio Context (lazily loaded on first user interaction)
let audioCtx = null;


// 3. SOUND SYNTHESIS SYSTEM (WEB AUDIO API)

const initAudio = function() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playSound = function(type) {
  if (isMuted) return;
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } 
    else if (type === 'hint') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
    else if (type === 'too-high') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.setValueAtTime(350, now + 0.08);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } 
    else if (type === 'too-low') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.setValueAtTime(350, now + 0.08);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } 
    else if (type === 'win') {
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, index) => {
        const noteOsc = audioCtx.createOscillator();
        const noteGain = audioCtx.createGain();
        noteOsc.connect(noteGain);
        noteGain.connect(audioCtx.destination);
        
        noteOsc.type = 'triangle';
        noteOsc.frequency.setValueAtTime(freq, now + index * 0.1);
        noteGain.gain.setValueAtTime(0.08, now + index * 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.5);
        
        noteOsc.start(now + index * 0.1);
        noteOsc.stop(now + index * 0.1 + 0.55);
      });
    } 
    else if (type === 'loss') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.8);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    }
  } catch (err) {
    console.warn('Audio synthesis failed:', err);
  }
};


// 4. UI ELEMENT SELECTIONS

const displayMessage = function(message) {
  document.querySelector('.message').textContent = message;
};

const updateNumberBox = function(val) {
  document.querySelector('.number').textContent = val;
};

const updateScoreDisplay = function(val) {
  document.querySelectorAll('.score').forEach(el => el.textContent = val);
};


// 5. TIMER FUNCTIONALITY

const startTimer = function() {
  if (isTimerRunning) return;
  isTimerRunning = true;
  secondsElapsed = 0;
  updateTimerUI();
  
  timerInterval = setInterval(() => {
    secondsElapsed++;
    updateTimerUI();
  }, 1000);
};

const stopTimer = function() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  isTimerRunning = false;
};

const updateTimerUI = function() {
  const min = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
  const sec = String(secondsElapsed % 60).padStart(2, '0');
  document.querySelector('#timerVal').textContent = `${min}:${sec}`;
};

const formatSeconds = function(totalSecs) {
  const min = String(Math.floor(totalSecs / 60)).padStart(2, '0');
  const sec = String(totalSecs % 60).padStart(2, '0');
  return `${min}:${sec}`;
};


// 6. HISTORY SYSTEM

const addHistoryItem = function(guess, type) {
  const list = document.querySelector('#historyList');
  const li = document.createElement('li');
  li.className = `history-item ${type === 'high' ? 'too-high' : 'too-low'}`;
  
  const icon = type === 'high' ? '↑' : '↓';
  li.innerHTML = `<span>${icon}</span> ${guess}`;
  
  list.insertBefore(li, list.firstChild);
};

const clearHistory = function() {
  document.querySelector('#historyList').innerHTML = '';
};


// 7. LEADERBOARD SYSTEM (LOCALSTORAGE)

const loadLeaderboard = function() {
  try {
    const rawData = localStorage.getItem('guess_num_leaderboard');
    highscoresList = rawData ? JSON.parse(rawData) : [];
  } catch (err) {
    highscoresList = [];
  }
  renderLeaderboard();
};

const saveLeaderboard = function() {
  localStorage.setItem('guess_num_leaderboard', JSON.stringify(highscoresList));
  renderLeaderboard();
};

const renderLeaderboard = function() {
  const body = document.querySelector('#leaderboardBody');
  body.innerHTML = '';
  
  if (highscoresList.length === 0) {
    body.innerHTML = `<tr><td colspan="4" class="leaderboard-empty">No highscores yet. Be the first!</td></tr>`;
    return;
  }

  highscoresList.forEach((entry, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="leaderboard-rank">#${i + 1}</td>
      <td class="leaderboard-name">${entry.name}</td>
      <td class="leaderboard-score" style="text-align: right;">${entry.score}</td>
      <td class="leaderboard-time" style="text-align: right;">${formatSeconds(entry.time)}</td>
    `;
    body.appendChild(tr);
  });
};

const addToLeaderboard = function(name, finalScore, finalTime) {
  if (!name.trim()) name = 'Anonymous';
  const entry = {
    name: name.trim().substring(0, 15),
    score: finalScore,
    time: finalTime,
    difficulty: currentDifficulty,
    date: new Date().toISOString()
  };
  
  highscoresList.push(entry);
  highscoresList.sort((a, b) => b.score - a.score || a.time - b.time);
  highscoresList = highscoresList.slice(0, 5);
  
  saveLeaderboard();
};


// 8. RULES POPUP SYSTEM

const showRulesModal = function(difficulty) {
  const rules = {
    easy: {
      title: '🟢 Easy Mode Rules',
      content: `
        • <strong>Number Range:</strong> 1 to 10<br>
        • <strong>Starting Score / Attempts:</strong> 25 points<br>
        • <strong>💡 Hints:</strong> Costs 3 points. Reveals if the secret number is Even or Odd.<br>
        • <strong>⏱️ Timer:</strong> Starts on your first guess. Stops when you win!
      `
    },
    medium: {
      title: '🔵 Medium Mode Rules',
      content: `
        • <strong>Number Range:</strong> 1 to 20<br>
        • <strong>Starting Score / Attempts:</strong> 20 points<br>
        • <strong>💡 Hints:</strong> Costs 3 points. Reveals if the secret number is Even or Odd.<br>
        • <strong>⏱️ Timer:</strong> Starts on your first guess. Stops when you win!
      `
    },
    hard: {
      title: '🟠 Hard Mode Rules',
      content: `
        • <strong>Number Range:</strong> 1 to 50<br>
        • <strong>Starting Score / Attempts:</strong> 15 points<br>
        • <strong>💡 Hints:</strong> Costs 3 points. Reveals if the secret number is Even or Odd.<br>
        • <strong>⏱️ Timer:</strong> Starts on your first guess. Stops when you win!
      `
    },
    extreme: {
      title: '🔴 Extreme Mode Rules',
      content: `
        • <strong>Number Range:</strong> 1 to 100<br>
        • <strong>Starting Score / Attempts:</strong> 10 points<br>
        • <strong>💡 Hints:</strong> Costs 3 points. Reveals if the secret number is Even or Odd.<br>
        • <strong>⏱️ Timer:</strong> Starts on your first guess. Stops when you win!
      `
    }
  };

  const isNeverShow = localStorage.getItem(`guess_num_never_rules_${difficulty}`) === 'true';
  if (isNeverShow) return;

  const data = rules[difficulty];
  document.querySelector('#rulesTitle').innerHTML = data.title;
  document.querySelector('#rulesContent').innerHTML = data.content;
  document.querySelector('#rulesOverlay').classList.remove('hidden');
};

const closeRules = function() {
  document.querySelector('#rulesOverlay').classList.add('hidden');
};


// 9. CHARACTERS ANIMATION CONTROLLERS (NEW!)

const resetCharReactions = function() {
  const left = document.querySelector('#leftChar');
  const right = document.querySelector('#rightChar');
  
  left.classList.remove('sad-reaction', 'victory-dance');
  right.classList.remove('surprised-reaction', 'victory-dance');
};

const triggerLeftReaction = function() {
  resetCharReactions();
  const left = document.querySelector('#leftChar');
  
  // Trigger flow reflow to restart CSS keyframe animation
  void left.offsetWidth; 
  left.classList.add('sad-reaction');
  
  setTimeout(() => {
    left.classList.remove('sad-reaction');
  }, 1200);
};

const triggerRightReaction = function() {
  resetCharReactions();
  const right = document.querySelector('#rightChar');
  
  void right.offsetWidth;
  right.classList.add('surprised-reaction');
  
  setTimeout(() => {
    right.classList.remove('surprised-reaction');
  }, 1200);
};

const triggerVictoryDance = function() {
  resetCharReactions();
  const left = document.querySelector('#leftChar');
  const right = document.querySelector('#rightChar');
  
  left.classList.remove('looking');
  right.classList.remove('looking');
  
  left.classList.add('victory-dance');
  right.classList.add('victory-dance');
};


// 10. GAME FLOW CONTROLLERS

const initGame = function() {
  stopTimer();
  clearHistory();
  resetCharReactions();
  
  const config = DIFFICULTY_CONFIG[currentDifficulty];
  maxRange = config.max;
  score = config.startScore;
  hintUsed = false;
  
  secretNumber = Math.trunc(Math.random() * maxRange) + 1;
  document.body.className = '';
  
  displayMessage('Start guessing...');
  updateNumberBox('?');
  updateScoreDisplay(score);
  
  document.querySelector('#guessInput').value = '';
  document.querySelector('#guessInput').max = maxRange;
  document.querySelector('#difficultyRangeText').textContent = `Guess a number between 1 and ${maxRange}`;
  
  const hintBtn = document.querySelector('#hintBtn');
  hintBtn.disabled = false;
  hintBtn.innerHTML = `💡 Use Hint (-3 pts)`;
  
  secondsElapsed = 0;
  updateTimerUI();
  
  const headerCard = document.querySelector('header');
  headerCard.classList.remove('pulse-highlight');
  void headerCard.offsetWidth; // Trigger reflow to restart CSS animation
  headerCard.classList.add('pulse-highlight');
};

const handleWin = function() {
  stopTimer();
  playSound('win');
  triggerVictoryDance();
  
  document.body.className = 'win-theme';
  updateNumberBox(secretNumber);
  
  if (score > highScore) {
    highScore = score;
    document.querySelector('.highscore').textContent = highScore;
    document.querySelector('#bestTimeVal').textContent = formatSeconds(secondsElapsed);
  }
  
  document.querySelector('#winScoreVal').textContent = score;
  document.querySelector('#winTimeVal').textContent = formatSeconds(secondsElapsed);
  
  const originalScore = DIFFICULTY_CONFIG[currentDifficulty].startScore;
  const scorePercent = (score / originalScore) * 100;
  let stars = '★☆☆☆☆';
  if (scorePercent >= 85) stars = '★★★★★';
  else if (scorePercent >= 65) stars = '★★★★☆';
  else if (scorePercent >= 45) stars = '★★★☆☆';
  else if (scorePercent >= 25) stars = '★★☆☆☆';
  
  document.querySelector('#winStars').textContent = stars;
  
  // Victory popup modal delayed by 2 seconds so player can watch the cute jump animations!
  setTimeout(() => {
    document.querySelector('#winOverlay').classList.remove('hidden');
    document.querySelector('#playerNameInput').focus();
  }, 2000);
};

const handleLoss = function() {
  stopTimer();
  playSound('loss');
  
  // Both characters act sad on game over
  const left = document.querySelector('#leftChar');
  const right = document.querySelector('#rightChar');
  left.classList.add('sad-reaction');
  right.classList.add('sad-reaction');
  
  document.body.className = 'loss-theme';
  displayMessage('💥 You lost the game!');
  updateScoreDisplay(0);
  updateNumberBox(secretNumber);
};


// 11. EVENT LISTENERS SETUP


// Initialise Game, Leaderboards, and Default Rules Overlay
window.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  initGame();
  
  setTimeout(() => {
    showRulesModal('medium');
  }, 500);
});

// Audio Sound toggle button click
document.querySelector('#muteBtn').addEventListener('click', function() {
  isMuted = !isMuted;
  this.textContent = isMuted ? '🔇' : '🔊';
  playSound('click');
});

// Difficulty Button Pill switching
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    playSound('click');
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    
    currentDifficulty = this.dataset.diff;
    initGame();
    
    showRulesModal(currentDifficulty);
  });
});

// Check button game validation
document.querySelector('#checkBtn').addEventListener('click', function() {
  playSound('click');
  
  if (!isTimerRunning && score > 0) {
    startTimer();
  }

  const guess = Number(document.querySelector('#guessInput').value);

  if (!guess || guess < 1 || guess > maxRange) {
    displayMessage(`🚫 Please enter a valid number between 1 and ${maxRange}!`);
    return;
  }

  if (guess === secretNumber) {
    displayMessage('🎉 Correct Number!');
    handleWin();
  } 
  else {
    if (score > 1) {
      const tooHigh = guess > secretNumber;
      displayMessage(tooHigh ? '📈 Too high!' : '📉 Too low!');
      playSound(tooHigh ? 'too-high' : 'too-low');
      
      // Trigger character reactions depending on direction
      if (tooHigh) {
        triggerRightReaction();
      } else {
        triggerLeftReaction();
      }
      
      addHistoryItem(guess, tooHigh ? 'high' : 'low');
      
      score--;
      updateScoreDisplay(score);
    } else {
      handleLoss();
    }
  }
});

// Again / Reset trigger
document.querySelector('#againBtn').addEventListener('click', function() {
  playSound('click');
  initGame();
});

// Hint click logic
document.querySelector('#hintBtn').addEventListener('click', function() {
  if (hintUsed) return;
  playSound('hint');
  
  if (score <= 3) {
    displayMessage('⚠️ Not enough score for a hint!');
    return;
  }
  
  hintUsed = true;
  score -= 3;
  updateScoreDisplay(score);
  
  this.disabled = true;
  this.innerHTML = `💡 Hint Active`;
  
  const isEven = secretNumber % 2 === 0;
  displayMessage(`💡 HINT: The number is ${isEven ? 'EVEN' : 'ODD'}!`);
});

// Leaderboard Modal Dialog interactions
document.querySelector('#trophyBtn').addEventListener('click', function() {
  playSound('click');
  document.querySelector('#leaderboardOverlay').classList.remove('hidden');
});

document.querySelector('#closeLeaderboardBtn').addEventListener('click', function() {
  playSound('click');
  document.querySelector('#leaderboardOverlay').classList.add('hidden');
});

document.querySelector('#clearLeaderboardBtn').addEventListener('click', function() {
  playSound('click');
  if (confirm('Are you sure you want to clear all highscores?')) {
    highscoresList = [];
    saveLeaderboard();
  }
});

// Level rules close actions
document.querySelector('#closeRulesBtn').addEventListener('click', function() {
  playSound('click');
  closeRules();
});

document.querySelector('#dismissRulesBtn').addEventListener('click', function() {
  playSound('click');
  closeRules();
});

document.querySelector('#neverShowRulesBtn').addEventListener('click', function() {
  playSound('click');
  localStorage.setItem(`guess_num_never_rules_${currentDifficulty}`, 'true');
  closeRules();
});

// Winner Form leaderboard score save submission
document.querySelector('#saveScoreBtn').addEventListener('click', function() {
  playSound('click');
  const nameInput = document.querySelector('#playerNameInput');
  const name = nameInput.value || 'Anonymous';
  
  addToLeaderboard(name, score, secondsElapsed);
  
  nameInput.value = '';
  document.querySelector('#winOverlay').classList.add('hidden');
  initGame();
});

document.querySelector('#winCloseBtn').addEventListener('click', function() {
  playSound('click');
  document.querySelector('#winOverlay').classList.add('hidden');
  initGame();
});

// Interactive Input Focus Trackings for Characters looking (NEW FEATURE!)
document.querySelector('#guessInput').addEventListener('focus', function() {
  document.querySelector('#leftChar').classList.add('looking');
  document.querySelector('#rightChar').classList.add('looking');
});

document.querySelector('#guessInput').addEventListener('input', function() {
  document.querySelector('#leftChar').classList.add('looking');
  document.querySelector('#rightChar').classList.add('looking');
});

document.querySelector('#guessInput').addEventListener('blur', function() {
  document.querySelector('#leftChar').classList.remove('looking');
  document.querySelector('#rightChar').classList.remove('looking');
});

// Keyboard Accessibility & Hotkey bindings
document.querySelector('#guessInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.querySelector('#checkBtn').click();
  }
});

document.querySelector('#playerNameInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.querySelector('#saveScoreBtn').click();
  }
});

window.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelector('#leaderboardOverlay').classList.add('hidden');
    document.querySelector('#winOverlay').classList.add('hidden');
    document.querySelector('#rulesOverlay').classList.add('hidden');
  }
});

// Click outside overlay closes modal
window.addEventListener('click', function(e) {
  const leaderboardModal = document.querySelector('#leaderboardOverlay');
  const rulesModal = document.querySelector('#rulesOverlay');
  if (e.target === leaderboardModal) {
    leaderboardModal.classList.add('hidden');
  }
  if (e.target === rulesModal) {
    rulesModal.classList.add('hidden');
  }
});
