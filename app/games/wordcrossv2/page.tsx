'use client'

import { useState, useEffect } from "react";
import Link from 'next/link';
import GameNav from '@/app/components/GameNav';
import { calculateScore, letterPoints, isValidWord } from '@/app/components/wordValidation';
import { getRandomCrossword, getDailyCrossword, extractDeckFromCrossword, type CrosswordSolution } from '@/app/components/crosswordBuilder';

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

// Generate array of 25 random letters (fallback only)
function generateDeck(): string[] {
  return Array.from({ length: 25 }, () => getRandomLetter());
}

// Extract all horizontal words from the grid
function getHorizontalWords(grid: string[][]): Array<{word: string, row: number, startCol: number, endCol: number}> {
  const words: Array<{word: string, row: number, startCol: number, endCol: number}> = [];

  for (let row = 0; row < 5; row++) {
    let currentWord = '';
    let startCol = 0;

    for (let col = 0; col < 5; col++) {
      if (grid[row][col] !== '') {
        if (currentWord === '') {
          startCol = col;
        }
        currentWord += grid[row][col];
      } else {
        if (currentWord.length >= 2) {
          words.push({ word: currentWord, row, startCol, endCol: col - 1 });
        }
        currentWord = '';
      }
    }

    // Check for word at end of row
    if (currentWord.length >= 2) {
      words.push({ word: currentWord, row, startCol, endCol: 4 });
    }
  }

  return words;
}

// Extract all vertical words from the grid
function getVerticalWords(grid: string[][]): Array<{word: string, col: number, startRow: number, endRow: number}> {
  const words: Array<{word: string, col: number, startRow: number, endRow: number}> = [];

  for (let col = 0; col < 5; col++) {
    let currentWord = '';
    let startRow = 0;

    for (let row = 0; row < 5; row++) {
      if (grid[row][col] !== '') {
        if (currentWord === '') {
          startRow = row;
        }
        currentWord += grid[row][col];
      } else {
        if (currentWord.length >= 2) {
          words.push({ word: currentWord, col, startRow, endRow: row - 1 });
        }
        currentWord = '';
      }
    }

    // Check for word at end of column
    if (currentWord.length >= 2) {
      words.push({ word: currentWord, col, startRow, endRow: 4 });
    }
  }

  return words;
}

// Check if a letter at position (row, col) is part of a valid word
function isLetterPartOfWord(grid: string[][], row: number, col: number, horizontalWords: any[], verticalWords: any[]): boolean {
  // Check if this position is part of any horizontal word
  const inHorizontalWord = horizontalWords.some(w =>
    w.row === row && col >= w.startCol && col <= w.endCol
  );

  // Check if this position is part of any vertical word
  const inVerticalWord = verticalWords.some(w =>
    w.col === col && row >= w.startRow && row <= w.endRow
  );

  return inHorizontalWord || inVerticalWord;
}

// Validate all words in the grid
function validateGrid(grid: string[][]): { isValid: boolean, invalidWords: string[], totalScore: number, validWords: string[] } {
  const horizontalWords = getHorizontalWords(grid);
  const verticalWords = getVerticalWords(grid);
  const allWords = [...horizontalWords.map(w => w.word), ...verticalWords.map(w => w.word)];

  // Filter out words that are invalid (2+ letters but not in dictionary)
  // Use minLength of 2 for Word Cross to allow 2-letter words
  const invalidWords = allWords.filter(word => word.length >= 2 && !isValidWord(word, 2));
  const validWords = allWords.filter(word => word.length >= 2 && isValidWord(word, 2));

  // Check for isolated single letters (not part of any 2+ letter word)
  const isolatedLetters: string[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (grid[row][col] !== '' && !isLetterPartOfWord(grid, row, col, horizontalWords, verticalWords)) {
        isolatedLetters.push(grid[row][col]);
      }
    }
  }

  // Calculate total score from all letters in the grid
  let totalScore = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (grid[row][col] !== '') {
        totalScore += letterPoints[grid[row][col]] || 0;
      }
    }
  }

  return {
    isValid: invalidWords.length === 0 && isolatedLetters.length === 0 && allWords.length > 0,
    invalidWords: [...invalidWords, ...isolatedLetters.map(letter => `[${letter}]`)], // Wrap isolated letters in brackets
    totalScore,
    validWords
  };
}

