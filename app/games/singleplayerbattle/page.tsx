'use client'

import { useState, useEffect, useRef } from "react";
import Link from 'next/link';
import GameNav from '@/app/components/GameNav';
import { calculateScore, letterPoints, validWords } from '@/app/components/wordValidation';
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

// AI word finder - simplified and fast
function findAIWord(grid: string[][], difficulty: 'easy' | 'medium' | 'hard'): {
  word: string;
  tiles: string[];
  score: number;
} | null {
  console.time('AI Word Search');
  const foundWords: Array<{word: string, tiles: string[], score: number}> = [];

  // Much more aggressive - just find first 10 words
  const targetWords = 10;
  let operationCount = 0;

  // Only try 16 random positions
  const startPositions: Array<[number, number]> = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      startPositions.push([row, col]);
    }
  }

  // Shuffle and only try first 16 positions
  startPositions.sort(() => Math.random() - 0.5);
  const positionsToTry = startPositions.slice(0, 16);

  for (const [row, col] of positionsToTry) {
    if (foundWords.length >= targetWords) break;
    findWordsFrom(row, col, '', [], new Set(), 0);
  }

  function findWordsFrom(row: number, col: number, word: string, path: string[], visited: Set<string>, depth: number) {
    operationCount++;

    // Much stricter depth limit - only 5 letters max
    if (depth > 5 || foundWords.length >= targetWords) return;

    const tileKey = `${row}-${col}`;
    if (visited.has(tileKey)) return;

    const newWord = word + grid[row][col];
    const newPath = [...path, tileKey];
    const newVisited = new Set(visited).add(tileKey);

    // Check if valid word (3+ letters)
    if (newWord.length >= 3 && validWords.has(newWord.toLowerCase())) {
      const score = calculateScore(newWord);
      foundWords.push({ word: newWord, tiles: newPath, score });

      // Stop early if we have enough
      if (foundWords.length >= targetWords) return;
    }

    // Try all 8 adjacent tiles
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
          findWordsFrom(newRow, newCol, newWord, newPath, newVisited, depth + 1);
        }
      }
    }
  }

  console.timeEnd('AI Word Search');
  console.log(`Found ${foundWords.length} words in ${operationCount} operations`);

  if (foundWords.length === 0) return null;

  // Difficulty-based word selection
  if (difficulty === 'easy') {
    // Pick a random word from lower-scoring options (bottom 50%)
    const sortedWords = foundWords.sort((a, b) => a.score - b.score);
    const bottomWords = sortedWords.slice(0, Math.max(1, Math.ceil(sortedWords.length / 2)));
    return bottomWords[Math.floor(Math.random() * bottomWords.length)];
  } else if (difficulty === 'medium') {
    // Pick any random word
    return foundWords[Math.floor(Math.random() * foundWords.length)];
  } else {
    // Hard: Pick from top-scoring words (top 50%)
    const sortedWords = foundWords.sort((a, b) => b.score - a.score);
    const topWords = sortedWords.slice(0, Math.max(1, Math.ceil(sortedWords.length / 2)));
    return topWords[Math.floor(Math.random() * topWords.length)];
  }
}

