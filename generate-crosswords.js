// Script to generate crosswords and save to JSON
// Run with: node generate-crosswords.js

const fs = require('fs');

// Mock the word validation module
const words10 = require('wordlist-english/english-words-10.json');
const words20 = require('wordlist-english/english-words-20.json');
const words35 = require('wordlist-english/english-words-35.json');

// Create commonWords set (frequency 10, 20, and 35)
const commonWords = new Set([...words10, ...words20, ...words35].map(w => w.toLowerCase()));

// Scrabble letter point values
const letterPoints = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
  'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
  'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
  'Y': 4, 'Z': 10
};

// Validate if a word is in the dictionary
function isValidWord(word, minLength = 3) {
  return word.length >= minLength && commonWords.has(word.toLowerCase());
}

// Extract all 5-letter words from the most common dictionary
function getFiveLetterWords() {
  const fiveLetterWords = [];

  for (const word of commonWords) {
    if (word.length === 5) {
      fiveLetterWords.push(word.toUpperCase());
    }
  }

  return fiveLetterWords;
}

// Cache the 5-letter words list (computed once)
let FIVE_LETTER_WORDS = null;

function getFiveLetterWordsList() {
  if (FIVE_LETTER_WORDS === null) {
    FIVE_LETTER_WORDS = getFiveLetterWords();
    console.log(`Loaded ${FIVE_LETTER_WORDS.length} five-letter words from common dictionary`);
  }
  return FIVE_LETTER_WORDS;
}

// Get words that match a partial row (some cells filled, some empty)
function getWordsForRow(grid, row) {
  const allWords = getFiveLetterWordsList();
  const candidates = [];

  for (const word of allWords) {
    let matches = true;
    for (let col = 0; col < 5; col++) {
      if (grid[row][col] !== '' && grid[row][col] !== word[col]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      candidates.push(word);
    }
  }

  return candidates;
}

// Get words that match a partial column (some cells filled, some empty)
function getWordsForColumn(grid, col) {
  const allWords = getFiveLetterWordsList();
  const candidates = [];

  for (const word of allWords) {
    let matches = true;
    for (let row = 0; row < 5; row++) {
      if (grid[row][col] !== '' && grid[row][col] !== word[row]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      candidates.push(word);
    }
  }

  return candidates;
}

// Check if all empty rows and columns still have at least one possible word
function hasValidContinuation(grid, filledRows, filledCols, horizontalWords, verticalWords) {
  // Create set of all used words (both horizontal and vertical)
  const usedWords = new Set([
    ...horizontalWords.filter(w => w !== ''),
    ...verticalWords.filter(w => w !== '')
  ]);

  // Check all unfilled rows
  for (let row = 0; row < 5; row++) {
    if (!filledRows.has(row)) {
      const possibleWords = getWordsForRow(grid, row);
      // Filter out words already used anywhere
      const availableWords = possibleWords.filter(word => !usedWords.has(word));
      if (availableWords.length === 0) {
        return false;
      }
    }
  }

  // Check all unfilled columns
  for (let col = 0; col < 5; col++) {
    if (!filledCols.has(col)) {
      const possibleWords = getWordsForColumn(grid, col);
      // Filter out words already used anywhere
      const availableWords = possibleWords.filter(word => !usedWords.has(word));
      if (availableWords.length === 0) {
        return false;
      }
    }
  }

  return true;
}

// Add attempt counter for debugging
let attemptCount = 0;
const MAX_ATTEMPTS = 500000;

// Alternating backtracking: place row, then col, then row, etc.
function fillGridAlternating(grid, step, filledRows, filledCols, horizontalWords, verticalWords) {
  // Base case: all rows and columns filled
  if (filledRows.size === 5 && filledCols.size === 5) {
    return true;
  }

  // Determine what to place: alternate between rows and columns
  const isRowStep = step % 2 === 0;
  const index = Math.floor(step / 2);

  if (isRowStep && index < 5) {
    // Place a horizontal word in row `index`
    if (filledRows.has(index)) {
      return fillGridAlternating(grid, step + 1, filledRows, filledCols, horizontalWords, verticalWords);
    }

    const candidates = getWordsForRow(grid, index);
    // Filter out words already used (both horizontal and vertical)
    const usedWords = new Set([
      ...horizontalWords.filter(w => w !== ''),
      ...verticalWords.filter(w => w !== '')
    ]);
    const availableCandidates = candidates.filter(word => !usedWords.has(word));
    // Shuffle for variety
    const shuffledCandidates = availableCandidates.sort(() => Math.random() - 0.5);

    for (const word of shuffledCandidates) {
      attemptCount++;

      // Check if we've exceeded max attempts
      if (attemptCount >= MAX_ATTEMPTS) {
        return false;
      }

      // Place the word
      for (let col = 0; col < 5; col++) {
        grid[index][col] = word[col];
      }
      horizontalWords[index] = word;
      filledRows.add(index);

      // Check if remaining slots still have valid options
      if (hasValidContinuation(grid, filledRows, filledCols, horizontalWords, verticalWords)) {
        if (fillGridAlternating(grid, step + 1, filledRows, filledCols, horizontalWords, verticalWords)) {
          return true;
        }
      }

      // Backtrack
      for (let col = 0; col < 5; col++) {
        if (!filledCols.has(col)) {
          grid[index][col] = '';
        }
      }
      filledRows.delete(index);
      horizontalWords[index] = '';
    }

    return false;
  } else if (!isRowStep && index < 5) {
    // Place a vertical word in column `index`
    if (filledCols.has(index)) {
      return fillGridAlternating(grid, step + 1, filledRows, filledCols, horizontalWords, verticalWords);
    }

    const candidates = getWordsForColumn(grid, index);
    // Filter out words already used (both horizontal and vertical)
    const usedWords = new Set([
      ...horizontalWords.filter(w => w !== ''),
      ...verticalWords.filter(w => w !== '')
    ]);
    const availableCandidates = candidates.filter(word => !usedWords.has(word));
    // Shuffle for variety
    const shuffledCandidates = availableCandidates.sort(() => Math.random() - 0.5);

    for (const word of shuffledCandidates) {
      // Place the word
      for (let row = 0; row < 5; row++) {
        grid[row][index] = word[row];
      }
      verticalWords[index] = word;
      filledCols.add(index);

      // Check if remaining slots still have valid options
      if (hasValidContinuation(grid, filledRows, filledCols, horizontalWords, verticalWords)) {
        if (fillGridAlternating(grid, step + 1, filledRows, filledCols, horizontalWords, verticalWords)) {
          return true;
        }
      }

      // Backtrack
      for (let row = 0; row < 5; row++) {
        if (!filledRows.has(row)) {
          grid[row][index] = '';
        }
      }
      filledCols.delete(index);
      verticalWords[index] = '';
    }

    return false;
  }

  // Skip to next step if current index is already filled
  return fillGridAlternating(grid, step + 1, filledRows, filledCols, horizontalWords, verticalWords);
}

// Generate a valid 5x5 crossword using alternating backtracking
function generateCrossword(id, date) {
  let retryCount = 0;
  const maxRetries = 10;

  while (retryCount < maxRetries) {
    const grid = Array(5).fill(null).map(() => Array(5).fill(''));
    const horizontalWords = Array(5).fill('');
    const verticalWords = Array(5).fill('');
    const filledRows = new Set();
    const filledCols = new Set();

    attemptCount = 0;

    // Try to fill the grid using alternating row/col backtracking
    if (fillGridAlternating(grid, 0, filledRows, filledCols, horizontalWords, verticalWords)) {
      let totalScore = 0;
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          totalScore += letterPoints[grid[row][col]] || 0;
        }
      }

      return {
        id,
        date,
        grid,
        horizontalWords,
        verticalWords,
        totalScore
      };
    }

    retryCount++;
  }

  return null;
}

