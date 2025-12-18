'use client'

import { useState, useEffect } from "react";
import GameNav from '@/app/components/GameNav';

// Calculate hexagonal grid coordinates for a hexagon with side length 5
function generateHexGrid(sideLength: number): Array<{ q: number, r: number, s: number, color: string }> {
  const hexes: Array<{ q: number, r: number, s: number, color: string }> = [];
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b']; // red, blue, green, orange

  // Generate hexagon shape using axial coordinates
  for (let q = -sideLength + 1; q < sideLength; q++) {
    const r1 = Math.max(-sideLength + 1, -q - sideLength + 1);
    const r2 = Math.min(sideLength - 1, -q + sideLength - 1);

    for (let r = r1; r <= r2; r++) {
      const s = -q - r;
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      hexes.push({ q, r, s, color: randomColor });
    }
  }

  return hexes;
}

// Convert axial coordinates to pixel position
function axialToPixel(q: number, r: number, size: number): { x: number, y: number } {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = size * (3 / 2 * r);
  return { x, y };
}

export default function VisualHexesPage() {
  const [hexGrid, setHexGrid] = useState<Array<{ q: number, r: number, s: number, color: string }>>([]);
  const hexSize = 40; // Size of each hexagon in pixels
  const sideLength = 4;
  const [isDragging, setIsDragging] = useState(false);
  const [dragColor, setDragColor] = useState<string | null>(null);
  const [isAutoSpreading, setIsAutoSpreading] = useState(false);

  useEffect(() => {
    setHexGrid(generateHexGrid(sideLength));
  }, []);

  // Get adjacent hex coordinates (6 neighbors in hex grid)
  const getAdjacentIndices = (index: number): number[] => {
    const hex = hexGrid[index];
    if (!hex) return [];

    // Axial coordinate neighbors: 6 directions
    const neighbors = [
      { q: hex.q + 1, r: hex.r },     // right
      { q: hex.q - 1, r: hex.r },     // left
      { q: hex.q, r: hex.r + 1 },     // bottom-right
      { q: hex.q, r: hex.r - 1 },     // top-left
      { q: hex.q + 1, r: hex.r - 1 }, // top-right
      { q: hex.q - 1, r: hex.r + 1 }, // bottom-left
    ];

    // Find indices of neighbors that exist in the grid
    const adjacentIndices: number[] = [];
    neighbors.forEach(neighbor => {
      const idx = hexGrid.findIndex(h => h.q === neighbor.q && h.r === neighbor.r);
      if (idx !== -1) {
        adjacentIndices.push(idx);
      }
    });

    return adjacentIndices;
  };

  // Auto-spread colors every second
  useEffect(() => {
    if (!isAutoSpreading) return;

    const interval = setInterval(() => {
      setHexGrid(prevGrid => {
        const newGrid = [...prevGrid];

        // Pick 8 random tiles to spread from
        const tilesToSpread = [];
        for (let i = 0; i < 8 && i < newGrid.length; i++) {
          const randomIndex = Math.floor(Math.random() * newGrid.length);
          tilesToSpread.push(randomIndex);
        }

        // For each selected tile, spread its color to a random adjacent tile
        tilesToSpread.forEach(sourceIndex => {
          const adjacentIndices = getAdjacentIndices(sourceIndex);
          if (adjacentIndices.length > 0) {
            const targetIndex = adjacentIndices[Math.floor(Math.random() * adjacentIndices.length)];
            newGrid[targetIndex] = { ...newGrid[targetIndex], color: newGrid[sourceIndex].color };
          }
        });

        return newGrid;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isAutoSpreading, hexGrid.length]);

  const handleMouseDown = (index: number) => {
    setIsDragging(true);
    setDragColor(hexGrid[index].color);
  };

  const handleMouseEnter = (index: number) => {
    if (isDragging && dragColor) {
      const newGrid = [...hexGrid];
      newGrid[index] = { ...newGrid[index], color: dragColor };
      setHexGrid(newGrid);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragColor(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-500 p-4 md:p-8" onMouseUp={handleMouseUp}>
      <GameNav currentGame="visualhexes" />

      <div className="text-center pt-20 px-2">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Visual Hexes</h1>

        <div className="flex justify-center items-center">
          <svg
            width="800"
            height="800"
            viewBox="-250 -250 500 500"
            className="max-w-full select-none"
            onMouseLeave={handleMouseUp}
          >
            {hexGrid.map((hex, idx) => {
              const { x, y } = axialToPixel(hex.q, hex.r, hexSize);

              // Create hexagon path
              const points = [];
              for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 180) * (60 * i - 30);
                const px = x + hexSize * Math.cos(angle);
                const py = y + hexSize * Math.sin(angle);
                points.push(`${px},${py}`);
              }

              return (
                <g key={idx}>
                  <polygon
                    points={points.join(' ')}
                    fill={hex.color}
                    stroke="#1f2937"
                    strokeWidth="3"
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                    onMouseDown={() => handleMouseDown(idx)}
                    onMouseEnter={() => handleMouseEnter(idx)}
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  />
                  {/* Show coordinates for debugging */}
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="12"
                    fill="white"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {hex.q},{hex.r}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-8 text-white">
          <p className="text-lg">Hexagon Grid: Side Length {sideLength}</p>
          <p className="text-sm opacity-75">Total Hexes: {hexGrid.length}</p>

          <div className="mt-6 flex gap-4 justify-center">
            <button
              onClick={() => setIsAutoSpreading(!isAutoSpreading)}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${isAutoSpreading
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
                }`}
            >
              {isAutoSpreading ? 'Stop Auto-Spread' : 'Start Auto-Spread'}
            </button>

            <button
              onClick={() => setHexGrid(generateHexGrid(sideLength))}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold text-white transition-colors"
            >
              Reset Grid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