export default function SinglePlayerBattlePage() {
  const [w, setW] = useState('');
  const [grid, setGrid] = useState<string[][]>([]);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [playerHealth, setPlayerHealth] = useState(20);
  const [aiHealth, setAIHealth] = useState(20);
  const [currentPlayer, setCurrentPlayer] = useState<'player' | 'ai'>('player');
  const [turnNumber, setTurnNumber] = useState(1);
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [aiThinking, setAIThinking] = useState(false);
  const [lastAIWord, setLastAIWord] = useState<string>('');
  const [aiSelectedTiles, setAISelectedTiles] = useState<string[]>([]);
  const aiTurnInProgress = useRef(false);

  // Use the custom validation hook
  const { isValid, score: currentDamage } = useWordValidation(w);

  // Generate grid only on client side to avoid hydration mismatch
  useEffect(() => {
    setGrid(generateRandomGrid());
  }, []);

  // Check for game over
  useEffect(() => {
    if (playerHealth <= 0) {
      setTimeout(() => {
        setGameOver(true);
        setWinner('ai');
      }, 2000); // Delay to see final move
    } else if (aiHealth <= 0) {
      setTimeout(() => {
        setGameOver(true);
        setWinner('player');
      }, 2000); // Delay to see final move
    }
  }, [playerHealth, aiHealth]);

  // AI turn logic
  useEffect(() => {
    console.log('AI useEffect triggered:', { currentPlayer, gameOver, gridLength: grid.length, aiTurnInProgress: aiTurnInProgress.current });

    if (currentPlayer === 'ai' && !gameOver && grid.length > 0 && !aiTurnInProgress.current) {
      console.log('AI starting turn...');
      aiTurnInProgress.current = true;
      setAIThinking(true);

      // Execute AI turn immediately (no artificial delay)
      setTimeout(() => {
        console.log('AI timeout executing, finding word...');
        const aiMove = findAIWord(grid, difficulty);

        if (aiMove) {
          console.log('AI found word:', aiMove.word);
          setLastAIWord(aiMove.word);
          setAISelectedTiles(aiMove.tiles); // Highlight AI's tiles

          // Update health first
          const newPlayerHealth = Math.max(0, playerHealth - aiMove.score);
          setPlayerHealth(newPlayerHealth);

          // Add to word history
          setSubmittedWords(prev => [...prev, `AI: ${aiMove.word.toUpperCase()}`]);

          // Show AI's selected tiles for 2 seconds, then drop tiles and switch
          setTimeout(() => {
            // Drop tiles and refill
            dropTiles(aiMove.tiles);
            setAISelectedTiles([]); // Clear highlighting

            // Switch back to player (only if game not over)
            setTimeout(() => {
              console.log('Switching back to player');
              if (newPlayerHealth > 0) {
                setCurrentPlayer('player');
              }
              setTurnNumber(prev => prev + 1);
              setAIThinking(false);
              setLastAIWord('');
              aiTurnInProgress.current = false;
            }, 500); // Small delay after tiles drop
          }, 2000); // Show AI tiles for 2 seconds
        } else {
          // AI has no moves, player wins
          console.log('AI has no valid moves');
          setGameOver(true);
          setWinner('player');
          setAIThinking(false);
          aiTurnInProgress.current = false;
        }
      }, 100); // Minimal delay to ensure UI updates
    }
  }, [currentPlayer, gameOver]); // Only depend on currentPlayer and gameOver

  // Restart game
  const restartGame = () => {
    setPlayerHealth(20);
    setAIHealth(20);
    setCurrentPlayer('player');
    setTurnNumber(1);
    setW('');
    setSelectedTiles([]);
    setSubmittedWords([]);
    setGameOver(false);
    setWinner(null);
    setGrid(generateRandomGrid());
    setLastAIWord('');
    setAIThinking(false);
    setAISelectedTiles([]);
    aiTurnInProgress.current = false;
  };

  // Drop tiles and refill grid
  const dropTiles = (tilesToRemove: string[]) => {
    const newGrid = grid.map(row => [...row]);

    // Get columns that need to be processed
    const columnsToProcess = new Set<number>();
    tilesToRemove.forEach(tile => {
      const [, col] = tile.split('-').map(Number);
      columnsToProcess.add(col);
    });

    // For each column, drop tiles and add new ones at the top
    columnsToProcess.forEach(col => {
      // Get all tiles to remove in this column
      const rowsToRemove = tilesToRemove
        .filter(tile => {
          const [, c] = tile.split('-').map(Number);
          return c === col;
        })
        .map(tile => {
          const [r] = tile.split('-').map(Number);
          return r;
        })
        .sort((a, b) => a - b); // Sort from top to bottom

      // Remove tiles and shift down
      rowsToRemove.forEach(() => {
        // Remove tiles at specified positions and shift everything down
        for (let row = 7; row >= 0; row--) {
          if (rowsToRemove.includes(row)) {
            // Shift all tiles above this position down
            for (let r = row; r > 0; r--) {
              newGrid[r][col] = newGrid[r - 1][col];
            }
            // Add new tile at top
            newGrid[0][col] = getRandomLetter();
          }
        }
      });
    });

    setGrid(newGrid);
  };

  // Submit word and deal damage to AI
  const handleSubmit = () => {
    if (isValid && w.length >= 3 && currentPlayer === 'player') {
      // Deal damage to AI
      const newAIHealth = Math.max(0, aiHealth - currentDamage);
      setAIHealth(newAIHealth);

      setSubmittedWords([...submittedWords, `YOU: ${w.toUpperCase()}`]);
      // Drop tiles and refill
      dropTiles(selectedTiles);
      setW('');
      setSelectedTiles([]);

      // Only switch to AI if game isn't over
      if (newAIHealth > 0) {
        setCurrentPlayer('ai');
      }
    }
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
    if (currentPlayer === 'ai' || gameOver) return;

    const tileKey = `${rowIndex}-${colIndex}`;

    // If already selected, ignore
    if (selectedTiles.includes(tileKey)) return;

    // Check if adjacent to last selected tile (or first tile)
    if (selectedTiles.length === 0 || areAdjacent(selectedTiles[selectedTiles.length - 1], tileKey)) {
      setW(w + letter);
      setSelectedTiles([...selectedTiles, tileKey]);
    }
  };

  const handleMouseDown = (letter: string, rowIndex: number, colIndex: number) => {
    if (currentPlayer === 'ai' || gameOver) return;
    setIsDragging(true);
    handleTileClick(letter, rowIndex, colIndex);
  };

  const handleMouseEnter = (letter: string, rowIndex: number, colIndex: number) => {
    if (isDragging && currentPlayer === 'player') {
      handleTileClick(letter, rowIndex, colIndex);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div>
      {/* Game Over Modal - Semi-transparent overlay */}
      {gameOver && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-2xl p-10 max-w-lg text-center shadow-2xl border-4 border-purple-500 pointer-events-auto">
            <div className="mb-6">
              {winner === 'player' ? (
                <div className="text-7xl mb-4">🎉</div>
              ) : (
                <div className="text-7xl mb-4">🤖</div>
              )}
              <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Game Over!
              </h2>
              <p className="text-4xl font-bold mb-3">
                <span className={winner === 'player' ? 'text-blue-600' : 'text-red-600'}>
                  {winner === 'player' ? 'You Win!' : 'AI Wins!'}
                </span>
              </p>
              <p className="text-gray-700 text-lg font-semibold">
                {winner === 'player' ? 'Great job defeating the AI!' : 'Better luck next time!'}
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={restartGame}
                className="px-8 py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                Play Again
              </button>
              <Link
                href="/"
                className="px-8 py-4 bg-purple-500 text-white rounded-xl hover:bg-purple-600 font-semibold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      )}

      <GameNav currentGame="singleplayerbattle" />

      <div className="text-center p-4 pt-20">
        <div className="mb-4">
          <p className="text-xl font-semibold">Turn: {turnNumber}</p>
          <p className="text-2xl font-bold mt-2">
            {currentPlayer === 'player' ? "Your Turn" : "AI's Turn"}
          </p>
          {aiThinking && (
            <p className="text-lg text-gray-600 mt-1 animate-pulse">AI is thinking...</p>
          )}
          {lastAIWord && (
            <p className="text-lg text-red-600 mt-1 font-semibold">
              AI played: {lastAIWord} ({calculateScore(lastAIWord)} damage)
            </p>
          )}
        </div>

        {/* Difficulty selector */}
        <div className="mb-4">
          <label className="text-sm font-semibold mr-2">AI Difficulty:</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
            disabled={!gameOver && turnNumber > 1}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          {!gameOver && turnNumber > 1 && (
            <p className="text-xs text-gray-500 mt-1">Difficulty locked after first turn</p>
          )}
        </div>

        <p className="text-xl">
          Current Word: <span className="font-bold">{w || '(empty)'}</span>
          {isValid !== null && (
            <span className={`ml-3 text-lg ${isValid ? 'text-green-600' : 'text-red-600'}`}>
              {isValid ? '✓ Valid' : '✗ Invalid'}
            </span>
          )}
        </p>
        <p className="text-lg font-semibold mt-2">
          Damage: {currentDamage}
        </p>

        <div className="flex gap-2 justify-center mt-3">
          <button
            onClick={handleSubmit}
            disabled={!isValid || w.length < 3 || gameOver || currentPlayer === 'ai'}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
          >
            Attack!
          </button>
          <button
            onClick={() => {
              setW('');
              setSelectedTiles([]);
            }}
            disabled={gameOver || currentPlayer === 'ai'}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={restartGame}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
          >
            Restart
          </button>
        </div>

        {submittedWords.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2">Word History:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {submittedWords.slice(-6).map((word, idx) => {
                const isAI = word.startsWith('AI:');
                const cleanWord = word.replace(/^(YOU:|AI:)\s*/, '');
                return (
                  <span key={idx} className={`px-3 py-1 rounded text-sm ${isAI ? 'bg-red-100' : 'bg-blue-100'}`}>
                    {word.startsWith('AI:') || word.startsWith('YOU:') ? word : `YOU: ${word}`} ({calculateScore(cleanWord)})
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center gap-4" onMouseUp={handleMouseUp}>
        {/* Player health bars above grid */}
        <div className="flex gap-4 w-[500px] justify-between px-8">
          {/* Player - Blue */}
          <div className="w-32">
            <div className={`w-32 h-32 bg-blue-500 rounded-lg shadow-lg flex items-center justify-center ${
              currentPlayer === 'player' ? 'ring-4 ring-yellow-400' : ''
            }`}>
              <span className="text-white font-bold text-2xl">{playerHealth}</span>
            </div>
            <div className="mt-2 w-full bg-gray-300 h-4 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${(playerHealth / 20) * 100}%` }}
              ></div>
            </div>
            <p className="text-center mt-1 font-semibold text-sm">You</p>
          </div>

          {/* AI - Red */}
          <div className="w-32">
            <div className={`w-32 h-32 bg-red-500 rounded-lg shadow-lg flex items-center justify-center ${
              currentPlayer === 'ai' ? 'ring-4 ring-yellow-400' : ''
            }`}>
              <span className="text-white font-bold text-2xl">{aiHealth}</span>
            </div>
            <div className="mt-2 w-full bg-gray-300 h-4 rounded-full overflow-hidden">
              <div
                className="bg-red-600 h-full transition-all duration-300"
                style={{ width: `${(aiHealth / 20) * 100}%` }}
              ></div>
            </div>
            <p className="text-center mt-1 font-semibold text-sm">AI</p>
          </div>
        </div>

        <div className="grid grid-cols-8 gap-2 p-1 w-[500px] select-none">
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const tileKey = `${rowIndex}-${colIndex}`;
              const isSelected = selectedTiles.includes(tileKey);
              const isAISelected = aiSelectedTiles.includes(tileKey);

              return (
                <div
                  key={tileKey}
                  onMouseDown={() => handleMouseDown(cell, rowIndex, colIndex)}
                  onMouseEnter={() => handleMouseEnter(cell, rowIndex, colIndex)}
                  className={`border aspect-square flex flex-col items-center justify-center relative transition-all duration-500 ${
                    currentPlayer === 'ai' || gameOver ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                  } ${
                    isAISelected
                      ? 'bg-red-500 text-white ring-4 ring-red-300'
                      : isSelected
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-blue-100 active:bg-blue-200'
                    }`}
                >
                  <span className="text-2xl font-bold">{cell}</span>
                  <span className="text-xs absolute bottom-1 right-1">
                    {letterPoints[cell]}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
