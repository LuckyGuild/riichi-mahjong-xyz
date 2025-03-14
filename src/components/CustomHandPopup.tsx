import { FC, useRef, useState } from 'react';
import { useStore } from '../contexts/store';
import { useHotkeys } from 'react-hotkeys-hook';
import { TileButton } from './ui/TileButton';
import type { Tile } from '../lib/tile';

interface CustomHandPopupProps {
  onClose: () => void;
}

export const CustomHandPopup: FC<CustomHandPopupProps> = ({ onClose }) => {
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const [handInput, setHandInput] = useState('');
  const [parsedHand, setParsedHand] = useState<Tile[] | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [cheatSeed, setCheatSeed] = useState('');

  const [state, dispatch] = useStore();
  const { seed, currentRule } = state;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const parseHandInput = (input: string, isPreview: boolean = false): Tile[] | null => {
    setErrorMessage(''); // Clear previous error message
    const hand: Tile[] = [];
    let digits = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (!char) continue;

      if (typeof char !== 'string') {
        continue;
      }

      if (/[0-9]/.test(char)) {
        digits += char;
      } else if (/[mpsz]/.test(char)) {
        for (const d of digits) {
          if (typeof d !== 'string') {
            continue;
          }
          if (/[mps]/.test(char) && d === '0') {
            hand.push({ type: char as 'm' | 'p' | 's', n: 5, red: true });
          } else {
            hand.push({ type: char, n: Number(d) } as Tile);
          }
        }
        digits = '';
      }
    }

    // --- ONLY count tiles AFTER parsing ---
    if (!isPreview && hand.length !== 13) {
      if (hand.length < 13) {
        setErrorMessage('Need 13 total tiles.');
      } else {
        setErrorMessage('Too many tiles.');
      }
      return null;
    }

    const tileCounts: { [key: string]: number } = {};
    const redCounts: { [key in 'm' | 'p' | 's']?: number } = {};

    for (const tile of hand) {
      const key = `${tile.type}-${tile.n}`;
      tileCounts[key] = (tileCounts[key] || 0) + 1;

      if (tile.type !== 'z' && tile.n === 5 && 'red' in tile && tile.red) {
        redCounts[tile.type] = (redCounts[tile.type] || 0) + 1;
      }
    }

    for (const key in tileCounts) {
      if (tileCounts[key]! > 4) {
        setErrorMessage(`Too many copies of tile ${key}. Maximum allowed is 4.`);
        return null;
      }
    }

    for (const suit of ['m', 'p', 's'] as const) {
      const count = redCounts[suit] || 0;
      if (count > currentRule.red[suit]) {
        setErrorMessage(`Too many red fives for suit ${suit}. Maximum allowed is ${currentRule.red[suit]}.`);
        return null;
      }
    }

    return hand;
  };
  const handleCustomHandGoClick = () => {
    if (handInput.trim() !== '') {
      const hand = parseHandInput(handInput.trim(), false);
      if (hand) {
        dispatch({ type: 'custom-new-game', payload: { hand } });
        onClose();
      }
    }
  };
    const handleGoClick = () => { // Handler for cheat seed
        if (cheatSeed.trim() !== "") {
            dispatch({ type: "new-game", payload: { seed: cheatSeed } });
            onClose();
        }
    };

  const handleReplayClick = () => {
    if (seed) {
      dispatch({ type: 'new-game', payload: { seed } });
      onClose();
    }
  };

  useHotkeys(
    'm,p,s,z',
    () => {
      const lastChar = handInput.slice(-1);
      if (/[mpsz]/.test(lastChar)) {
        const hand = parseHandInput(handInput.trim(), true);
        if (hand) {
          setParsedHand(hand);
        }
      }
    },
    { enableOnTags: ['INPUT'] },
    [handInput]
  );

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10 pointer-events-auto"
      ref={backdropRef}
      onClick={handleBackdropClick}
    >
      <div className="nes-container is-dark with-title p-6 relative">
        <p className="title">CUSTOMIZE HAND</p>

        <button className="absolute top-2 right-4 text-xl text-white" onClick={onClose}>
          X
        </button>

        <div className="flex items-center">
          <button
            type="button"
            className={`button vg`}
            style={{ color: '#212529' }}
            onClick={handleReplayClick}
            disabled={!seed}
          >
            <span className="button-inside vg">REPLAY</span>
          </button>
        </div>

        {/* Cheat Code Input */}
        <div className="flex items-center mb-4">
          <span className="mr-4">CHEAT CODE: </span>
          <input
            type="text"
            className="nes-input text-black"
            style={{ width: '300px' }}
            placeholder="seed-1740617952907"
            value={cheatSeed}
            onChange={e => setCheatSeed(e.target.value)}
          />
          <button
            type="button"
            className={`button short`}
            style={{ color: '#212529' }}
            onClick={handleGoClick}
          >
            <span className="button-inside short">GO</span>
          </button>
        </div>

        <div className="flex items-center mb-4">
          <span className="mr-2">CUSTOM HAND:</span>
          <input
            type="text"
            className="nes-input text-black"
            style={{ width: '300px' }}
            placeholder="13 tiles 1234567z01m01p01s"
            value={handInput}
            onChange={e => setHandInput(e.target.value)}
            onKeyUp={(e) => {
              if (/[mpsz]/.test(e.key)) {
                const hand = parseHandInput(handInput.trim(), true);
                if (hand) setParsedHand(hand);
              }
            }}
          />
          <button
            type="button"
            className={`button short`}
            style={{ color: '#212529' }}
            onClick={handleCustomHandGoClick}
          >
            <span className="button-inside short">GO</span>
          </button>
        </div>

        {/* Display parsed hand with TileButtons */}
        {parsedHand && (
          <div className="flex items-center">
            {parsedHand.map((tile, index) => (
              <TileButton key={index} tile={tile} className="max-w-[46px]" />
            ))}
          </div>
        )}
        {/* Display error message */}
        {errorMessage && <div className="text-red-500 mt-2">{errorMessage}</div>}
      </div>
    </div>
  );
};