// src/components/OverlayBalloon.tsx
import { FC, ReactNode } from 'react';
import { useStore } from '../contexts/store';
//import { MeldSelectionBalloon } from './MeldSelectionBalloon';

interface BalloonWrapperProps {
  children: ReactNode;
}

interface MeldSelectionBalloonProps {
  message?: string;
}

const MeldSelectionBalloon: FC<MeldSelectionBalloonProps> = ({ message = " " }) => {
  return (
    <section className="message -right ">
      {/* Balloon */}
      <div className="nes-balloon from-right ">
      <p style={{ whiteSpace: 'pre-wrap' }}>{message}</p>       </div>
    </section>
  );
};


const BalloonWrapper: FC<BalloonWrapperProps> = ({ children }) => {
  return (
    <div
      className="
        absolute
        right-0
        z-20
        bottom-[130px]
      "
      //style={{ width: '200px' }}
    >
      {children}
    </div>
  );
};

//
// 2) Main OverlayBalloon component checks for error/selection states
//    and returns the correct balloon message.
//
export const OverlayBalloon: FC = () => {
  const [state] = useStore();

  const {
    // Selections
    reactionPhase,
    chiSelection,
    ponSelection,
    kanSelection,
    riichiSelection,
  
    handOptions,
    roundOver,
    gameOver,
    // Errors
    chiErrorMessage,
    ponErrorMessage,
    kanErrorMessage,
    riichiErrorMessage,
    ronErrorMessage,
    tsumoErrorMessage,
    avgShanten,
  } = state;

  function calculateAverage(arr: number[]): number | null {
    if (arr.length === 0) {
      return null;
    }
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  const last4Average = state.shantenHistory.length >= 4
    ? calculateAverage(state.shantenHistory.slice(-4))
    : null;  // null if fewer than 4 elements
    
  const last8Average = state.shantenHistory.length >= 8
    ? calculateAverage(state.shantenHistory.slice(-8))
    : null; // null if fewer than 8 elements

  if (roundOver) {
    if (handOptions.ron || handOptions.tsumo) {
      return (
        <BalloonWrapper>
          <MeldSelectionBalloon message={
          `Yaku!\nCurrent Shanten: ${avgShanten !== null ? avgShanten.toFixed(2) : 'N/A'}`
          }/>        
        </BalloonWrapper>
      );
    } else {
      return (
        <BalloonWrapper>
          <MeldSelectionBalloon message={
          `No Yaku\nCurrent Shanten: ${avgShanten !== null ? avgShanten.toFixed(2) : 'N/A'}`
          }/>        
          </BalloonWrapper>
      );
    }
  }

  if (gameOver) {
    if (handOptions.ron || handOptions.tsumo) {
      return (
        <BalloonWrapper>
          <MeldSelectionBalloon message={
          `Game Over\nYaku!\nCurrent Shanten: ${avgShanten !== null ? avgShanten.toFixed(2) : 'N/A'}\n4rd avg Shanten: ${last4Average !== null ? last4Average.toFixed(2) : 'N/A'}\n8rd avg Shanten: ${last8Average !== null ? last8Average.toFixed(2) : 'N/A'}`
          }/>        
        </BalloonWrapper>
      );
    } else {
      return (
        <BalloonWrapper>
          <MeldSelectionBalloon message={
          `Game Over\nNo Yaku\nCurrent Shanten: ${avgShanten !== null ? avgShanten.toFixed(2) : 'N/A'}\n4rd avg Shanten: ${last4Average !== null ? last4Average.toFixed(2) : 'N/A'}\n8rd avg Shanten: ${last8Average !== null ? last8Average.toFixed(2) : 'N/A'}`
          }/>        
        </BalloonWrapper>
      );
    }
  }

  // 1) Combine all error messages into a single string (if any)
  const errorMessage =
    chiErrorMessage ||
    ponErrorMessage ||
    kanErrorMessage ||
    riichiErrorMessage ||
    ronErrorMessage ||
    tsumoErrorMessage;

  // 2) If there's an error message, show that first
  if (errorMessage) {
    return (
      <BalloonWrapper>
        <MeldSelectionBalloon message={errorMessage} />
      </BalloonWrapper>
    );
  }

  // 3) If reactionPhase but *no* meld selection => "Are you sure?"
  if (reactionPhase && !chiSelection && !ponSelection && !kanSelection) {
    return (
      <BalloonWrapper>
        <MeldSelectionBalloon message="Are you sure?" />
      </BalloonWrapper>
    );
  }

  // 4) If chiSelection => "Which 2 tiles for Chi?"
  if (chiSelection) {
    return (
      <BalloonWrapper>
        <MeldSelectionBalloon message="Which 2 tiles for Chi?" />
      </BalloonWrapper>
    );
  }

  // 5) If ponSelection => "Which 2 tiles for Pon?"
  if (ponSelection) {
    return (
      <BalloonWrapper>
        <MeldSelectionBalloon message="Which 2 tiles for Pon?" />
      </BalloonWrapper>
    );
  }

  // 6) If kanSelection => "Select tiles for Kan?"
  if (kanSelection) {
    return (
      <BalloonWrapper>
        <MeldSelectionBalloon message="Select tiles for Kan?" />
      </BalloonWrapper>
    );
  }

  // 7) If riichiSelection => "Which tile to discard?"
  if (riichiSelection) {
    return (
      <BalloonWrapper>
        <MeldSelectionBalloon message="Which tile to discard?" />
      </BalloonWrapper>
    );
  }
  // 8) Otherwise, no balloon:
  return null;
};
