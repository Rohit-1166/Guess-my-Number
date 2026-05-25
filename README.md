# 🎯 Guess My Number!

A fun and feature-rich number guessing game built with pure **HTML**, **CSS**, and **JavaScript** — no frameworks, no dependencies.

🔗 **[Live Demo](https://rohit-1166.github.io/Guess-my-Number/)**

---

## ✨ Features

- 🎚️ **4 Difficulty Levels** — Easy (1–10), Medium (1–20), Hard (1–50), Extreme (1–100)
- ⏱️ **Live Timer** — Starts on your first guess, stops when you win
- 🏆 **High Score & Best Time** — Persisted across sessions using `localStorage`
- 💡 **Hint System** — Reveals if the number is Even or Odd (costs 3 points)
- 📜 **Guess History** — Tracks all your guesses in the current round
- 🔊 **Sound Effects** — Audio feedback for guesses, wins, and losses
- ✨ **Smooth Animations** — Visual feedback on every interaction
- 📋 **Rules Modal** — Per-difficulty rules shown on mode switch (with "Don't show again" option)
- 💾 **Local Storage** — Scores and best times saved between sessions

---

## 📸 Screenshots

| Main Game | Rules Modal |
|-----------|-------------|
| ![Main Game](screenshots/screenshot1.png) | ![Rules Modal](screenshots/screenshot2.png) |

---

## 🕹️ How to Play

1. Select a difficulty level from the tabs at the top
2. A secret number is randomly generated within the selected range
3. Type your guess and click **Check!**
4. Use the **💡 Hint** button if you're stuck (costs 3 points)
5. Find the number in the fewest guesses and shortest time
6. Beat your high score and best time!

---

## 📊 Scoring

| Difficulty | Range | Starting Score |
|------------|-------|----------------|
| Easy | 1 – 10 | 25 pts |
| Medium | 1 – 20 | 20 pts |
| Hard | 1 – 50 | 50 pts |
| Extreme | 1 – 100 | 100 pts |

- Each wrong guess deducts points
- Using a hint deducts **3 points**
- Your score on win is saved as high score if it beats the previous one

---

## 🗂️ Project Structure
Guess-my-Number/
├── index.html
├── style.css
├── script.js
└── README.md

---

## 🚀 Getting Started

No installation needed. Just open `index.html` in any browser, or visit the live demo above.

```bash
# Clone the repo
git clone https://github.com/rohit-1166/Guess-my-Number.git

# Open in browser
open index.html
```

---

## 🛠️ Built With

- **HTML5** — Structure
- **CSS3** — Styling & animations
- **JavaScript (ES6+)** — Game logic, DOM manipulation, localStorage

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

> Made with 💜 by [Rohit](https://github.com/rohit-1166)
