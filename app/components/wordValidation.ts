import words10 from 'wordlist-english/english-words-10.json';
import words20 from 'wordlist-english/english-words-20.json';
import words35 from 'wordlist-english/english-words-35.json';
import words40 from 'wordlist-english/english-words-40.json';
import words50 from 'wordlist-english/english-words-50.json';
import words55 from 'wordlist-english/english-words-55.json';

// Combine word lists - 10 (most common) through 55 for broader vocabulary
const allWords = [...words10, ...words20, ...words35, ...words40, ...words50, ...words55];

// Create a Set for fast word lookup - O(1)
export const validWords = new Set(allWords.map(w => w.toLowerCase()));

// Scrabble letter point values
export const letterPoints: { [key: string]: number } = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
  'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
  'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
  'Y': 4, 'Z': 10
};

// Calculate score for a word
export function calculateScore(word: string): number {
  return word.toUpperCase().split('').reduce((score, letter) => {
    return score + (letterPoints[letter] || 0);
  }, 0);
}

// Validate if a word is in the dictionary
export function isValidWord(word: string, minLength: number = 3): boolean {
  return word.length >= minLength && validWords.has(word.toLowerCase());
}
