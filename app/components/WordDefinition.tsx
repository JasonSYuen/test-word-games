'use client'

import { useState, useEffect } from 'react';

interface Meaning {
  partOfSpeech: string;
  definitions: Array<{
    definition: string;
    example?: string;
    synonyms?: string[];
    antonyms?: string[];
  }>;
}

interface WordDefinitionProps {
  word: string;
  showAllMeanings?: boolean;
  className?: string;
}

export default function WordDefinition({ word, showAllMeanings = true, className = '' }: WordDefinitionProps) {
  const [meanings, setMeanings] = useState<Meaning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchDefinition = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);

        if (!response.ok) {
          setError(true);
          setLoading(false);
          return;
        }

        const data = await response.json();

        // Extract all meanings from the response
        if (data && data[0] && data[0].meanings) {
          setMeanings(data[0].meanings);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error(`Error fetching definition for "${word}":`, err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (word) {
      fetchDefinition();
    }
  }, [word]);

  if (loading) {
    return (
      <div className={`text-xs sm:text-sm text-gray-600 italic ${className}`}>
        Loading definition...
      </div>
    );
  }

  if (error || meanings.length === 0) {
    return (
      <div className={`text-xs sm:text-sm text-gray-500 italic ${className}`}>
        Definition not available
      </div>
    );
  }

  return (
    <div className={className}>
      {meanings.map((meaning, idx) => (
        <div key={idx} className={idx > 0 ? 'mt-2' : ''}>
          <p className="text-xs sm:text-sm font-semibold text-gray-700">
            {meaning.partOfSpeech}
          </p>
          {(showAllMeanings ? meaning.definitions : meaning.definitions.slice(0, 1)).map((def, defIdx) => (
            <div key={defIdx} className={defIdx > 0 ? 'mt-1' : ''}>
              <p className="text-xs sm:text-sm text-gray-700 italic">
                {defIdx + 1}. {def.definition}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
