'use client'

import { useState, useEffect } from "react";
import GameNav from '@/app/components/GameNav';
import { letterPoints } from '@/app/components/wordValidation';

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

// Generate a choice of 3 random letters
function generateChoices(): string[] {
  return [getRandomLetter(), getRandomLetter(), getRandomLetter()];
}

export default function InkpotsPage() {
  const [deck, setDeck] = useState<string[]>([]);
  const [currentChoices, setCurrentChoices] = useState<string[]>([]);

  // Generate initial choices on client side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentChoices(generateChoices());
  }, []);

  const handleChooseLetter = (letter: string) => {
    // Add the chosen letter to the deck
    setDeck([...deck, letter]);

    // Generate new choices
    setCurrentChoices(generateChoices());
  };

  const handleRestart = () => {
    setDeck([]);
    setCurrentChoices(generateChoices());
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <GameNav currentGame="inkpots" />

      <div className="text-center pt-20 px-2">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Inkpots</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Draft your deck by choosing letters
        </p>

        {/* Current Choices */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Choose a letter:</h2>
          <div className="flex gap-4 justify-center">
            {currentChoices.map((letter, idx) => (
              <button
                key={idx}
                onClick={() => handleChooseLetter(letter)}
                className="w-24 h-32 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer flex flex-col items-center justify-center"
              >
                <span className="text-4xl font-bold text-gray-800 dark:text-gray-100">{letter}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {letterPoints[letter]} pts
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Deck Display */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Your Deck ({deck.length} letters)
          </h2>

          {deck.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 italic">No letters chosen yet</p>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
              {deck.map((letter, idx) => (
                <div
                  key={idx}
                  className="w-12 h-16 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-600 rounded flex flex-col items-center justify-center"
                >
                  <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{letter}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {letterPoints[letter]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleRestart}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}