// Main script
console.log('Starting crossword generation...\n');

const TARGET_COUNT = 20;
const crosswords = [];
let successCount = 0;
let failCount = 0;

// Starting date for daily puzzles (can be adjusted)
const START_DATE = new Date('2024-01-01');

while (crosswords.length < TARGET_COUNT) {
  const startTime = Date.now();

  // Generate ID and date for this puzzle
  const puzzleId = crosswords.length + 1;
  const puzzleDate = new Date(START_DATE);
  puzzleDate.setDate(START_DATE.getDate() + crosswords.length);
  const dateString = puzzleDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  const crossword = generateCrossword(puzzleId, dateString);
  const endTime = Date.now();

  if (crossword) {
    successCount++;
    crosswords.push(crossword);
    console.log(`✓ Generated #${puzzleId} (${dateString}) in ${endTime - startTime}ms (${attemptCount} attempts)`);
  } else {
    failCount++;
    console.log(`✗ Generation failed after ${endTime - startTime}ms`);
  }
}

// Save to JSON file
const outputPath = './app/data/crosswords.json';
const outputDir = './app/data';

// Create directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(crosswords, null, 2));

console.log(`\n${'═'.repeat(50)}`);
console.log(`✓ Successfully generated ${TARGET_COUNT} crosswords!`);
console.log(`✓ Saved to: ${outputPath}`);
console.log(`Success rate: ${successCount}/${successCount + failCount}`);
console.log(`${'═'.repeat(50)}`);
