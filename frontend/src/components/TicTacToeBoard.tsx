import React from 'react';

interface TicTacToeBoardProps {
  board: string[];
  onCellClick: (position: number) => void;
  disabled: boolean;
  currentPlayerSymbol: string;
}

export default function TicTacToeBoard({
  board,
  onCellClick,
  disabled,
  currentPlayerSymbol,
}: TicTacToeBoardProps) {
  return (
    <div className="ttt-board">
      {[0, 1, 2].map((row) => (
        <div key={row} className="ttt-row">
          {[0, 1, 2].map((col) => {
            const position = row * 3 + col;
            const value = board[position];
            const isEmpty = value === '';

            return (
              <button
                key={position}
                className={`ttt-cell ${
                  value === 'X' ? 'ttt-cell-x' : value === 'O' ? 'ttt-cell-o' : ''
                }`}
                onClick={() => onCellClick(position)}
                disabled={disabled || !isEmpty}
              >
                {isEmpty && !disabled ? (
                  <span className="ttt-symbol ttt-symbol-preview">
                    {currentPlayerSymbol}
                  </span>
                ) : (
                  <span className="ttt-symbol">{value}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
