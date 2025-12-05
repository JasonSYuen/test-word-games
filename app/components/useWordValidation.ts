'use client'

import { useState, useEffect } from 'react';
import { isValidWord, calculateScore } from './wordValidation';

/**
 * Custom hook for word validation and scoring
 * @param word - The word to validate
 * @returns Object containing validation state and score
 */
export function useWordValidation(word: string) {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (word.length > 0) {
      const valid = isValidWord(word);
      setIsValid(valid);
      setScore(calculateScore(word));
    } else {
      setIsValid(null);
      setScore(0);
    }
  }, [word]);

  return { isValid, score };
}
