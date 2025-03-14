import { useState, useEffect } from 'react';
import { useStore } from '../contexts/store';
import { Result } from './Result';
import type { Result as ResultType } from '../lib/result';

// Import images so Webpack processes them via asset/resource:
import blinkImg from '../assets/blink.jpg';
import judgeImg from '../assets/judge.jpg';
import praiseImg from '../assets/praise.jpg';
import shrugImg from '../assets/shrug.jpg';

interface SidebarProps {
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  SetIsCustomOpen: React.Dispatch<React.SetStateAction<boolean>>;
  result: ResultType;
}

export const Sidebar: React.FC<SidebarProps> = ({ setIsSettingsOpen, SetIsCustomOpen, result }) => {
  const [state, dispatch] = useStore();
  const { handOptions, roundOver, gameOver } = state;
  const [resultsVisible, setResultsVisible] = useState(true);

  useEffect(() => {
    const images = [blinkImg, judgeImg, praiseImg, shrugImg];
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);
  
  
  const toggleVisibility = () => {
    setResultsVisible((prev) => !prev);
  };

  const pauseMessage =
    state.reactionPhase ||
    state.chiSelection ||
    state.ponSelection ||
    state.kanSelection ||
    state.riichiSelection ||
    state.chiErrorMessage ||
    state.ponErrorMessage ||
    state.kanErrorMessage ||
    state.riichiErrorMessage ||
    state.ronErrorMessage ||
    state.tsumoErrorMessage;

  let hiddenImageSrc = blinkImg; // default

  if (pauseMessage) {
    hiddenImageSrc = judgeImg;
  } else if (roundOver) {
    if (handOptions.ron || handOptions.tsumo) {
      hiddenImageSrc = praiseImg;
    } else {
      hiddenImageSrc = shrugImg;
    }
  } else if (gameOver) {
    if (!handOptions.ron && !handOptions.tsumo) {
      hiddenImageSrc = shrugImg;
    } else if (handOptions.ron || handOptions.tsumo) {
      hiddenImageSrc = praiseImg;
    } else {
      hiddenImageSrc = blinkImg;
    }
  }
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        onClick={toggleVisibility}
        className="flex-1 px-4 pb-4 overflow-y-auto relative cursor-pointer"
        style={{ backgroundColor: '#000000' }}
      >
        <div style={{ visibility: resultsVisible ? 'visible' : 'hidden' }}>
          <div className="mt-4" style={{ color: '#f0fdfa' }}>
            <Result result={result} />
          </div>
        </div>
        {!resultsVisible && (
          <img
            src={hiddenImageSrc}
            alt="Hidden Indicator"
            className="absolute bottom-0 left-0"
            style={{ height: '200px', aspectRatio: 'auto' }}
          />
        )}
      </div>
      <div className="mt-auto" style={{ backgroundColor: '#314f82' }}>
        <div className="h-16 p-2 my-2 mx-2">
          <div className="grid grid-cols-3 gap-2 h-full justify-items-center">
            <button
              type="button"
              className={`button vr`}
              onClick={() => setIsSettingsOpen(true)}
            >
              <span className="button-inside vr">Settings</span>
            </button>
            <button
              type="button"
              className={`button vr`}
              onClick={() => SetIsCustomOpen(true)}
            >
              <span className="button-inside vr">Customize</span>
            </button>
            <button
              type="button"
              className={`button vr ${gameOver ? 'animate-blink-parent' : ''}`}
              onClick={() => {
                dispatch({ type: 'new-game', payload: null });
              }}
            >
              <span className="button-inside vr" style={gameOver ? { color: 'black' } : {}}>New Game</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
