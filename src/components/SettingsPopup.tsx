// SettingsPopup.tsx
import { FC, useRef, useState } from 'react';
import { useStore } from '../contexts/store';
import { RuleEditor } from './ui/RuleEditor';
//import { TileButton, RotateTileButton } from './ui/TileButton';

interface SettingsPopupProps {
  onClose: () => void;
}

export const SettingsPopup: FC<SettingsPopupProps> = ({ onClose }) => {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const [appState, dispatch] = useStore();  
  const { seed, currentRule } = appState; 
 

  // State for the tile settings
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };


  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10 pointer-events-auto"
      ref={backdropRef}
      onClick={handleBackdropClick}
    >
      <div className="nes-container is-dark with-title p-6 relative">
        <p className="title">SETTINGS</p>

        <button
          className="absolute top-2 right-4 text-xl text-white"
          onClick={onClose}
        >
          X
        </button>

        <div className="text-white">
        <RuleEditor
            rule={currentRule}  // 1. Correctly passing currentRule as a prop
            onChange={rule => dispatch({ type: 'set-current-rule', payload: rule })} // 2. Correct dispatch
          />

        {/* <div className="text-white" style={{ '--tile-width': '60px' } as React.CSSProperties}>
          <p className="mb-4">
            Tile:
          </p>
            <div className='flex items-end'>
            <TileButton
                    style={{ width: 'var(--tile-width)' }}
                    tile={{ type: 'm', n: 5, red: true }}
                />    
                <RotateTileButton
                    style={{ width: 'calc(4/3 * var(--tile-width))' }}
                    tile={{ type: 'm', n: 5, red: true  }}
                />
                <TileButton
                    style={{ width: 'var(--tile-width)' }}
                    tile={{ type: 'm', n: 5, red: true }}
                />
          </div> */}

          {/*  <div className='flex items-end flex-wrap'> 
          {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
            <div key={`z-${n}`} className="flex flex-col items-end"> 
              <RotateTileButton
                style={{ width: 'calc(4/3 * var(--tile-width))' }}
                tile={{ type: 'z', n }}
              />
              <TileButton
                style={{ width: 'var(--tile-width)' }}
                tile={{ type: 'z', n }}
              />
            </div>
          ))}
        </div> */}
        
{/*         <div className='flex items-end flex-wrap'>
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
            <div key={`m-${n}`} className="flex flex-col items-center m-2"> 
              <RotateTileButton
                style={{ width: 'calc(4/3 * var(--tile-width))' }}
                tile={{ type: 's', n }} // Changed type to 'm'
              />
              <TileButton
                style={{ width: 'var(--tile-width)' }}
                tile={{ type: 's', n }} // Changed type to 'm'
              />
            </div>
          ))}
        </div> */}

          {/* 
          <div className="flex justify-end mt-4">
            <button
              className="nes-btn is-error font-thin"
              style={{ color: '#212529' }}
            >
              Save
            </button>
          </div> */}

         
          </div>
        </div>
      </div>
  );
};