// src/components/ui/TileButton.tsx
import { Tile, RotateTile } from '../tile'; 
import type { TileOrBack } from '../../lib/tile';
//import type { FC } from 'react';
import { forwardRef } from 'react'; // changed

interface TileButtonProps {
  tile: TileOrBack | undefined;
  className?: string;
  dim?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties| undefined; // Define style prop
}

//export const TileButton: FC<TileButtonProps> = ({
export const TileButton = forwardRef<HTMLButtonElement, TileButtonProps>( // added
  ({ // added
      tile,
      className = '',
      dim = false,
      disabled = false,
      onClick,
      style,
    },
      ref // added
    ) => {
      // 1) If `tile` is undefined, render nothing:
      if (!tile) {
        return null; 
      }

    // 2) If `tile` is defined, render the normal button + tile
    return (
      <button
        ref={ref} // added
        disabled={disabled}
        className={`relative flex w-full h-full drop-shadow transition focus:drop-shadow-md disabled:cursor-not-allowed disabled:focus:drop-shadow ${className}`}
        onClick={onClick}
        style={style} // Use style prop directly
      >
        <Tile tile={tile} dim={dim || disabled} />
      </button>
    );
  }
);

export const RotateTileButton = forwardRef<HTMLButtonElement, TileButtonProps>(
  (
    {
      tile,
      className = '',
      dim = false,
      disabled = false,
      onClick,
      style,
    },
    ref
  ) => {
    if (!tile) {
      return null;
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`relative flex w-full h-full drop-shadow transition focus:drop-shadow-md disabled:cursor-not-allowed disabled:focus:drop-shadow ${className}`}
        onClick={onClick}
        style={style}
      >
        {/* Use RotateTile here */}
        <RotateTile tile={tile} dim={dim || disabled} />
      </button>
    );
  }
);