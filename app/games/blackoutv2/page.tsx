'use client'

import { useState, useEffect } from "react";
import Link from 'next/link';
import GameNav from '@/app/components/GameNav';
import { calculateScore, letterPoints } from '@/app/components/wordValidation';
import { useWordValidation } from '@/app/components/useWordValidation';

// Letter frequency groups based on English usage
const commonLetters = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R'];  // ~60% chance
const uncommonLetters = ['D', 'L', 'C', 'U', 'M', 'W', 'F', 'G', 'Y', 'P', 'B']; // ~30% chance
const rareLetters = ['V', 'K', 'J', 'X', 'Q', 'Z']; // ~10% chance

// Generate random letter with weighted probability
function getRandomLetter(): string {
  const rand = Math.random();

  if (rand < 0.6) {
    // 60% chance - common letters
    return commonLetters[Math.floor(Math.random() * commonLetters.length)];
  } else if (rand < 0.9) {
    // 30% chance - uncommon letters
    return uncommonLetters[Math.floor(Math.random() * uncommonLetters.length)];
  } else {
    // 10% chance - rare letters
    return rareLetters[Math.floor(Math.random() * rareLetters.length)];
  }
}

// Generate 8x8 grid with random letters
function generateRandomGrid(): string[][] {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => getRandomLetter())
  );
}

