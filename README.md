# Memory Tests

A React application that implements cognitive tests to assess short-term and working memory capacity. The application features two different tests with customizable settings, weighted scoring, and persistent leaderboards.

## Available Tests

### 1. Digit Memory Span Test
Tests short-term auditory memory by presenting sequences of spoken digits.

**Features:**
- Progressive difficulty from 3 to 10 unique digits
- Text-to-speech with multiple voice options
- Reverse mode for increased difficulty
- Keyboard and mouse input support

### 2. Operation Span (OSPAN) Test
Tests working memory capacity using a dual-task paradigm that combines math problem solving with letter memorization.

**Features:**
- Solve math problems while remembering letters
- Progressive difficulty from 3 to 10 items
- Requires 85%+ math accuracy to continue
- Tests ability to maintain information while processing

## General Features

- **Interactive GUI**: User-friendly interfaces with keypads
- **Real-time Feedback**: Immediate validation with visual feedback
- **Customizable Settings** (Digit Span):
  - Adjustable pause duration between digits (200ms - 2000ms)
  - Voice selection (English, German, French, Italian)
- **Weighted Scoring System**: Performance adjusted based on speed
- **Persistent Leaderboards**: Top 15 scores tracked separately
- **Auto-progression**: Automatically advances to next level on success
- **Keyboard Support**: Full keyboard input for both tests

## How the Tests Work

### Digit Memory Span Test
1. The test starts at level 3 (3 digits)
2. Random, unique digits (0-9) are spoken using text-to-speech
3. Enter the digits using keyboard or on-screen keypad
4. If correct, automatically advance to the next level
5. Continue until completing level 10 or making a mistake
6. Weighted score is calculated and saved to leaderboard

### Operation Span Test
1. The test starts at level 3 (3 problems + letters)
2. For each item:
   - View a math problem and judge if the answer is correct
   - Remember the letter shown after each problem
3. After all problems, recall all letters in order
4. Must maintain 85%+ math accuracy to continue
5. Continue until completing level 10 or making a mistake
6. Weighted score is calculated and saved to leaderboard

## Prerequisites

- Node.js (v14 or higher)
- macOS (for `/usr/bin/say` command support)

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Application

### Option 1: Using VS Code Task
- Press `Cmd+Shift+P` and select "Tasks: Run Task"
- Choose "Start Digit Memory Span App"

### Option 2: Using npm scripts
```bash
# Run both backend and frontend together
npm start

# Or run them separately in different terminals:
# Terminal 1 - Backend server
npm run server

# Terminal 2 - Frontend development server
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
memory/
├── src/
│   ├── App.jsx          # Main React component with game logic
│   ├── App.css          # Application styling
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── server.js            # Express backend server for text-to-speech
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
└── .github/
    └── copilot-instructions.md  # Project documentation
```

## Implementation Details

### Frontend (React - App.jsx)

#### State Management
- **Test Selection**: `selectedTest` ('digit', 'ospan', or null for menu)
- **Game State**: `currentLevel`, `digits`, `userInput`, `gameState`, `message`, `score`
- **Settings**: `pauseDuration`, `reverseMode`, `selectedVoice`, `showSettings`
- **Leaderboards**: `normalScores`, `reverseScores`, `showLeaderboard`
- **OSPAN State**: `mathProblems`, `lettersToRemember`, `currentProblemIndex`, `mathAnswer`, `ospanPhase`

#### Core Functions - Digit Span Test

**`generateDigits(level)`**
- Generates random, non-repeating digits for the current level
- Uses Fisher-Yates-style selection from available digits (0-9)
- Ensures uniqueness within each level
- Parameters: `level` (optional, defaults to currentLevel)
- Returns: Array of unique random digits

**`speakDigits(digitsToSpeak)`**
- Async function that speaks each digit using the backend API
- Handles voice selection and pause duration
- Updates game state to 'playing' during speech
- Calls backend `/speak` endpoint for each digit
- Implements custom pause between digits
- Catches and displays errors if backend is unavailable

**`startRound()`**
- Initiates a new round of the game
- Generates new digit sequence
- Resets user input
- Calls `speakDigits()` to begin speaking

**`checkAnswer()`**
- Validates user input against correct answer
- Handles both normal and reverse mode
- On success:
  - Advances to next level (automatically)
  - Saves score if level 10 completed
  - Displays weighted score
- On failure:
  - Saves score if progress was made
  - Shows correct answer with visual display
  - Ends game after delay

**`calculateWeightedScore(level, pauseMs)`**
- Calculates performance score adjusted for speed
- Baseline: 800ms = 100%
- Formula: `score = level × (1 + speedAdjustment/100)`
- Speed adjustment: ±3% per 100ms from baseline
- Returns: Weighted score rounded to 2 decimal places

**`addScoreToLeaderboard(level, isReverse)`**
- Adds new score entry to appropriate leaderboard
- Creates score object with timestamp, level, pause duration
- Sorts by weighted score (descending)
- Keeps only top 15 entries
- Persists to localStorage

**`resetGame()`**
- Resets all game state to initial values
- Clears user input and digits
- Returns to ready state

**`handleDigitClick(digit)`**
- Handles number pad button clicks
- Appends digit to user input (if space available)
- Only active during input state

