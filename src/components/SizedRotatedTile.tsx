// src/components/SizedRotatedTile.tsx
import React, {
  useRef,
  useState,
  useLayoutEffect,
  CSSProperties,
  forwardRef,
  useImperativeHandle
} from 'react';
import { TileButton } from './ui/TileButton';
import type { TileOrBack } from '../lib/tile';

/**
 * This component:
 *  1) Renders a normal <TileButton> inside a hidden “initial” container (or reflow measure).
 *  2) Measures its bounding box.
 *  3) Sets the outer container’s width/height to match the “post-rotation” dimension.
 *  4) Absolutely positions the tile with rotate(90deg).
 */
interface SizedRotatedTileProps {
  tile: TileOrBack;
  className?: string;
  // etc... any extra props
}

export const SizedRotatedTile: React.FC<SizedRotatedTileProps> = ({
  tile,
  className = '',
}) => {
  // A ref for the unrotated tile (to measure actual size)
  const measureRef = useRef<HTMLButtonElement | null>(null);

  // A ref for the outer container
  const containerRef = useRef<HTMLDivElement | null>(null);

  // We'll store the final container size
  const [containerStyle, setContainerStyle] = useState<CSSProperties>({
    position: 'relative',
    // We start with "auto" so it doesn't break layout on first render
    width: 'auto',
    height: 'auto',
  });

  useLayoutEffect(() => {
    if (!measureRef.current) return;

    // 1) measure the tile’s bounding box AFTER the .tile-rotated transform
    //    Because your tile class rotates it in place
    const rect = measureRef.current.getBoundingClientRect();
    const finalWidth = rect.width;
    const finalHeight = rect.height;

    // 2) Set the container to that final dimension
    setContainerStyle({
      position: 'relative',
      width: finalWidth,
      height: finalHeight,
    });
  }, []);

  return (
    <div ref={containerRef} style={containerStyle}>
      {/* 3) Absolutely position the tile with your rotate CSS class */}
      <TileButton
        ref={measureRef}
        tile={tile}
        className={`tile-rotated ${className} absolute top-0 left-0`}
      />
    </div>
  );
};
