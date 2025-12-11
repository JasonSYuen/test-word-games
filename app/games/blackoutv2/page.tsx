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
  const [submittedWords, setSubmittedWords] = useState<Array<{word: string, player: 1 | 2, tiles: string[]}>>([]);
  const [usedTiles, setUsedTiles] = useState<Set<string>>(new Set());
  const [tileOwners, setTileOwners] = useState<Map<string, 1 | 2>>(new Map()); // Track which player used each tile

  // Use the custom validation hook
  const { isValid, score: currentScore } = useWordValidation(w);

  // Generate grid only on client side to avoid hydration mismatch
  useEffect(() => {
    setGrid(generateRandomGrid());
  }, []);

  // Submit word and add to current player's score
  const handleSubmit = () => {
    if (isValid) {
      // Calculate score with length bonus (+1 per letter)
      const lengthBonus = w.length;
      const totalScore = currentScore + lengthBonus;

      // Add score to current player
      if (currentPlayer === 1) {
        setPlayer1Score(player1Score + totalScore);
      } else {
        setPlayer2Score(player2Score + totalScore);
      }

      setSubmittedWords([...submittedWords, { word: w.toUpperCase(), player: currentPlayer, tiles: [...selectedTiles] }]);
      // Mark tiles as used and record which player used them
      setUsedTiles(new Set([...usedTiles, ...selectedTiles]));
      const newTileOwners = new Map(tileOwners);
      selectedTiles.forEach(tile => {
        newTileOwners.set(tile, currentPlayer);
      });
      setTileOwners(newTileOwners);
      setW('');
      setSelectedTiles([]);

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
    }
  };

  // Pass turn without playing a word
  const handlePassTurn = () => {
    setW('');
    setSelectedTiles([]);

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
    setIsDragging(true);
    handleTileClick(letter, rowIndex, colIndex);
  };

  const handleMouseEnter = (letter: string, rowIndex: number, colIndex: number) => {
    if (isDragging) {
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

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" onClick={handleClickOutside}>
      <GameNav currentGame="blackoutv2" />

      {/* Player Scores - Desktop: side by side, Mobile: stacked */}
      <div className="md:hidden flex justify-around pt-16 px-4 pb-2">
        {/* Mobile: Horizontal layout */}
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg shadow flex-1 mr-2">
          <p className={`text-sm font-bold ${currentPlayer === 1 ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
            P1 {currentPlayer === 1 && '⭐'}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{player1Score}</p>
        </div>
        <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg shadow flex-1 ml-2">
          <p className={`text-sm font-bold ${currentPlayer === 2 ? 'text-red-600 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'}`}>
            P2 {currentPlayer === 2 && '⭐'}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{player2Score}</p>
        </div>
      </div>

      {/* Player 1 Score - Desktop: Left Side */}
      <div className="hidden md:block absolute top-20 left-4 p-4 bg-blue-100 dark:bg-blue-900 rounded-lg shadow">
        <p className={`text-lg font-bold ${currentPlayer === 1 ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
          Player 1 {currentPlayer === 1 && '⭐'}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{player1Score}</p>
      </div>

      {/* Player 2 Score - Desktop: Right Side */}
      <div className="hidden md:block absolute top-20 right-4 p-4 bg-red-100 dark:bg-red-900 rounded-lg shadow">
        <p className={`text-lg font-bold ${currentPlayer === 2 ? 'text-red-600 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'}`}>
          Player 2 {currentPlayer === 2 && '⭐'}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{player2Score}</p>
      </div>

      <div className="text-center p-4 md:pt-20">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Blackout V2</h1>
          <p className="text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-200">Turn: {turnNumber}</p>
          <p className="text-xl md:text-2xl font-bold mt-2 text-gray-900 dark:text-gray-100">
            {currentPlayer === 1 ? "Player 1's Turn" : "Player 2's Turn"}
          </p>
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
            disabled={!isValid || w.length < 3}
            className="px-4 md:px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
          >
            Submit Word
          </button>
          <button
            onClick={() => {
              setW('');
              setSelectedTiles([]);
            }}
            className="px-3 md:px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm md:text-base"
          >
            Clear
          </button>
          <button
            onClick={handlePassTurn}
            className="px-3 md:px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-semibold text-sm md:text-base"
          >
            Pass Turn
          </button>
        </div>

        {submittedWords.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">Submitted Words:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {submittedWords.map((item, idx) => {
                const baseScore = calculateScore(item.word);
                const lengthBonus = item.word.length;
                const totalScore = baseScore + lengthBonus;

                return (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded text-sm border-2 ${
                      item.player === 1
                        ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 dark:border-blue-400 text-gray-900 dark:text-gray-100'
                        : 'bg-red-100 dark:bg-red-900 border-red-500 dark:border-red-400 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {item.word} ({totalScore})
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center px-2 md:px-0" onMouseUp={handleMouseUp}>
        <div className="relative w-full max-w-[500px]" onClick={(e) => e.stopPropagation()}>
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
                        ? 'bg-blue-500 dark:bg-blue-600 text-white cursor-pointer'
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
    </div>
  );
}
