import { letterPoints, isValidWord, commonWords } from './wordValidation';
import crosswordData from '@/app/data/crosswords.json';

export type CrosswordSolution = {
  id: number;
  date: string;
  grid: string[][];
  horizontalWords: string[];
  verticalWords: string[];
  totalScore: number;
};

// Extract all 5-letter words from the most common dictionary
// OPTIMIZATION: Only use most common words (frequency 10) for faster generation
function getFiveLetterWords(): string[] {
  const fiveLetterWords: string[] = [];

  for (const word of commonWords) {
    if (word.length === 5) {
      fiveLetterWords.push(word.toUpperCase());
    }
  }

  return fiveLetterWords;
}

// Cache the 5-letter words list (computed once)
let FIVE_LETTER_WORDS: string[] | null = null;

function getFiveLetterWordsList(): string[] {
  if (FIVE_LETTER_WORDS === null) {
    FIVE_LETTER_WORDS = getFiveLetterWords();
    console.log(`Loaded ${FIVE_LETTER_WORDS.length} five-letter words from common dictionary`);
  }
  return FIVE_LETTER_WORDS;
}

// Index words by letter at each position for faster lookup
type PositionIndex = Map<string, string[]>; // letter -> words with that letter at this position

let POSITION_INDICES: PositionIndex[] | null = null;

function getPositionIndices(): PositionIndex[] {
  if (POSITION_INDICES === null) {
    const words = getFiveLetterWordsList();
    POSITION_INDICES = [];

    // Create an index for each of the 5 positions
    for (let pos = 0; pos < 5; pos++) {
      const index = new Map<string, string[]>();

      for (const word of words) {
        const letter = word[pos];
        if (!index.has(letter)) {
          index.set(letter, []);
        }
        index.get(letter)!.push(word);
      }

      POSITION_INDICES.push(index);
    }

    console.log('Built position indices for fast lookup');
  }
  return POSITION_INDICES;
}

// Get words that match a partial row (some cells filled, some empty)
function getWordsForRow(grid: string[][], row: number): string[] {
  const allWords = getFiveLetterWordsList();
  const candidates: string[] = [];

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
function getWordsForColumn(grid: string[][], col: number): string[] {
  const allWords = getFiveLetterWordsList();
  const candidates: string[] = [];

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
function hasValidContinuation(grid: string[][], filledRows: Set<number>, filledCols: Set<number>, usedWords: Set<string>): boolean {
  // Check all unfilled rows
  for (let row = 0; row < 5; row++) {
    if (!filledRows.has(row)) {
      const possibleWords = getWordsForRow(grid, row);
      // Filter out words that are already used
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
      // Filter out words that are already used
      const availableWords = possibleWords.filter(word => !usedWords.has(word));
      if (availableWords.length === 0) {
        return false;
      }
    }
  }

  return true;
}

// Alternating backtracking: place row, then col, then row, etc.
function fillGridAlternating(
  grid: string[][],
  step: number,
  filledRows: Set<number>,
  filledCols: Set<number>,
  horizontalWords: string[],
  verticalWords: string[],
  usedWords: Set<string>
): boolean {
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
      return fillGridAlternating(grid, step + 1, filledRows, filledCols, horizontalWords, verticalWords, usedWords);
    }

    const candidates = getWordsForRow(grid, index);
    // Filter out already used words
    const availableCandidates = candidates.filter(word => !usedWords.has(word));
    // Shuffle for variety
    const shuffledCandidates = availableCandidates.sort(() => Math.random() - 0.5);

    for (const word of shuffledCandidates) {
      // Place the word
      for (let col = 0; col < 5; col++) {
        grid[index][col] = word[col];
      }
      horizontalWords[index] = word;
      filledRows.add(index);
      usedWords.add(word);

      // Check if remaining slots still have valid options
      if (hasValidContinuation(grid, filledRows, filledCols, usedWords)) {
        if (fillGridAlternating(grid, step + 1, filledRows, filledCols, horizontalWords, verticalWords, usedWords)) {
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
      usedWords.delete(word);
    }

    return false;
  } else if (!isRowStep && index < 5) {
    // Place a vertical word in column `index`
    if (filledCols.has(index)) {
      return fillGridAlternating(grid, step + 1, filledRows, filledCols, horizontalWords, verticalWords, usedWords);
    }

    const candidates = getWordsForColumn(grid, index);
    // Filter out already used words
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
      usedWords.add(word);

      // Check if remaining slots still have valid options
      if (hasValidContinuation(grid, filledRows, filledCols, usedWords)) {
        if (fillGridAlternating(grid, step + 1, filledRows, filledCols, horizontalWords, verticalWords, usedWords)) {
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
      usedWords.delete(word);
    }

    return false;
  }

  // Skip to next step if current index is already filled
  return fillGridAlternating(grid, step + 1, filledRows, filledCols, horizontalWords, verticalWords, usedWords);
}

// Generate a valid 5x5 crossword using alternating backtracking
export function generateCrossword(): CrosswordSolution | null {
  const grid: string[][] = Array(5).fill(null).map(() => Array(5).fill(''));
  const horizontalWords: string[] = Array(5).fill('');
  const verticalWords: string[] = Array(5).fill('');
  const filledRows = new Set<number>();
  const filledCols = new Set<number>();
  const usedWords = new Set<string>();

  // Try to fill the grid using alternating row/col backtracking
  if (fillGridAlternating(grid, 0, filledRows, filledCols, horizontalWords, verticalWords, usedWords)) {
    let totalScore = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        totalScore += letterPoints[grid[row][col]] || 0;
      }
    }

    // Generate a temporary ID and date for live-generated crosswords
    const now = new Date();
    return {
      id: 0,
      date: now.toISOString().split('T')[0],
      grid,
      horizontalWords,
      verticalWords,
      totalScore
    };
  }

  return null;
}

// Extract deck from crossword solution
export function extractDeckFromCrossword(solution: CrosswordSolution): string[] {
  const deck: string[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      deck.push(solution.grid[row][col]);
    }
  }
  return deck;
}

