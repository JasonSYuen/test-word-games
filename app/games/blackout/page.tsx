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

export default function Page() {
  const [w, setW] = useState('');
  const [grid, setGrid] = useState<string[][]>([]);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [turnNumber, setTurnNumber] = useState(1);
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);
  const [usedTiles, setUsedTiles] = useState<Set<string>>(new Set());

  // Use the custom validation hook
  const { isValid, score: currentScore } = useWordValidation(w);

  // Generate grid only on client side to avoid hydration mismatch
  useEffect(() => {
    setGrid(generateRandomGrid());
  }, []);

  // Submit word and add to current player's score
  const handleSubmit = () => {
    if (isValid) {
      // Add score to current player
      if (currentPlayer === 1) {
        setPlayer1Score(player1Score + currentScore);
      } else {
        setPlayer2Score(player2Score + currentScore);
      }

      setSubmittedWords([...submittedWords, w.toUpperCase()]);
      // Mark tiles as used
      setUsedTiles(new Set([...usedTiles, ...selectedTiles]));
      setW('');
      setSelectedTiles([]);

      // Switch to next player
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      if (currentPlayer === 2) {
        setTurnNumber(turnNumber + 1);
      }
    }
  };

  // Pass turn without playing a word
  const handlePassTurn = () => {
    setW('');
    setSelectedTiles([]);

    // Switch to next player
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
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

  return (
    <div className="relative">
      <GameNav currentGame="blackout" />

      {/* Player 1 Score - Left Side */}
      <div className="absolute top-20 left-4 p-4 bg-blue-100 rounded-lg shadow">
        <p className={`text-lg font-bold ${currentPlayer === 1 ? 'text-blue-600' : 'text-gray-600'}`}>
          Player 1 {currentPlayer === 1 && '⭐'}
        </p>
        <p className="text-2xl font-bold">{player1Score}</p>
      </div>

      {/* Player 2 Score - Right Side */}
      <div className="absolute top-20 right-4 p-4 bg-red-100 rounded-lg shadow">
        <p className={`text-lg font-bold ${currentPlayer === 2 ? 'text-red-600' : 'text-gray-600'}`}>
          Player 2 {currentPlayer === 2 && '⭐'}
        </p>
        <p className="text-2xl font-bold">{player2Score}</p>
      </div>

      <div className="text-center p-4 pt-20">
        <div className="mb-4">
          <p className="text-xl font-semibold">Turn: {turnNumber}</p>
          <p className="text-2xl font-bold mt-2">
            {currentPlayer === 1 ? "Player 1's Turn" : "Player 2's Turn"}
          </p>
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
          Word Score: {currentScore} points
        </p>

        <div className="flex gap-2 justify-center mt-3">
          <button
            onClick={handleSubmit}
            disabled={!isValid || w.length < 3}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
          >
            Submit Word
          </button>
          <button
            onClick={() => {
              setW('');
              setSelectedTiles([]);
            }}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear
          </button>
          <button
            onClick={handlePassTurn}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-semibold"
          >
            Pass Turn
          </button>
        </div>

        {submittedWords.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2">Submitted Words:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {submittedWords.map((word, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 rounded text-sm">
                  {word} ({calculateScore(word)})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center" onMouseUp={handleMouseUp}>
        <div className="grid grid-cols-8 gap-2 p-1 w-[500px] select-none">
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const tileKey = `${rowIndex}-${colIndex}`;
              const isSelected = selectedTiles.includes(tileKey);
              const isUsed = usedTiles.has(tileKey);

              return (
                <div
                  key={tileKey}
                  onMouseDown={() => handleMouseDown(cell, rowIndex, colIndex)}
                  onMouseEnter={() => handleMouseEnter(cell, rowIndex, colIndex)}
                  className={`border aspect-square flex flex-col items-center justify-center relative ${
                    isUsed
                      ? 'bg-gray-800 text-gray-800 cursor-not-allowed'
                      : isSelected
                      ? 'bg-blue-500 text-white cursor-pointer'
                      : 'hover:bg-blue-100 active:bg-blue-200 cursor-pointer'
                  }`}
                >
                  <span className="text-2xl font-bold">{cell}</span>
                  <span className={`text-xs absolute bottom-1 right-1 ${isUsed ? 'text-gray-800' : ''}`}>
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