export default function WordCrossV2Page() {
  const [deck, setDeck] = useState<string[]>([]);
  const [grid, setGrid] = useState<string[][]>(Array(5).fill(null).map(() => Array(5).fill('')));
  const [usedDeckIndices, setUsedDeckIndices] = useState<Set<number>>(new Set());
  const [draggedFrom, setDraggedFrom] = useState<{type: 'deck' | 'grid', deckIndex?: number, gridPos?: {row: number, col: number}} | null>(null);
  // Map grid position to deck index to track which deck card is where
  const [gridToDeck, setGridToDeck] = useState<Map<string, number>>(new Map());
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);
  const [gridValidation, setGridValidation] = useState<{ isValid: boolean, invalidWords: string[], totalScore: number, validWords: string[] }>({
    isValid: true,
    invalidWords: [],
    totalScore: 0,
    validWords: []
  });

  // Crossword solution state
  const [hiddenSolution, setHiddenSolution] = useState<string[][] | null>(null);
  const [targetScore, setTargetScore] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [puzzleMode, setPuzzleMode] = useState<'random' | 'daily'>('random');
  const [currentPuzzleInfo, setCurrentPuzzleInfo] = useState<{ id: number; date: string } | null>(null);

  // Generate crossword and deck on mount
  useEffect(() => {
    startNewGame();
  }, []);

  // Start a new game with a generated crossword
  const startNewGame = (mode: 'random' | 'daily' = puzzleMode) => {
    setIsGenerating(true);
    setPuzzleMode(mode);

    // Run generation in a timeout to allow UI to update
    setTimeout(() => {
      const solution = mode === 'daily' ? getDailyCrossword() : getRandomCrossword();

      if (solution) {
        // Extract deck from solution
        const newDeck = extractDeckFromCrossword(solution);

        // Sort the deck alphabetically
        const sortedDeck = newDeck.sort((a, b) => a.localeCompare(b));

        setHiddenSolution(solution.grid);
        setTargetScore(solution.totalScore);
        setDeck(sortedDeck);
        setGrid(Array(5).fill(null).map(() => Array(5).fill('')));
        setUsedDeckIndices(new Set());
        setGridToDeck(new Map());
        setSubmittedWords([]);
        setShowSolution(false); // Hide solution on new game
        setCurrentPuzzleInfo({ id: solution.id, date: solution.date });
      } else {
        // Fallback to random deck if generation fails
        setDeck(generateDeck());
        setHiddenSolution(null);
        setTargetScore(0);
        setShowSolution(false);
        setCurrentPuzzleInfo(null);
      }

      setIsGenerating(false);
    }, 100);
  };

  // Validate grid whenever it changes
  useEffect(() => {
    const validation = validateGrid(grid);
    setGridValidation(validation);
  }, [grid]);

  // Move letter from deck to grid
  const moveDeckToGrid = (deckIndex: number, row: number, col: number) => {
    // Check if this deck card has already been used
    if (usedDeckIndices.has(deckIndex)) return;

    const newGrid = grid.map(r => [...r]);
    const newUsedIndices = new Set(usedDeckIndices);
    const newGridMapping = new Map(gridToDeck);

    // If grid position is occupied, free up that tile's deck card
    if (grid[row][col] !== '') {
      const oldDeckIndex = gridToDeck.get(`${row}-${col}`);
      if (oldDeckIndex !== undefined) {
        newUsedIndices.delete(oldDeckIndex);
        newGridMapping.delete(`${row}-${col}`);
      }
    }

    // Place new tile
    newGrid[row][col] = deck[deckIndex];
    newUsedIndices.add(deckIndex);
    newGridMapping.set(`${row}-${col}`, deckIndex);

    // Update all state
    setGrid(newGrid);
    setUsedDeckIndices(newUsedIndices);
    setGridToDeck(newGridMapping);
  };


  // Move letter from one grid position to another
  const shiftGridLetter = (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    if (grid[fromRow][fromCol] === '') return; // No letter to move

    const newGrid = grid.map(r => [...r]);
    const letter = newGrid[fromRow][fromCol];
    const newMapping = new Map(gridToDeck);

    // If target position is empty, just move it there
    if (newGrid[toRow][toCol] === '') {
      newGrid[toRow][toCol] = letter;
      newGrid[fromRow][fromCol] = '';

      // Update mapping
      const deckIndex = gridToDeck.get(`${fromRow}-${fromCol}`);
      if (deckIndex !== undefined) {
        newMapping.delete(`${fromRow}-${fromCol}`);
        newMapping.set(`${toRow}-${toCol}`, deckIndex);
      }
    } else {
      // Swap with existing letter
      const targetLetter = newGrid[toRow][toCol];
      newGrid[toRow][toCol] = letter;
      newGrid[fromRow][fromCol] = targetLetter;

      // Update mapping - swap the deck indices
      const fromDeckIndex = gridToDeck.get(`${fromRow}-${fromCol}`);
      const toDeckIndex = gridToDeck.get(`${toRow}-${toCol}`);
      if (fromDeckIndex !== undefined) {
        newMapping.set(`${toRow}-${toCol}`, fromDeckIndex);
      }
      if (toDeckIndex !== undefined) {
        newMapping.set(`${fromRow}-${fromCol}`, toDeckIndex);
      }
    }

    setGrid(newGrid);
    setGridToDeck(newMapping);
  };

  // Remove letter from grid (send back to available pool)
  const removeFromGrid = (row: number, col: number) => {
    if (grid[row][col] === '') return;

    // Find which deck card this was
    const deckIndex = gridToDeck.get(`${row}-${col}`);

    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = '';
    setGrid(newGrid);

    // Ungray the deck card
    if (deckIndex !== undefined) {
      const newUsedIndices = new Set(usedDeckIndices);
      newUsedIndices.delete(deckIndex);
      setUsedDeckIndices(newUsedIndices);

      // Remove mapping
      const newMapping = new Map(gridToDeck);
      newMapping.delete(`${row}-${col}`);
      setGridToDeck(newMapping);
    }
  };


  // Drag and drop handlers (desktop)
  const handleDragStart = (type: 'deck' | 'grid', deckIndex?: number, row?: number, col?: number) => {
    if (type === 'deck' && deckIndex !== undefined) {
      setDraggedFrom({ type: 'deck', deckIndex });
    } else if (type === 'grid' && row !== undefined && col !== undefined) {
      setDraggedFrom({ type: 'grid', gridPos: { row, col } });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDropOnGrid = (targetRow: number, targetCol: number) => {
    if (!draggedFrom) return;

    if (draggedFrom.type === 'deck' && draggedFrom.deckIndex !== undefined) {
      // Dragging from deck to grid
      moveDeckToGrid(draggedFrom.deckIndex, targetRow, targetCol);
    } else if (draggedFrom.type === 'grid' && draggedFrom.gridPos) {
      // Dragging within grid - allow dragging to different positions
      const fromRow = draggedFrom.gridPos.row;
      const fromCol = draggedFrom.gridPos.col;

      // Don't do anything if dropping on the same position
      if (fromRow === targetRow && fromCol === targetCol) {
        setDraggedFrom(null);
        return;
      }

      shiftGridLetter(fromRow, fromCol, targetRow, targetCol);
    }

    setDraggedFrom(null);
  };

  // Touch handlers (mobile)
  const handleTouchStart = (type: 'deck' | 'grid', deckIndex?: number, row?: number, col?: number) => {
    if (type === 'deck' && deckIndex !== undefined && !usedDeckIndices.has(deckIndex)) {
      setDraggedFrom({ type: 'deck', deckIndex });
    } else if (type === 'grid' && row !== undefined && col !== undefined && grid[row][col] !== '') {
      setDraggedFrom({ type: 'grid', gridPos: { row, col } });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Note: preventDefault is handled via touch-action CSS instead
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!draggedFrom) return;

    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (element) {
      // Check for grid cell
      const gridRow = element.getAttribute('data-grid-row');
      const gridCol = element.getAttribute('data-grid-col');
      if (gridRow !== null && gridCol !== null) {
        handleDropOnGrid(parseInt(gridRow), parseInt(gridCol));
        setDraggedFrom(null);
        return;
      }
    }

    // If dragging from grid and didn't drop on another grid cell, remove the tile
    if (draggedFrom.type === 'grid' && draggedFrom.gridPos) {
      removeFromGrid(draggedFrom.gridPos.row, draggedFrom.gridPos.col);
    }

    setDraggedFrom(null);
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <GameNav currentGame="wordcrossv2" />

      <div className="text-center pt-14 sm:pt-16 md:pt-20 px-2">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 md:mb-4">Word Cross V2</h1>

        {/* Mode Selector */}
        <div className="mb-4 md:mb-6">
          <div className="flex gap-2 sm:gap-3 justify-center items-center mb-2">
            <button
              onClick={() => startNewGame('random')}
              className={`px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg font-semibold transition-colors ${
                puzzleMode === 'random'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Random
            </button>
            <button
              onClick={() => startNewGame('daily')}
              className={`px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg font-semibold transition-colors ${
                puzzleMode === 'daily'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Daily
            </button>
          </div>
          {currentPuzzleInfo && (
            <p className="text-xs sm:text-sm text-gray-600">
              Puzzle #{currentPuzzleInfo.id} {puzzleMode === 'daily' && `• Today's Challenge`}
            </p>
          )}
        </div>

        {/* Grid Validation Status */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-1 md:mb-2">
            <p className="text-sm sm:text-base md:text-xl font-semibold">
              Status:
              <span className={`ml-1 sm:ml-2 ${gridValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {gridValidation.isValid ? '✓ Valid' : '✗ Invalid'}
              </span>
            </p>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">
            Score: {gridValidation.totalScore} / {targetScore}
          </p>

          {/* Win Detection */}
          {gridValidation.isValid && gridValidation.totalScore === targetScore && gridValidation.totalScore > 0 && (
            <div className="mt-3 md:mt-4 p-3 md:p-4 bg-green-100 border-2 border-green-500 rounded-lg mx-2">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-700">🎉 Perfect! You solved it!</p>
              <p className="text-xs sm:text-sm text-green-600 mt-1">All 25 tiles placed with valid words!</p>
            </div>
          )}

          {/* Valid Words */}
          {gridValidation.validWords.length > 0 && (
            <div className="mt-2">
              <p className="text-xs sm:text-sm text-green-600 font-semibold">Valid words in grid:</p>
              <div className="flex flex-wrap gap-1 sm:gap-2 justify-center mt-1 px-2">
                {gridValidation.validWords.map((word, idx) => (
                  <span key={idx} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded text-xs sm:text-sm">
                    {word.toUpperCase()} ({calculateScore(word)})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Invalid Words */}
          {gridValidation.invalidWords.length > 0 && (
            <div className="mt-2">
              <p className="text-xs sm:text-sm text-red-600 font-semibold">Invalid words:</p>
              <div className="flex flex-wrap gap-1 sm:gap-2 justify-center mt-1 px-2">
                {gridValidation.invalidWords.map((word, idx) => (
                  <span key={idx} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-100 text-red-700 rounded text-xs sm:text-sm">
                    {word.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submitted Words History */}
        {submittedWords.length > 0 && (
          <div className="mb-4 md:mb-6">
            <p className="text-xs sm:text-sm font-semibold mb-2">Submitted Words:</p>
            <div className="flex flex-wrap gap-1 sm:gap-2 justify-center px-2">
              {submittedWords.map((word, idx) => (
                <span key={idx} className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-100 rounded text-xs sm:text-sm">
                  {word} ({calculateScore(word)})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 5x5 Grid */}
        <div className="mb-6 md:mb-12 flex flex-col md:flex-row justify-center gap-4 md:gap-8">
          <div>
            <p className="text-sm sm:text-base md:text-lg font-semibold mb-2 md:mb-3 text-center">Your Grid</p>
            <div className="grid grid-cols-5 gap-2 max-w-xs sm:max-w-sm md:max-w-md mx-auto">
              {grid.map((row, rowIndex) =>
                row.map((letter, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    data-grid-row={rowIndex}
                    data-grid-col={colIndex}
                    draggable={letter !== ''}
                    onDragStart={() => handleDragStart('grid', undefined, rowIndex, colIndex)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDropOnGrid(rowIndex, colIndex)}
                    onTouchStart={() => handleTouchStart('grid', undefined, rowIndex, colIndex)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onDoubleClick={() => {
                      // Desktop: double-click to remove
                      if (letter !== '') {
                        removeFromGrid(rowIndex, colIndex);
                      }
                    }}
                    className={`aspect-square rounded border-2 flex flex-col items-center justify-center relative touch-none ${
                      letter === ''
                        ? 'bg-gray-100 border-gray-400 border-dashed'
                        : 'bg-white border-blue-400 cursor-move hover:shadow-lg hover:scale-105 transition-all'
                    }`}
                  >
                    <span className="text-base sm:text-lg md:text-2xl font-bold text-gray-800">{letter}</span>
                    {letter && (
                      <span className="text-[9px] sm:text-[10px] md:text-xs absolute bottom-1 right-1 text-gray-600">
                        {letterPoints[letter]}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Solution Grid (only show if enabled) */}
          {showSolution && hiddenSolution && (
            <div>
              <p className="text-sm sm:text-base md:text-lg font-semibold mb-2 md:mb-3 text-center text-yellow-600">Solution</p>
              <div className="grid grid-cols-5 gap-2 max-w-xs sm:max-w-sm md:max-w-md mx-auto">
                {hiddenSolution.map((row, rowIndex) =>
                  row.map((letter, colIndex) => (
                    <div
                      key={`sol-${rowIndex}-${colIndex}`}
                      className="aspect-square rounded border-2 border-yellow-500 bg-yellow-50 flex flex-col items-center justify-center relative"
                    >
                      <span className="text-base sm:text-lg md:text-2xl font-bold text-gray-800">{letter}</span>
                      <span className="text-[9px] sm:text-[10px] md:text-xs absolute bottom-1 right-1 text-gray-600">
                        {letterPoints[letter]}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Deck - 25 letter cards */}
        <div className="px-2">
          <p className="text-sm sm:text-base md:text-lg font-semibold mb-2 md:mb-3">Your Deck (drag to grid)</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-3 justify-center items-center max-w-xs sm:max-w-2xl md:max-w-4xl mx-auto">
            {deck.map((letter, index) => {
              const isUsed = usedDeckIndices.has(index);
              return (
                <div
                  key={index}
                  draggable={!isUsed}
                  onDragStart={() => handleDragStart('deck', index)}
                  onTouchStart={() => handleTouchStart('deck', index)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`w-11 h-16 sm:w-14 sm:h-20 md:w-16 md:h-24 rounded-lg shadow-lg flex flex-col items-center justify-center relative border-2 transition-all touch-none ${
                    isUsed
                      ? 'bg-gray-300 border-gray-400 opacity-50 cursor-not-allowed'
                      : 'bg-white border-gray-300 cursor-move hover:shadow-xl hover:scale-105'
                  }`}
                >
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">{letter}</span>
                  <span className="text-[9px] sm:text-[10px] md:text-xs absolute bottom-0.5 sm:bottom-1 right-0.5 sm:right-1 text-gray-600">
                    {letterPoints[letter]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center mt-6 md:mt-8 px-4">
          <button
            onClick={() => startNewGame(puzzleMode)}
            disabled={isGenerating}
            className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : puzzleMode === 'daily' ? 'Reset Daily' : 'New Random'}
          </button>
          {hiddenSolution && (
            <button
              onClick={() => setShowSolution(!showSolution)}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold"
            >
              {showSolution ? 'Hide Solution' : 'Show Solution'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
