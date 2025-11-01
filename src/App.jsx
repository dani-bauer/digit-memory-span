import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [currentLevel, setCurrentLevel] = useState(1)
  const [digits, setDigits] = useState([])
  const [userInput, setUserInput] = useState('')
  const [gameState, setGameState] = useState('ready') // ready, playing, input, correct, incorrect, finished
  const [message, setMessage] = useState('')
  const [score, setScore] = useState(0)
  
  // Settings
  const [pauseDuration, setPauseDuration] = useState(800) // milliseconds
  const [reverseMode, setReverseMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState('default')
  
  // Score lists
  const [normalScores, setNormalScores] = useState([])
  const [reverseScores, setReverseScores] = useState([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  
  // Load scores from localStorage on mount
  useEffect(() => {
    const savedNormalScores = localStorage.getItem('normalScores')
    const savedReverseScores = localStorage.getItem('reverseScores')
    if (savedNormalScores) setNormalScores(JSON.parse(savedNormalScores))
    if (savedReverseScores) setReverseScores(JSON.parse(savedReverseScores))
  }, [])
  
  // Calculate weighted score based on speed
  const calculateWeightedScore = (level, pauseMs) => {
    const baseScore = level
    const speedDiff = pauseMs - 800 // Difference from baseline 800ms
    const speedAdjustment = -(speedDiff / 100) * 3 // -3% per 100ms slower, +3% per 100ms faster
    const weightedScore = baseScore * (1 + speedAdjustment / 100)
    return Math.round(weightedScore * 100) / 100 // Round to 2 decimal places
  }
  
  // Add score to leaderboard
  const addScoreToLeaderboard = (level, isReverse) => {
    const weightedScore = calculateWeightedScore(level, pauseDuration)
    const newScore = {
      score: weightedScore,
      level: level,
      pauseDuration: pauseDuration,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString()
    }
    
    const scoreList = isReverse ? reverseScores : normalScores
    const updatedScores = [...scoreList, newScore]
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 15) // Keep top 15
    
    if (isReverse) {
      setReverseScores(updatedScores)
      localStorage.setItem('reverseScores', JSON.stringify(updatedScores))
    } else {
      setNormalScores(updatedScores)
      localStorage.setItem('normalScores', JSON.stringify(updatedScores))
    }
  }
  
  // Available voices
  const voices = [
    { value: 'default', label: 'English (Default)', voice: null },
    { value: 'Anna', label: 'German (Anna)', voice: 'Anna' },
    { value: 'Thomas', label: 'French (Thomas)', voice: 'Thomas' },
    { value: 'Alice', label: 'Italian (Alice)', voice: 'Alice' }
  ]

  // Generate random digits for current level (no repeats)
  const generateDigits = (level = currentLevel) => {
    const availableDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    const newDigits = []
    
    for (let i = 0; i < level; i++) {
      const randomIndex = Math.floor(Math.random() * availableDigits.length)
      newDigits.push(availableDigits[randomIndex])
      availableDigits.splice(randomIndex, 1) // Remove used digit
    }
    
    return newDigits
  }

  // Speak digits using macOS say command
  const speakDigits = async (digitsToSpeak) => {
    setGameState('playing')
    setMessage(reverseMode ? 'Listen carefully... (reverse mode)' : 'Listen carefully...')
    
    try {
      const currentVoice = voices.find(v => v.value === selectedVoice)?.voice
      
      for (let i = 0; i < digitsToSpeak.length; i++) {
        const digit = digitsToSpeak[i]
        
        // Call the backend endpoint to speak the digit
        const requestBody = { digit: digit.toString() }
        if (currentVoice) {
          requestBody.voice = currentVoice
        }
        
        await fetch('http://localhost:3001/speak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
        
        // Wait between digits using custom pause duration
        await new Promise(resolve => setTimeout(resolve, pauseDuration))
      }
      
      setGameState('input')
      const modeText = reverseMode ? ' in REVERSE order' : ''
      setMessage(`Enter the ${currentLevel} digit${currentLevel > 1 ? 's' : ''}${modeText}:`)
    } catch (error) {
      console.error('Error speaking digits:', error)
      setMessage('Error: Could not speak digits. Make sure the backend server is running.')
      setGameState('ready')
    }
  }

  // Start a new round
  const startRound = () => {
    const newDigits = generateDigits()
    setDigits(newDigits)
    setUserInput('')
    setMessage('')
    speakDigits(newDigits)
  }

  // Check user's answer
  const checkAnswer = () => {
    const correctAnswer = reverseMode 
      ? digits.slice().reverse().join('') 
      : digits.join('')
    
    if (userInput === correctAnswer) {
      setGameState('correct')
      setMessage('Correct! 🎉')
      setScore(currentLevel)
      
      if (currentLevel === 10) {
        // Game completed - save score to leaderboard
        addScoreToLeaderboard(currentLevel, reverseMode)
        setGameState('finished')
        const weightedScore = calculateWeightedScore(currentLevel, pauseDuration)
        setMessage(`Amazing! You completed all 10 levels! 🏆\nWeighted Score: ${weightedScore}`)
      } else {
        setTimeout(() => {
          const nextLevel = currentLevel + 1
          setCurrentLevel(nextLevel)
          setUserInput('')
          setMessage('')
          // Automatically start next level with correct number of digits
          const newDigits = generateDigits(nextLevel)
          setDigits(newDigits)
          speakDigits(newDigits)
        }, 2000)
      }
    } else {
      // Save score even on failure (if they got past level 1)
      if (score > 0) {
        addScoreToLeaderboard(score, reverseMode)
      }
      
      setGameState('incorrect')
      setMessage(`Incorrect! The correct answer was: ${correctAnswer}`)
      setTimeout(() => {
        setGameState('finished')
        const weightedScore = score > 0 ? calculateWeightedScore(score, pauseDuration) : 0
        setMessage(`Game Over! Your final score: ${score} digits\nWeighted Score: ${weightedScore}`)
      }, 3000)
    }
  }

  // Reset game
  const resetGame = () => {
    setCurrentLevel(1)
    setDigits([])
    setUserInput('')
    setGameState('ready')
    setMessage('')
    setScore(0)
  }

  // Handle number button clicks
  const handleDigitClick = (digit) => {
    if (gameState === 'input' && userInput.length < currentLevel) {
      setUserInput(userInput + digit)
    }
  }

  // Handle backspace
  const handleBackspace = () => {
    if (gameState === 'input') {
      setUserInput(userInput.slice(0, -1))
    }
  }

  return (
    <div className="app">
      <h1>Digit Memory Span Test</h1>
      
      <div className="info-panel">
        <div className="level-info">Level: {currentLevel}/10</div>
        <div className="score-info">Best Score: {score} digits</div>
        <button 
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
          disabled={gameState === 'playing' || gameState === 'input'}
        >
          ⚙️ Settings
        </button>
        <button 
          className="settings-toggle"
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          disabled={gameState === 'playing' || gameState === 'input'}
        >
          🏆 Leaderboard
        </button>
      </div>

      {showSettings && gameState === 'ready' && (
        <div className="settings-panel">
          <h3>Settings</h3>
          
          <div className="setting-item">
            <label htmlFor="pause-duration">
              Pause between digits: {pauseDuration}ms
            </label>
            <input
              id="pause-duration"
              type="range"
              min="200"
              max="2000"
              step="100"
              value={pauseDuration}
              onChange={(e) => setPauseDuration(Number(e.target.value))}
            />
            <div className="range-labels">
              <span>Fast (200ms)</span>
              <span>Slow (2000ms)</span>
            </div>
          </div>

          <div className="setting-item">
            <label htmlFor="voice-select">
              Voice:
            </label>
            <select
              id="voice-select"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="voice-select"
            >
              {voices.map((voice) => (
                <option key={voice.value} value={voice.value}>
                  {voice.label}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={reverseMode}
                onChange={(e) => setReverseMode(e.target.checked)}
              />
              <span>Reverse Mode (enter digits in reverse order)</span>
            </label>
          </div>
        </div>
      )}

      {showLeaderboard && gameState === 'ready' && (
        <div className="settings-panel">
          <h3>🏆 Leaderboard</h3>
          
          <div className="leaderboard-container">
            <div className="leaderboard-section">
              <h4>Normal Mode - Top 15</h4>
              {normalScores.length === 0 ? (
                <p className="no-scores">No scores yet</p>
              ) : (
                <div className="score-list">
                  {normalScores.map((entry, index) => (
                    <div key={index} className="score-entry">
                      <span className="rank">#{index + 1}</span>
                      <span className="score-value">{entry.score.toFixed(2)}</span>
                      <span className="score-details">
                        Level {entry.level} • {entry.pauseDuration}ms
                      </span>
                      <span className="score-date">{entry.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="leaderboard-section">
              <h4>Reverse Mode - Top 15</h4>
              {reverseScores.length === 0 ? (
                <p className="no-scores">No scores yet</p>
              ) : (
                <div className="score-list">
                  {reverseScores.map((entry, index) => (
                    <div key={index} className="score-entry">
                      <span className="rank">#{index + 1}</span>
                      <span className="score-value">{entry.score.toFixed(2)}</span>
                      <span className="score-details">
                        Level {entry.level} • {entry.pauseDuration}ms
                      </span>
                      <span className="score-date">{entry.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="message-panel">
        {message && <p className={`message ${gameState}`}>{message}</p>}
        {(gameState === 'incorrect' || gameState === 'finished') && digits.length > 0 && userInput && (
          <div className="correct-answer-display">
            <p className="correct-answer-label">Correct answer:</p>
            <div className="correct-answer-digits">
              {(reverseMode ? digits.slice().reverse() : digits).map((digit, index) => (
                <span key={index} className="correct-digit-box">{digit}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {(gameState === 'input' || (gameState === 'finished' && userInput)) && (
        <div className="input-display">
          <p className="input-label">{gameState === 'finished' ? 'Your answer:' : ''}</p>
          <div className="digit-display">
            {userInput.split('').map((digit, index) => (
              <span key={index} className="digit-box">{digit}</span>
            ))}
            {gameState === 'input' && userInput.length < currentLevel && (
              Array(currentLevel - userInput.length).fill('_').map((_, index) => (
                <span key={`empty-${index}`} className="digit-box empty">_</span>
              ))
            )}
          </div>
        </div>
      )}

      {gameState === 'ready' && (
        <button className="start-button" onClick={startRound}>
          Start Level {currentLevel}
        </button>
      )}

      {gameState === 'input' && (
        <div className="keypad">
          <div className="number-buttons">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
              <button
                key={digit}
                className="digit-button"
                onClick={() => handleDigitClick(digit)}
                disabled={userInput.length >= currentLevel}
              >
                {digit}
              </button>
            ))}
          </div>
          <div className="action-buttons">
            <button className="backspace-button" onClick={handleBackspace}>
              ⌫ Backspace
            </button>
            <button
              className="submit-button"
              onClick={checkAnswer}
              disabled={userInput.length !== currentLevel}
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {gameState === 'finished' && (
        <button className="reset-button" onClick={resetGame}>
          Play Again
        </button>
      )}

      {(gameState === 'playing') && (
        <div className="playing-indicator">
          <div className="spinner"></div>
          <p>Speaking digits...</p>
        </div>
      )}
    </div>
  )
}

export default App
