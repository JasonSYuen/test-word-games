'use client'

import { useState, useEffect } from "react";
import Link from 'next/link';
import words10 from 'wordlist-english/english-words-10.json';
import words20 from 'wordlist-english/english-words-20.json';
import words35 from 'wordlist-english/english-words-35.json';
import words40 from 'wordlist-english/english-words-40.json';
import words50 from 'wordlist-english/english-words-50.json';
import words55 from 'wordlist-english/english-words-55.json';

// Combine word lists - 10 (most common) through 55 for broader vocabulary
const allWords = [...words10, ...words20, ...words35, ...words40, ...words50, ...words55];

// Create a Set for fast word lookup - O(1)
const validWords = new Set(allWords.map(w => w.toLowerCase()));

// Scrabble letter point values
const letterPoints: { [key: string]: number } = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
  'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
  'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
  'Y': 4, 'Z': 10
};

// Calculate score for a word
function calculateScore(word: string): number {
  return word.toUpperCase().split('').reduce((score, letter) => {
    return score + (letterPoints[letter] || 0);
  }, 0);
}

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
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [turnNumber, setTurnNumber] = useState(1);
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);
  const [usedTiles, setUsedTiles] = useState<Set<string>>(new Set());

  // Generate grid only on client side to avoid hydration mismatch
  useEffect(() => {
    setGrid(generateRandomGrid());
  }, []);

  // Validate word and calculate score whenever it changes
  useEffect(() => {
    if (w.length > 0) {
      const valid = validWords.has(w.toLowerCase());
      setIsValid(valid);
      setCurrentScore(calculateScore(w));
    } else {
      setIsValid(null);
      setCurrentScore(0);
    }
  }, [w]);

  // Submit word and add to current player's score
  const handleSubmit = () => {
    if (isValid && w.length >= 3) {
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
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <select
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'home') {
              window.location.href = '/';
            } else if (value === 'battle') {
              window.location.href = '/games/battle';
            } else if (value === 'singleplayerbattle') {
              window.location.href = '/games/singleplayerbattle';
            }
          }}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-semibold cursor-pointer"
          defaultValue="blackout"
        >
          <option value="home">🏠 Home</option>
          <option value="blackout">Blackout Mode</option>
          <option value="battle">Battle Mode</option>
          <option value="singleplayerbattle">AI Battle</option>
        </select>
      </div>

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