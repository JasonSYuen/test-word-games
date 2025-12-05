'use client'

import { letterPoints } from './wordValidation';

interface LetterTileProps {
  letter: string;
  showPoints?: boolean;
  className?: string;
  onClick?: () => void;
  onMouseDown?: () => void;
  onMouseEnter?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}

export default function LetterTile({
  letter,
  showPoints = true,
  className = '',
  onClick,
  onMouseDown,
  onMouseEnter,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
}: LetterTileProps) {
  return (
    <div
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative flex flex-col items-center justify-center ${className}`}
    >
      <span className="text-2xl font-bold">{letter}</span>
      {showPoints && letter && (
        <span className="text-xs absolute bottom-1 right-1">
          {letterPoints[letter]}
        </span>
      )}
    </div>
  );
}
