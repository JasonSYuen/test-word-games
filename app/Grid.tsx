'use client'

import { useState } from 'react';

interface GridProps {
  words: string[];
}

export default function Grid({ words }: GridProps) {
  const [grid, setGrid] = useState<string[][]>(
    Array.from({ length: 8 }, () => Array(8).fill(''))
  );

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="grid grid-cols-8 gap-1 p-1 max-w-md">
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="border aspect-square flex items-center justify-center"
            >
              {cell}
            </div>
          ))
        )}
      </div>
      <div>
        <p>Total words: {words?.length || 0}</p>
      </div>
    </div>
  );
}
