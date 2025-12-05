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

// Generate array of 10 random letters
function generateDeck(): string[] {
  return Array.from({ length: 10 }, () => getRandomLetter());
}

export default function DeckPage() {
  const [deck, setDeck] = useState<string[]>([]);
  const [wordBar, setWordBar] = useState<string[]>(Array(10).fill(''));
  const [usedDeckIndices, setUsedDeckIndices] = useState<Set<number>>(new Set());
  const [draggedFrom, setDraggedFrom] = useState<{type: 'deck' | 'wordBar', index: number} | null>(null);
  // Map word bar index to deck index to track which deck card is where
  const [wordBarToDeck, setWordBarToDeck] = useState<Map<number, number>>(new Map());
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState('');

  // Use the custom validation hook
  const { isValid, score: currentScore } = useWordValidation(currentWord);

  // Generate deck only on client side to avoid hydration mismatch
  useEffect(() => {
    setDeck(generateDeck());
  }, []);

  // Update current word whenever word bar changes
  useEffect(() => {
    const word = wordBar.filter(letter => letter !== '').join('');
    setCurrentWord(word);
  }, [wordBar]);

  // Move letter from deck to word bar
  const moveDeckToWordBar = (deckIndex: number) => {
    // Check if this deck card has already been used
    if (usedDeckIndices.has(deckIndex)) return;

    // Find first empty spot in word bar
    const firstEmptyIndex = wordBar.findIndex(slot => slot === '');
    if (firstEmptyIndex === -1) return; // Word bar is full

    const newWordBar = [...wordBar];
    newWordBar[firstEmptyIndex] = deck[deckIndex];
    setWordBar(newWordBar);

    // Mark this deck index as used and track mapping
    setUsedDeckIndices(new Set([...usedDeckIndices, deckIndex]));
    const newMapping = new Map(wordBarToDeck);
    newMapping.set(firstEmptyIndex, deckIndex);
    setWordBarToDeck(newMapping);
  };

  // Move letter from one word bar position to another
  const shiftWordBarLetter = (fromIndex: number, toIndex: number) => {
    if (wordBar[fromIndex] === '') return; // No letter to move

    const newWordBar = [...wordBar];
    const letter = newWordBar[fromIndex];
    const newMapping = new Map(wordBarToDeck);

    // If target position is empty, just move it there
    if (newWordBar[toIndex] === '') {
      newWordBar[toIndex] = letter;
      newWordBar[fromIndex] = '';

      // Update mapping
      const deckIndex = wordBarToDeck.get(fromIndex);
      if (deckIndex !== undefined) {
        newMapping.delete(fromIndex);
        newMapping.set(toIndex, deckIndex);
      }
    } else {
      // Swap with existing letter
      const targetLetter = newWordBar[toIndex];
      newWordBar[toIndex] = letter;
      newWordBar[fromIndex] = targetLetter;

      // Update mapping - swap the deck indices
      const fromDeckIndex = wordBarToDeck.get(fromIndex);
      const toDeckIndex = wordBarToDeck.get(toIndex);
      if (fromDeckIndex !== undefined) {
        newMapping.set(toIndex, fromDeckIndex);
      }
      if (toDeckIndex !== undefined) {
        newMapping.set(fromIndex, toDeckIndex);
      }
    }

    setWordBar(newWordBar);
    setWordBarToDeck(newMapping);
  };

  // Remove letter from word bar (send back to available pool)
  const removeFromWordBar = (wordBarIndex: number) => {
    if (wordBar[wordBarIndex] === '') return;

    // Find which deck card this was
    const deckIndex = wordBarToDeck.get(wordBarIndex);

    const newWordBar = [...wordBar];
    newWordBar[wordBarIndex] = '';
    setWordBar(newWordBar);

    // Ungray the deck card
    if (deckIndex !== undefined) {
      const newUsedIndices = new Set(usedDeckIndices);
      newUsedIndices.delete(deckIndex);
      setUsedDeckIndices(newUsedIndices);

      // Remove mapping
      const newMapping = new Map(wordBarToDeck);
      newMapping.delete(wordBarIndex);
      setWordBarToDeck(newMapping);
    }
  };

  // Submit word
  const submitWord = () => {
    if (isValid && currentWord.length >= 3) {
      setSubmittedWords([...submittedWords, currentWord.toUpperCase()]);

      // Clear the word bar and reset deck indices
      setWordBar(Array(10).fill(''));
      setUsedDeckIndices(new Set());
      setWordBarToDeck(new Map());
    }
  };

  // Refresh deck - re-randomize unused cards
  const refreshDeck = () => {
    const newDeck = [...deck];
    for (let i = 0; i < newDeck.length; i++) {
      // Only re-randomize cards that aren't in use
      if (!usedDeckIndices.has(i)) {
        newDeck[i] = getRandomLetter();
      }
    }
    setDeck(newDeck);
  };

  // Drag and drop handlers (desktop)
  const handleDragStart = (type: 'deck' | 'wordBar', index: number) => {
    setDraggedFrom({ type, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDropOnWordBar = (targetIndex: number) => {
    if (!draggedFrom) return;

    if (draggedFrom.type === 'deck') {
      // Dragging from deck to word bar
      if (usedDeckIndices.has(draggedFrom.index)) return;

      const newWordBar = [...wordBar];
      const newUsedIndices = new Set(usedDeckIndices);
      const newMapping = new Map(wordBarToDeck);

      // If target slot is occupied, free up that tile's deck card
      if (wordBar[targetIndex] !== '') {
        const oldDeckIndex = wordBarToDeck.get(targetIndex);
        if (oldDeckIndex !== undefined) {
          newUsedIndices.delete(oldDeckIndex);
          newMapping.delete(targetIndex);
        }
      }

      // Place new tile
      newWordBar[targetIndex] = deck[draggedFrom.index];
      newUsedIndices.add(draggedFrom.index);
      newMapping.set(targetIndex, draggedFrom.index);

      // Update all state
      setWordBar(newWordBar);
      setUsedDeckIndices(newUsedIndices);
      setWordBarToDeck(newMapping);
    } else if (draggedFrom.type === 'wordBar') {
      // Dragging within word bar
      shiftWordBarLetter(draggedFrom.index, targetIndex);
    }

    setDraggedFrom(null);
  };

  // Touch handlers (mobile)
  const handleTouchStart = (type: 'deck' | 'wordBar', index: number) => {
    if (type === 'deck' && usedDeckIndices.has(index)) return;
    setDraggedFrom({ type, index });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!draggedFrom) return;

    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (element) {
      const wordBarIndex = element.getAttribute('data-wordbar-index');
      if (wordBarIndex !== null) {
        handleDropOnWordBar(parseInt(wordBarIndex));
      }
    }

    setDraggedFrom(null);
  };

  return (
    <div className="min-h-screen p-8">
      <GameNav currentGame="deck" />

      <div className="text-center pt-20">
        <h1 className="text-4xl font-bold mb-8">Deck Mode</h1>

        {/* Score Display */}
        <div className="mb-6">
          <p className="text-xl">
            Current Word: <span className="font-bold">{currentWord || '(empty)'}</span>
            {isValid !== null && (
              <span className={`ml-3 text-lg ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                {isValid ? '✓ Valid' : '✗ Invalid'}
              </span>
            )}
          </p>
          <p className="text-lg font-semibold mt-1">
            Word Score: {currentScore} points
          </p>
        </div>

        {/* Submit Button */}
        <div className="mb-6">
          <button
            onClick={submitWord}
            disabled={!isValid || currentWord.length < 3}
            className="px-8 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
          >
            Submit Word
          </button>
        </div>

        {/* Submitted Words History */}
        {submittedWords.length > 0 && (
          <div className="mb-6">
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

        {/* Word Bar - 10 blank tiles */}
        <div className="mb-12">
          <p className="text-lg font-semibold mb-3">Word Bar (drag tiles here or click to remove)</p>
          <div className="flex gap-2 justify-center items-center">
            {wordBar.map((letter, index) => (
              <div
                key={index}
                data-wordbar-index={index}
                draggable={letter !== ''}
                onDragStart={() => handleDragStart('wordBar', index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDropOnWordBar(index)}
                onTouchStart={() => handleTouchStart('wordBar', index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => {
                  // Right-click or click to remove
                  if (letter !== '') {
                    removeFromWordBar(index);
                  }
                }}
                className={`w-14 h-14 rounded border-2 flex flex-col items-center justify-center relative ${
                  letter === ''
                    ? 'bg-gray-100 border-gray-400 border-dashed'
                    : 'bg-white border-blue-400 cursor-move hover:shadow-lg hover:scale-105 transition-all'
                }`}
              >
                <span className="text-2xl font-bold text-gray-800">{letter}</span>
                {letter && (
                  <span className="text-xs absolute bottom-1 right-1 text-gray-600">
                    {letterPoints[letter]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Deck - 10 letter cards */}
        <div>
          <p className="text-lg font-semibold mb-3">Your Deck (drag to word bar or click to add)</p>
          <div className="flex gap-3 justify-center items-center">
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
                  onClick={() => moveDeckToWordBar(index)}
                  className={`w-16 h-24 rounded-lg shadow-lg flex flex-col items-center justify-center relative border-2 transition-all ${
                    isUsed
                      ? 'bg-gray-300 border-gray-400 opacity-50 cursor-not-allowed'
                      : 'bg-white border-gray-300 cursor-move hover:shadow-xl hover:scale-105'
                  }`}
                >
                  <span className="text-3xl font-bold text-gray-800">{letter}</span>
                  <span className="text-xs absolute bottom-1 right-1 text-gray-600">
                    {letterPoints[letter]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4 justify-center mt-8">
          <button
            onClick={refreshDeck}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
          >
            Refresh Deck
          </button>
          <button
            onClick={() => {
              setDeck(generateDeck());
              setWordBar(Array(10).fill(''));
              setUsedDeckIndices(new Set());
              setWordBarToDeck(new Map());
              setSubmittedWords([]);
            }}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