// Get a random crossword from pre-generated data, with fallback to live generation
export function getRandomCrossword(): CrosswordSolution | null {
  // Try to use pre-generated crosswords first for instant loading
  if (crosswordData && Array.isArray(crosswordData) && crosswordData.length > 0) {
    const randomIndex = Math.floor(Math.random() * crosswordData.length);
    const crossword = crosswordData[randomIndex];

    // Type check to ensure it's a valid crossword
    if (crossword && crossword.grid && crossword.horizontalWords && crossword.verticalWords) {
      console.log(`Loaded pre-generated crossword #${crossword.id || randomIndex + 1} (${crossword.date || 'no date'})`);
      return crossword as CrosswordSolution;
    }
  }

  // Fallback to live generation if JSON data is unavailable or invalid
  console.log('Pre-generated crosswords unavailable, generating live crossword...');
  return generateCrossword();
}

// Get the daily crossword based on today's date
export function getDailyCrossword(): CrosswordSolution | null {
  if (!crosswordData || !Array.isArray(crosswordData) || crosswordData.length === 0) {
    console.log('No pre-generated crosswords available for daily puzzle');
    return null;
  }

  // Calculate days since epoch (1970-01-01) to get a consistent daily index
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  const epochDate = new Date('1970-01-01');
  const daysSinceEpoch = Math.floor((today.getTime() - epochDate.getTime()) / (1000 * 60 * 60 * 24));

  // Use modulo to cycle through available puzzles
  const dailyIndex = daysSinceEpoch % crosswordData.length;
  const crossword = crosswordData[dailyIndex];

  // Type check to ensure it's a valid crossword
  if (crossword && crossword.grid && crossword.horizontalWords && crossword.verticalWords) {
    console.log(`Loaded daily crossword #${crossword.id || dailyIndex + 1} for ${today.toISOString().split('T')[0]}`);
    return crossword as CrosswordSolution;
  }

  return null;
}

// Get a specific crossword by ID
export function getCrosswordById(id: number): CrosswordSolution | null {
  if (!crosswordData || !Array.isArray(crosswordData) || crosswordData.length === 0) {
    return null;
  }

  const crossword = crosswordData.find(c => c.id === id);

  if (crossword && crossword.grid && crossword.horizontalWords && crossword.verticalWords) {
    console.log(`Loaded crossword #${crossword.id} (${crossword.date})`);
    return crossword as CrosswordSolution;
  }

  return null;
}