**`handleBackspace()`**
- Removes last digit from user input
- Only active during input state

#### Core Functions - OSPAN Test

**`generateMathProblem()`**
- Creates simple math problems (addition, subtraction, multiplication)
- Generates both correct and incorrect answer options
- Returns problem object with equation and answers
- Difficulty appropriate for quick mental math

**`generateLetter()`**
- Selects random consonant letter (excludes vowels)
- Prevents formation of words during recall
- Returns single uppercase letter

**`startOspanRound()`**
- Initializes new OSPAN round
- Generates math problems and corresponding letters
- Sets up problem sequence for current level
- Starts with first math problem

**`handleMathResponse(isCorrect)`**
- Records user's judgment of math problem
- Tracks accuracy for 85% threshold requirement
- Advances to next problem or moves to recall phase
- Updates UI to show current progress

**`checkOspanAnswer()`**
- Validates letter recall against correct sequence
- Checks math accuracy requirement (85%+)
- On success: advances to next level or completes test
- On failure: shows correct answer and ends test
- Calculates and saves weighted score

#### UI Components
- **Info Panel**: Displays current level, best score, settings/leaderboard buttons
- **Settings Panel**: Pause duration slider, voice selector, reverse mode toggle
- **Leaderboard Panel**: Two sections (normal/reverse) showing top 15 scores
- **Message Panel**: Displays game messages and correct answer on error
- **Input Display**: Shows user's entered digits with visual boxes
- **Keypad**: 0-9 number buttons, backspace, submit
- **Playing Indicator**: Animated spinner during speech

### Backend (Express - server.js)

**`POST /speak`**
- Receives digit and optional voice parameter
- Spawns `/usr/bin/say` process with appropriate arguments
- Uses `-v` flag for voice selection (Anna, Thomas, Alice)
- Returns success/error response
- Handles process errors and exit codes

#### Voice Options
- **Default**: System default English voice
- **Anna**: German voice
- **Thomas**: French voice  
- **Alice**: Italian voice

### Scoring System

**Base Score**: Level reached (1-10)

**Speed Multiplier**:
- 800ms pause = 1.0× (baseline)
- 700ms pause = 1.03× (+3%)
- 600ms pause = 1.06× (+6%)
- 500ms pause = 1.09× (+9%)
- 900ms pause = 0.97× (-3%)
- 1000ms pause = 0.94× (-6%)

**Examples**:
- Level 5 at 800ms = 5.00 points
- Level 5 at 500ms = 5.45 points (+9%)
- Level 5 at 1100ms = 4.55 points (-9%)
- Level 10 at 400ms = 11.20 points (+12%)

### Data Persistence

**localStorage Keys**:
- `normalScores`: Array of top 15 scores for normal mode
- `reverseScores`: Array of top 15 scores for reverse mode

**Score Entry Format**:
```javascript
{
  score: 5.45,              // Weighted score
  level: 5,                 // Level reached
  pauseDuration: 500,       // Speed setting (ms)
  timestamp: "2025-11-01T...", // ISO timestamp
  date: "11/1/2025, 4:30 PM"   // Formatted date
}
```

## Technology Stack

- **Frontend**: React 19, Vite 7
- **Backend**: Express.js, Node.js
- **Text-to-Speech**: macOS `say` command with voice selection
- **Storage**: Browser localStorage for leaderboards
- **Styling**: CSS3 with animations and modern layout

## How to Play

### Test Selection
1. Choose between **Digit Span Test** or **Operation Span Test**
2. Read the test description and features
3. Click on a test card to begin

### Digit Span Test
1. Click "⚙️ Settings" to customize:
   - Adjust pause duration (default 800ms)
   - Select voice (English/German/French/Italian)
   - Enable reverse mode for extra challenge
2. Click "Start Level 3" to begin
3. Listen carefully as the digits are spoken
4. Enter the digits using the number keypad
   - Normal mode: Enter in same order
   - Reverse mode: Enter in reverse order
5. Click "Submit" or press Enter to check your answer
6. On success: Automatically advances to next level
7. On failure or completion: View weighted score
8. Click "🏆 Leaderboard" to see top 15 scores for each mode
9. Click "Play Again" to restart
10. Click "← Back to Menu" to select a different test

### Operation Span Test
1. Click "Start Level 3" to begin
2. For each problem in the sequence:
   - Read the math equation (e.g., "5 + 3 = 8?")
   - Click "✓ Correct" or "✗ Incorrect" to judge the answer
   - Remember the letter shown after your response
3. After all problems, recall the letters:
   - Enter letters in order using the letter keypad or keyboard
   - Must maintain 85%+ math accuracy to continue
4. Click "Submit" or press Enter to check your recall
5. On success: Automatically advances to next level
6. On failure or completion: View math accuracy and weighted score
7. Click "🏆 Leaderboard" to see top 15 scores
8. Click "Play Again" to restart
9. Click "← Back to Menu" to select a different test

### Keyboard Shortcuts
- **Digit Span**: Number keys (0-9), Backspace, Enter
- **OSPAN**: Letter keys (A-Z), Backspace, Enter

## Development

```bash
# Run frontend only
npm run dev

# Run backend only
npm run server

# Build for production
npm run build

# Preview production build
npm run preview
```
