// src/components/tile/index.tsx
/* import Back from './images/back.svg?react';
import LightBG from './images/light/bg.svg?react'; */
import Back from './images/back.svg';
import LightBG from './images/light/bg.svg';
import { tileImage } from './images/light';
import RotateBack from './images/rotateback.svg';
import RotateLightBG from './images/rotate/bg.svg';
import { rotateTileImage } from './images/rotate';
import type { TileOrBack } from '../../lib/tile';
import type { FC } from 'react';

interface TileProps {
  tile: TileOrBack;
  dim?: boolean;
}

export const Tile: FC<TileProps> = ({ tile, dim = false }) => {
  const Background = tile.type === 'back' ? Back : LightBG;
  const TileImage = tile.type === 'back' ? null : tileImage(tile);

  return (
    <div className={`relative flex-1 transition ${dim ? 'opacity-50' : ''}`}>
      <Background className="w-full h-full" />
      {TileImage && <TileImage className="absolute inset-0 scale-90" />}
    </div>
  );
};

/* export const RotateTile: FC<TileProps> = ({ tile, dim = false }) => {
  const Background = tile.type === 'back' ? RotateBack : RotateLightBG;
  const TileImage = tile.type === 'back' ? null : rotateTileImage(tile);

  return (
    <div className={`relative flex-1 transition ${dim ? 'opacity-50' : ''}`}>
      <Background className="w-full h-full" />
      {TileImage && <TileImage className="absolute inset-0 scale-90" />}
    </div>
  );
};  */

export const RotateTile: FC<TileProps> = ({ tile, dim = false }) => {
  const Background = tile.type === 'back' ? RotateBack : RotateLightBG;
  const TileImage = tile.type === 'back' ? null : rotateTileImage(tile);

  return (
    <div className={`relative flex-1 transition ${dim ? 'opacity-50' : ''}`}>
      <Background className="w-full h-full" />
      {TileImage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <TileImage className="w-[90%] h-[90%]" />
        </div>
      )}
    </div>
  );
}; 