export default function BlackoutV2Page() {
  const [w, setW] = useState('');
  const [grid, setGrid] = useState<string[][]>([]);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [turnNumber, setTurnNumber] = useState(1);
  const [moveCount, setMoveCount] = useState(0); // Track total moves for snake order
  const [submittedWords, setSubmittedWords] = useState<Array<{word: string, player: 1 | 2, tiles: string[], turnTime: number, isPassed?: boolean}>>([]);
  const [usedTiles, setUsedTiles] = useState<Set<string>>(new Set());
  const [tileOwners, setTileOwners] = useState<Map<string, 1 | 2>>(new Map()); // Track which player used each tile

  // Timer state
  const [turnStartTime, setTurnStartTime] = useState<number>(Date.now());
  const [currentTurnTime, setCurrentTurnTime] = useState<number>(0);
  const [player1TotalTime, setPlayer1TotalTime] = useState<number>(0);
  const [player2TotalTime, setPlayer2TotalTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pausedTime, setPausedTime] = useState<number>(0);
  const [player1Turns, setPlayer1Turns] = useState<number>(0);
  const [player2Turns, setPlayer2Turns] = useState<number>(0);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const maxTurnsPerPlayer = 6;

  // Use the custom validation hook
  const { isValid, score: currentScore } = useWordValidation(w);

  // Generate grid only on client side to avoid hydration mismatch
  useEffect(() => {
    setGrid(generateRandomGrid());
  }, []);

  // Update current turn time every 100ms and check for auto-pass
  useEffect(() => {
    if (isPaused || gameEnded) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - turnStartTime;
      setCurrentTurnTime(elapsed);

      // Auto-pass after 60 seconds (60000ms)
      if (elapsed >= 60000) {
        handlePassTurn();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [turnStartTime, isPaused, gameEnded]);

  // Format time in seconds with one decimal place
  const formatTime = (ms: number): string => {
    return (ms / 1000).toFixed(1) + 's';
  };

  // Toggle pause
  const togglePause = () => {
    if (isPaused) {
      // Resume: adjust turnStartTime to account for paused duration
      const pauseDuration = Date.now() - pausedTime;
      setTurnStartTime(turnStartTime + pauseDuration);
      setIsPaused(false);
    } else {
      // Pause: save current time
      setPausedTime(Date.now());
      setIsPaused(true);
    }
  };

  // Submit word and add to current player's score
  const handleSubmit = () => {
    if (isValid) {
      // Calculate score with length bonus (+1 per letter)
      const lengthBonus = w.length;
      const totalScore = currentScore + lengthBonus;

      // Calculate turn time
      const turnTime = Date.now() - turnStartTime;

      // Increment turn count for current player
      let newPlayer1Turns = player1Turns;
      let newPlayer2Turns = player2Turns;

      // Add score and time to current player
      if (currentPlayer === 1) {
        setPlayer1Score(player1Score + totalScore);
        setPlayer1TotalTime(player1TotalTime + turnTime);
        newPlayer1Turns = player1Turns + 1;
        setPlayer1Turns(newPlayer1Turns);
      } else {
        setPlayer2Score(player2Score + totalScore);
        setPlayer2TotalTime(player2TotalTime + turnTime);
        newPlayer2Turns = player2Turns + 1;
        setPlayer2Turns(newPlayer2Turns);
      }

      setSubmittedWords([...submittedWords, { word: w.toUpperCase(), player: currentPlayer, tiles: [...selectedTiles], turnTime }]);
      // Mark tiles as used and record which player used them
      setUsedTiles(new Set([...usedTiles, ...selectedTiles]));
      const newTileOwners = new Map(tileOwners);
      selectedTiles.forEach(tile => {
        newTileOwners.set(tile, currentPlayer);
      });
      setTileOwners(newTileOwners);
      setW('');
      setSelectedTiles([]);

      // Check if game should end
      if (newPlayer1Turns >= maxTurnsPerPlayer && newPlayer2Turns >= maxTurnsPerPlayer) {
        setGameEnded(true);
        return;
      }

      // Snake order turn switching based on move count
      // Moves: 0=P1, 1=P2, 2=P2, 3=P1, 4=P1, 5=P2, 6=P2, 7=P1...
      const newMoveCount = moveCount + 1;
      setMoveCount(newMoveCount);

      // Calculate which pair we're in (0-1, 2-3, 4-5, etc.)
      const pairIndex = Math.floor(newMoveCount / 2);

      // Even pairs (0, 2, 4...): P1 then P2
      // Odd pairs (1, 3, 5...): P2 then P1
      if (pairIndex % 2 === 0) {
        // Even pair: P1, P2
        setCurrentPlayer(newMoveCount % 2 === 0 ? 1 : 2);
      } else {
        // Odd pair: P2, P1
        setCurrentPlayer(newMoveCount % 2 === 0 ? 2 : 1);
      }

      // Update turn number (every 2 moves)
      if (currentPlayer === 2) {
        setTurnNumber(turnNumber + 1);
      }

      // Reset timer for next turn
      setTurnStartTime(Date.now());
      setCurrentTurnTime(0);
    }
  };

  // Pass turn without playing a word
  const handlePassTurn = () => {
    // Calculate turn time and add to player's total
    const turnTime = Date.now() - turnStartTime;

    // Increment turn count for current player
    let newPlayer1Turns = player1Turns;
    let newPlayer2Turns = player2Turns;

    if (currentPlayer === 1) {
      setPlayer1TotalTime(player1TotalTime + turnTime);
      newPlayer1Turns = player1Turns + 1;
      setPlayer1Turns(newPlayer1Turns);
    } else {
      setPlayer2TotalTime(player2TotalTime + turnTime);
      newPlayer2Turns = player2Turns + 1;
      setPlayer2Turns(newPlayer2Turns);
    }

    // Add passed turn to records
    setSubmittedWords([...submittedWords, { word: 'PASS', player: currentPlayer, tiles: [], turnTime, isPassed: true }]);

    setW('');
    setSelectedTiles([]);

    // Check if game should end
    if (newPlayer1Turns >= maxTurnsPerPlayer && newPlayer2Turns >= maxTurnsPerPlayer) {
      setGameEnded(true);
      return;
    }

    // Snake order turn switching (same logic as handleSubmit)
    const newMoveCount = moveCount + 1;
    setMoveCount(newMoveCount);

    const pairIndex = Math.floor(newMoveCount / 2);

    if (pairIndex % 2 === 0) {
      setCurrentPlayer(newMoveCount % 2 === 0 ? 1 : 2);
    } else {
      setCurrentPlayer(newMoveCount % 2 === 0 ? 2 : 1);
    }

    if (currentPlayer === 2) {
      setTurnNumber(turnNumber + 1);
    }

    // Reset timer for next turn
    setTurnStartTime(Date.now());
    setCurrentTurnTime(0);
  };

  // Check if two tiles are adjacent (within 8 surrounding tiles)
  const areAdjacent = (tile1: string, tile2: string): boolean => {
    const [row1, col1] = tile1.split('-').map(Number);
    const [row2, col2] = tile2.split('-').map(Number);
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff + colDiff > 0);
  };

  const handleTileClick = (letter: string, rowIndex: number, colIndex: number) => {
    // If paused, ignore
    if (isPaused) return;

    const tileKey = `${rowIndex}-${colIndex}`;

    // If tile is already used (blacked out), ignore
    if (usedTiles.has(tileKey)) return;

    // If already selected, ignore
    if (selectedTiles.includes(tileKey)) return;

    // Check if adjacent to last selected tile (or first tile)
    if (selectedTiles.length === 0 || areAdjacent(selectedTiles[selectedTiles.length - 1], tileKey)) {
      setW(w + letter);
      setSelectedTiles([...selectedTiles, tileKey]);
    }
  };

  const handleMouseDown = (letter: string, rowIndex: number, colIndex: number) => {
    if (isPaused) return;
    setIsDragging(true);
    handleTileClick(letter, rowIndex, colIndex);
  };

  const handleMouseEnter = (letter: string, rowIndex: number, colIndex: number) => {
    if (isDragging && !isPaused) {
      handleTileClick(letter, rowIndex, colIndex);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Clear selection when clicking outside the grid
  const handleClickOutside = () => {
    if (selectedTiles.length > 0) {
      setW('');
      setSelectedTiles([]);
    }
  };

  // Restart game
  const handleRestart = () => {
    setGrid(generateRandomGrid());
    setW('');
    setSelectedTiles([]);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setCurrentPlayer(1);
    setTurnNumber(1);
    setMoveCount(0);
    setSubmittedWords([]);
    setUsedTiles(new Set());
    setTileOwners(new Map());
    setTurnStartTime(Date.now());
    setCurrentTurnTime(0);
    setPlayer1TotalTime(0);
    setPlayer2TotalTime(0);
    setIsPaused(false);
    setPausedTime(0);
    setPlayer1Turns(0);
    setPlayer2Turns(0);
    setGameEnded(false);
  };

  // Determine winner
  const winner = player1Score > player2Score ? 1 : player1Score < player2Score ? 2 : 0; // 0 = tie

  // Calculate black overlay opacity based on timer (0 at 0s, 1 at 60s) - freeze when game ends
  const blackOpacity = gameEnded ? 0 : Math.min(currentTurnTime / 60000, 1) * 0.8; // Max 80% opacity

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" onClick={handleClickOutside}>
      {/* Timer overlay - inverts in dark mode */}
      <div
        className="fixed inset-0 bg-black dark:bg-white pointer-events-none transition-opacity duration-300"
        style={{ opacity: blackOpacity, zIndex: 5 }}
      ></div>

      <div className="relative z-50">
        <GameNav currentGame="blackoutv2" />
      </div>

      {/* Title directly under GameNav */}
      {!gameEnded && (
        <div className="text-center pt-16 pb-4 relative" style={{ zIndex: 6 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Blackout V2</h1>
        </div>
      )}

      {/* Player Scores - Desktop: side by side, Mobile: stacked */}
      {!gameEnded && (
        <div className="md:hidden flex justify-around px-4 pb-2 relative" style={{ zIndex: 6 }}>
        {/* Mobile: Horizontal layout */}
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg shadow flex-1 mr-2">
          <p className={`text-sm font-bold ${currentPlayer === 1 ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
            P1 {currentPlayer === 1 && '⭐'}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{player1Score}</p>
          <p className="text-xs font-mono mt-1 text-gray-600 dark:text-gray-400">Total: {formatTime(player1TotalTime)}</p>
        </div>
        <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg shadow flex-1 ml-2">
          <p className={`text-sm font-bold ${currentPlayer === 2 ? 'text-red-600 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'}`}>
            P2 {currentPlayer === 2 && '⭐'}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{player2Score}</p>
          <p className="text-xs font-mono mt-1 text-gray-600 dark:text-gray-400">Total: {formatTime(player2TotalTime)}</p>
        </div>
      </div>
      )}

      {/* Player 1 Score - Desktop: Left Side */}
      {!gameEnded && (
        <div className="hidden md:block absolute top-20 left-4 p-4 bg-blue-100 dark:bg-blue-900 rounded-lg shadow" style={{ zIndex: 6 }}>
        <p className={`text-lg font-bold ${currentPlayer === 1 ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
          Player 1 {currentPlayer === 1 && '⭐'}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{player1Score}</p>
        <p className="text-sm font-mono mt-1 text-gray-600 dark:text-gray-400">Total: {formatTime(player1TotalTime)}</p>
      </div>
      )}

      {/* Player 2 Score - Desktop: Right Side */}
      {!gameEnded && (
        <div className="hidden md:block absolute top-20 right-4 p-4 bg-red-100 dark:bg-red-900 rounded-lg shadow" style={{ zIndex: 6 }}>
        <p className={`text-lg font-bold ${currentPlayer === 2 ? 'text-red-600 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'}`}>
          Player 2 {currentPlayer === 2 && '⭐'}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{player2Score}</p>
        <p className="text-sm font-mono mt-1 text-gray-600 dark:text-gray-400">Total: {formatTime(player2TotalTime)}</p>
      </div>
      )}

      {!gameEnded && (
        <div className="text-center p-2 relative" style={{ zIndex: 6 }}>
        <div className="mb-3 flex items-center justify-center gap-4 md:gap-8 text-lg md:text-2xl">
          <p className="font-bold text-gray-900 dark:text-gray-100">
            {currentPlayer === 1 ? "Player 1" : "Player 2"}
          </p>
          <p className="font-semibold text-gray-700 dark:text-gray-300">
            <span className={`font-mono ${currentTurnTime >= 50000 ? 'text-red-600 dark:text-red-400' : ''}`}>
              {formatTime(currentTurnTime)}
            </span>
            {currentTurnTime >= 50000 && currentTurnTime < 60000 && (
              <span className="ml-1 text-sm md:text-base text-red-600 dark:text-red-400">
                ({Math.ceil((60000 - currentTurnTime) / 1000)}s)
              </span>
            )}
          </p>
          <p className="font-semibold text-gray-800 dark:text-gray-200">Turn {turnNumber}</p>
        </div>

        <p className="text-base md:text-xl text-gray-900 dark:text-gray-100">
          Current Word: <span className="font-bold">{w || '(empty)'}</span>
          {isValid !== null && (
            <span className={`ml-2 md:ml-3 text-sm md:text-lg ${isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isValid ? '✓ Valid' : '✗ Invalid'}
            </span>
          )}
        </p>
        <p className="text-sm md:text-lg font-semibold mt-2 text-gray-800 dark:text-gray-200">
          Word Score: {currentScore} points
          {w.length >= 3 && (
            <span className="text-green-600 dark:text-green-400 ml-2 block md:inline">
              +{w.length} length bonus = {currentScore + w.length} total
            </span>
          )}
        </p>

        <div className="flex gap-2 justify-center mt-3 flex-wrap">
          <button
            onClick={handleSubmit}
            disabled={!isValid || w.length < 3 || isPaused}
            className="px-4 md:px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
          >
            Submit Word
          </button>
          <button
            onClick={() => {
              setW('');
              setSelectedTiles([]);
            }}
            disabled={isPaused}
            className="px-3 md:px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm md:text-base"
          >
            Clear
          </button>
          <button
            onClick={togglePause}
            className={`px-3 md:px-4 py-2 text-white rounded font-semibold text-sm md:text-base ${
              isPaused
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            onClick={handlePassTurn}
            disabled={isPaused}
            className="px-3 md:px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
          >
            Pass Turn
          </button>
        </div>
      </div>
      )}

      {/* Game End Panel - replaces everything above the grid */}
      {gameEnded && (
        <div className="flex justify-center px-4 pt-16 pb-6 relative" style={{ zIndex: 7 }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl border-4 border-purple-500">
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900 dark:text-gray-100">Game Over!</h2>
            {winner === 0 ? (
              <p className="text-xl md:text-2xl mb-4 text-gray-700 dark:text-gray-300">It's a Tie!</p>
            ) : (
              <p className="text-xl md:text-2xl mb-4 text-gray-700 dark:text-gray-300">
                Player {winner} Wins!
              </p>
            )}
            <div className="mb-4 space-y-2">
              <p className="text-lg md:text-xl text-gray-900 dark:text-gray-100">
                <span className="font-bold text-blue-600 dark:text-blue-400">Player 1:</span> {player1Score} points
              </p>
              <p className="text-lg md:text-xl text-gray-900 dark:text-gray-100">
                <span className="font-bold text-red-600 dark:text-red-400">Player 2:</span> {player2Score} points
              </p>
            </div>
            <button
              onClick={handleRestart}
              className="px-6 md:px-8 py-2 md:py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-semibold text-base md:text-lg"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center px-2 md:px-0 relative" style={{ zIndex: 6 }} onMouseUp={handleMouseUp}>
        <div className="relative w-full max-w-[500px]" onClick={(e) => e.stopPropagation()}>
          {/* Pause Overlay */}
          {isPaused && (
            <div className="absolute top-0 left-0 w-full h-full bg-gray-500 flex items-center justify-center rounded-lg" style={{ zIndex: 10 }}>
              <div className="text-center">
                <p className="text-4xl md:text-6xl font-bold text-white mb-4">Game Paused</p>
                <p className="text-lg md:text-xl text-gray-100">Click Resume to continue</p>
              </div>
            </div>
          )}

          {/* SVG overlay for drawing lines */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {submittedWords.map((wordData, idx) => {
              const color = wordData.player === 1 ? '#3b82f6' : '#ef4444'; // blue-500 or red-500
              const lines = [];

              for (let i = 0; i < wordData.tiles.length - 1; i++) {
                const [row1, col1] = wordData.tiles[i].split('-').map(Number);
                const [row2, col2] = wordData.tiles[i + 1].split('-').map(Number);

                // Calculate center of each tile dynamically based on container width
                // Grid uses gap-2 (8px) between tiles
                const containerWidth = typeof window !== 'undefined' ? Math.min(500, window.innerWidth - 16) : 500;
                const gap = 8;
                const tileSize = (containerWidth - 7 * gap - 8) / 8; // -8 for padding
                const x1 = col1 * (tileSize + gap) + tileSize / 2 + 4;
                const y1 = row1 * (tileSize + gap) + tileSize / 2 + 4;
                const x2 = col2 * (tileSize + gap) + tileSize / 2 + 4;
                const y2 = row2 * (tileSize + gap) + tileSize / 2 + 4;

                lines.push(
                  <line
                    key={`${idx}-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={color}
                    strokeWidth="3"
                    opacity="0.6"
                  />
                );
              }

              return lines;
            })}
          </svg>

          <div className="grid grid-cols-8 gap-2 p-1 select-none" style={{ position: 'relative', zIndex: 2 }}>
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const tileKey = `${rowIndex}-${colIndex}`;
                const isSelected = selectedTiles.includes(tileKey);
                const isUsed = usedTiles.has(tileKey);
                const owner = tileOwners.get(tileKey);

                return (
                  <div
                    key={tileKey}
                    onMouseDown={() => handleMouseDown(cell, rowIndex, colIndex)}
                    onMouseEnter={() => handleMouseEnter(cell, rowIndex, colIndex)}
                    className={`border border-gray-300 dark:border-gray-600 aspect-square flex flex-col items-center justify-center relative ${
                      isUsed
                        ? owner === 1
                          ? 'bg-blue-600 dark:bg-blue-700 cursor-not-allowed'
                          : 'bg-red-600 dark:bg-red-700 cursor-not-allowed'
                        : isSelected
                        ? 'bg-green-400 dark:bg-green-500 text-white cursor-pointer'
                        : 'bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900 active:bg-blue-200 dark:active:bg-blue-800 cursor-pointer text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <span className={`text-xl md:text-2xl font-bold ${
                      isUsed
                        ? owner === 1
                          ? 'text-blue-200 opacity-40'
                          : 'text-red-200 opacity-40'
                        : ''
                    }`}>{cell}</span>
                    <span className={`text-[10px] md:text-xs absolute bottom-0.5 md:bottom-1 right-0.5 md:right-1 ${
                      isUsed
                        ? owner === 1
                          ? 'text-blue-200 opacity-40'
                          : 'text-red-200 opacity-40'
                        : ''
                    }`}>
                      {letterPoints[cell]}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Records section below the grid */}
      <div className="mt-6 pb-20 text-center relative" style={{ zIndex: 10 }}>
        <p className="text-sm font-semibold mb-4 text-gray-800 dark:text-gray-200">Records:</p>
        <div className="flex flex-wrap gap-2 justify-center px-4 min-h-[2rem]">
          {submittedWords.map((item, idx) => {
            const baseScore = item.isPassed ? 0 : calculateScore(item.word);
            const lengthBonus = item.isPassed ? 0 : item.word.length;
            const totalScore = baseScore + lengthBonus;

            return (
              <span
                key={idx}
                className={`px-3 py-1 rounded text-sm border-2 ${
                  item.isPassed
                    ? item.player === 1
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-600 text-gray-700 dark:text-gray-400 italic'
                      : 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-600 text-gray-700 dark:text-gray-400 italic'
                    : item.player === 1
                    ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-400 text-gray-900 dark:text-gray-100'
                    : 'bg-red-100 dark:bg-red-900 border-red-500 dark:border-red-400 text-gray-900 dark:text-gray-100'
                }`}
              >
                {item.isPassed ? (
                  <>PASS <span className="font-mono text-xs opacity-75">{formatTime(item.turnTime)}</span></>
                ) : (
                  <>{item.word} ({totalScore}) <span className="font-mono text-xs opacity-75">{formatTime(item.turnTime)}</span></>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
