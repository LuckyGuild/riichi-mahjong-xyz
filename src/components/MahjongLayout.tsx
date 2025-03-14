// src/components/MahjongLayout.tsx
import { type FC, useEffect, useRef, useState } from 'react';
import { TileButton, RotateTileButton } from './ui/TileButton';
import { useStore } from '../contexts/store';
import type { Tile, TileOrBack } from '../lib/tile';
import { OverlayBalloon } from './OverlayBalloon';
import { SettingsPopup } from './SettingsPopup';
import { CustomHandPopup } from './CustomHandPopup';
import type { Meld, Kan, Pon } from '../lib/input';
//import { PlayerHand } from './PlayerHand';
import { generateResult } from '../lib/result';
import { Sidebar } from './Sidebar';
import { LiveWall } from './Topbar';
import type { Wind } from '../lib/table';
import { Seat } from '../lib/store/state';
import Stick1000 from '../images/point-stick/1000.svg';
import HonbaStick from '../images/point-stick/continueStick.svg';
import OldRiichiStick from '../images/point-stick/depositStick.svg';
import { Result } from './Result';


const windKanjiMap: Record<string, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北'
};

interface DiscardAreaProps {
  className?: string;
  tiles?: Tile[];
  player: 'watashi' | 'shimocha' | 'toimen' | 'kamicha';
}

interface PlayerNameTagProps {
  name: React.ReactNode;
  isCurrentTurn?: boolean;
  className?: string;
  playerSeat: Seat; 
}



const DiscardArea = ({ className = '', tiles = [], player }: DiscardAreaProps) => {
  const discardKey = `${player}Discards` as keyof typeof state;
  const [state] = useStore();
  const { chiSelection, kanSelection, ponSelection, riichiDiscardIndex } = state;

  // Determine if this discard area should be highlighted
  let lastTileIsHighlighted = false;
  if (
    (chiSelection && chiSelection.discardKey === discardKey) ||
    (kanSelection && kanSelection.discardKey === discardKey) ||
    (ponSelection && ponSelection.discardKey === discardKey)
  ) {
    if (tiles.length > 0) {
      lastTileIsHighlighted = true;
    }
  }

  // Split the tiles into rows
  const firstRowTiles = tiles.slice(0, 6);
  const secondRowTiles = tiles.slice(6, 12);
  const thirdRowTiles = tiles.slice(12);

  // Determine which row contains the riichi tile (if any)
  const hasRiichiTile = player === 'watashi' && riichiDiscardIndex !== undefined;
  const riichiRow = hasRiichiTile 
    ? (riichiDiscardIndex < 6 
        ? 'first' 
        : riichiDiscardIndex < 12 
          ? 'second' 
          : 'third')
    : null;

  // Helper to render a tile with optional highlight
  const renderTile = (tile: Tile, index: number, absoluteIndex: number) => {
    const isRotated = player === 'watashi' && absoluteIndex === riichiDiscardIndex;
  
    /* return (
      <div key={absoluteIndex} className="">
        {isRotated ? (
          <RotateTileButton
            tile={tile}
            // We can keep the className for other styling properties
            className="drop-shadow"
            style={{ 
              // Use the CSS variable directly for width and calculations
              width: 'calc(4/3 * var(--tile-width))',
              // This offset helps center the rotated tile
              marginLeft: 'calc(-1/6 * var(--tile-width))'
            }}
          />
        ) : (
          <TileButton
            tile={tile}
            // We can keep the className for other styling properties
            className="drop-shadow"
            // Explicitly set the width to match the CSS variable
            style={{ width: 'var(--tile-width)' }}
          />
        )}
      </div>
    ); */
    
    if (isRotated) {
      // For rotated tiles, use absolute positioning
      return (
        <div 
          key={absoluteIndex} 
          className="relative"
          // Keep a normal tile's width to maintain layout spacing
          style={{ width: 'calc(4/3 * var(--tile-width))' }}
        >
          {/* Invisible placeholder to maintain layout */}
          <div style={{ width: 'calc(4/3 * var(--tile-width))' }}></div>
          
          {/* Absolutely positioned rotated tile */}
          <div className="absolute" style={{ 
            top: '0%',  // Adjust these values as needed
            left: '0%', 
            width: 'calc(4/3 * var(--tile-width))',
            zIndex: 10   // Ensure it's above other tiles
          }}>
            <RotateTileButton
              tile={tile}
              className="drop-shadow"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      );
    } else {
      // Regular tiles remain unchanged
      return (
        <div key={absoluteIndex} className="">
          <TileButton
            tile={tile}
            className="drop-shadow"
            style={{ width: 'var(--tile-width)' }}
          />
        </div>
      );
    }

  };

  return (
    <div className={`p-2 rounded ${className}`}>
      {/* Container for the rows */}
      <div className="flex flex-col items-left gap-[1px]">
        {/* First Row */}
        <div className={`flex gap-[1px] ${riichiRow === 'first' ? 'min-w-fit overflow-visible' : ''}`}>
          {firstRowTiles.map((tile, i) => renderTile(tile, i, i))}
        </div>
  
        {/* Second Row */}
        <div className={`flex gap-[1px] ${riichiRow === 'second' ? 'min-w-fit overflow-visible' : ''}`}>
          {secondRowTiles.map((tile, i) => renderTile(tile, i, 6 + i))}
        </div>
  
        {/* Third Row */}
        <div className={`flex gap-[1px] ${riichiRow === 'third' ? 'min-w-fit overflow-visible' : ''}`}>
          {thirdRowTiles.map((tile, i) => renderTile(tile, i, 12 + i))}
        </div>
      </div>
    </div>
  );

};

// PlayerNameTag Component
const PlayerNameTag = ({
  name,
  isCurrentTurn = false,
  className = '',
  playerSeat,
}: PlayerNameTagProps) => {

  const [state] = useStore(); 
  const { table } = state; 

  // Determine if this player is East
  const isEast = () => {
    const seatOrder: Wind[] = ['east', 'south', 'west', 'north'];
    const playerOrder: Seat[] = ['watashi', 'shimocha', 'toimen', 'kamicha'];
    // Find the index of the *current* East wind
    const eastWindIndex = seatOrder.indexOf(table.seat);

    // Calculate the *expected* East player index based on rotation.
    // Add the eastWindIndex to the default player index. Mod 4 to wrap around
    const expectedEastPlayerIndex = (playerOrder.indexOf(playerSeat) + eastWindIndex) % 4;

    //if the index of the current player is east, return true
    return expectedEastPlayerIndex === 0;
  };

  return (
    <div
      className={`${
        isCurrentTurn ? 'bg-yellow-500' : 'bg-black/50'
      } px-3 py-1 rounded shadow-sm ${className}`}
    >
      {/* Conditionally render the East kanji based on isEast() */}
      {isEast() && (
          <span className=" text-xl text-green-800">
            東&#8201;
          </span> //show kanji based on east wind
      )}
      <span
        className="whitespace-nowrap text-xl"
        style={{ color: isCurrentTurn ? '#212529' : 'white' }}
      >
        {name}
      </span>
    </div>
  );
};

// DeadWall Component
const DeadWall = () => {
  const [state] = useStore();
  const { wall, table, dice1, dice2, wanpaiKan, wanpaiHaitei, input: { dora } } = state;

  const backTile: TileOrBack = { type: 'back' };

  const kanPairs = Math.ceil(wanpaiKan.length / 2);
  const haiteiPairs = wanpaiHaitei.length === 0 ? 0 : Math.ceil(wanpaiHaitei.length / 2);

  // Helper to show a single die
  const renderDie = (dieValue: number) => {
    // If 0, show a square placeholder
    if (dieValue === 0) {
      return <>&#x25A1;</>;
    }
    // Otherwise show Unicode die faces: 0x2680 to 0x2685
    return <>{String.fromCodePoint(0x2680 - 1 + dieValue)}</>;
  };

  return (
    <div className="flex flex-col items-right">
      <div className="flex gap-[1px]">
      {/* (1) Show the Kan‐draw pairs as back tiles */}
      {Array.from({ length: kanPairs }).map((_, i) => (
        <TileButton
          key={`kanpair-${i}`}
          tile={backTile}
          className="drop-shadow"
          style={{ width: 'var(--tile-width)' }}
        />
      ))}

      {/* (2) Dora indicators (already revealed) plus placeholders up to 5 */}
      {dora.map((tile, i) => (
        <TileButton
          key={`dora-${i}`}
          tile={tile}
          className="drop-shadow"
          style={{ width: 'var(--tile-width)' }}
        />
      ))}
      {Array(Math.max(0, 5 - dora.length))
        .fill(0)
        .map((_, i) => (
          <div key={`dora-ph-${i}`}>
            <TileButton 
              tile={backTile} 
              className="drop-shadow" 
              style={{ width: 'var(--tile-width)' }}
            />
          </div>
        ))}

      {/* (3) Show Haitei pairs as back tiles */}
      {Array.from({ length: haiteiPairs }).map((_, i) => (
        <TileButton
          key={`haitei-${i}`}
          tile={backTile}
          className="drop-shadow"
          style={{ width: 'var(--tile-width)' }}
        />
      ))}

    </div>
     
      {/* 
      <div className="p-1 rounded">
        <div className="flex gap-[1px] mb-0">      
         
          <TileButton tile={backTile} className={boardtileButtonClass} />
          <TileButton tile={backTile} className={boardtileButtonClass} />

          {dora.map((tile, i) => (
            <TileButton
              key={`dora-${i}`}
              tile={tile}
              className={boardtileButtonClass}
            />
          ))}

          
          {Array(Math.max(0, 5 - dora.length)).fill(0).map((_, i) => (
            <div key={i} className="">
              <TileButton tile={backTile} className={boardtileButtonClass} />
            </div>
          ))}
        </div>
      </div> 
      */}

      {/* INFO PANEL (2 ROWS) */}
      <div className="bg-black/50 px-1 p-1 rounded text-white text-center">
        {/* First row */}
        <div className="grid grid-cols-3 items-center"> 
          {/* 1) Dice1 */}
          <div className="justify-self-start">  
            <span className="text-2xl font-bold">
              {renderDie(dice1)}
            </span>
          </div>

          {/* 2) Old Riichi Stick + deposit */}
          <div className="justify-self-start -ml-3"> 
            <div className="flex items-center ">
              <OldRiichiStick className="w-[40px] h-auto drop-shadow shrink-0" />
              <span className="text-xl">{table.deposit}</span>
            </div>
          </div>

          {/* 3) 残牌 */}
          <div className="justify-self-start">  
            <span className="text-l font-jpn4 font-bold">
              残牌&#8201;{wall.length}
            </span>
          </div>
        </div>

        {/* Second row */}
        <div className="grid grid-cols-3 items-center -mt-2"> 
          {/* 1) Dice2 */}
          <div className="justify-self-start">  
            <span className="text-2xl font-bold">
              {renderDie(dice2)}
            </span>
          </div>

          {/* 2) Honba Stick + continue count */}
          <div className="justify-self-start -ml-3"> 
            <div className="flex items-center ">
              <HonbaStick className="w-[40px] h-auto drop-shadow shrink-0" />
              <span className="text-xl">{table.continue}</span>
            </div>
          </div>

          {/* 3) Round & count (e.g. 東1場) */}
          <div className="justify-self-start">   
            <span className="text-l font-jpn4 font-bold">
              {windKanjiMap[table.round]}&#8201;
              {table.roundCount}&#8201;場
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};


const PlayerHand = () => {
  const [
    {
      input: { hand, drawnTile, melds },
      chiSelection,
      ponSelection,
      kanSelection,
      mustDiscard,
      riichiSelection,
      approveRiichiDiscards,
      handOptions
    },
    dispatch
  ] = useStore();

  // A single tile’s sizing and optional transitions
  const handtileButtonClass = 'flex-1 max-w-[42px] aspect-[1/1.3332] transition-transform';

  // 1) Detect if a tile in hand is “picked” for Chi/Pon/Kan
  const isTilePicked = (index: number) => {
    const c = chiSelection?.pickedTileIndices?.includes(index);
    const p = ponSelection?.pickedTileIndices?.includes(index);
    const k = kanSelection?.pickedTileIndices?.includes(index);
    return !!(c || p || k);
  };

  // 2) Hand tile click logic
  const handleTileClick = (index: number) => {
    // 1) If user is in the middle of Chi / Pon / Kan selection:
    if (chiSelection) {
      dispatch({ type: 'select-chi-tile', payload: index });
      return;
    }
    if (ponSelection) {
      dispatch({ type: 'select-pon-tile', payload: index });
      return;
    }
    if (kanSelection) {
      dispatch({ type: 'select-kan-tile', payload: index });
      return;
    }

    // 2) If we’re in the “Riichi discard” flow:
    //    - We only do `select-riichi-tile` if approveRiichiDiscards has tiles pushed into it from clicking riichi button.
    //    - We do NOT do the usual discard logic.
    if (
      approveRiichiDiscards &&
      approveRiichiDiscards.length > 0 &&
      handOptions.riichi === 'none' &&
      riichiSelection === true
    ) {
      // calling ‘call-riichi’ sets 'approveRiichiDiscards`, 
      // then pick the hand tile to finalize the discard. NOT drawntile yet
      //  payload:index should be 0-12
      dispatch({ type: 'select-riichi-tile', payload: index });
      return;
    }

    // 3) Otherwise, standard discard logic:
    //    If we mustDiscard but do not have a drawn tile, remove-hand-tile
    if (mustDiscard && !drawnTile) {
      dispatch({ type: 'remove-hand-tile', payload: index });
    //    Or if we do have a drawn tile, also remove-hand-tile
    } else if (drawnTile) {
      dispatch({ type: 'remove-hand-tile', payload: index });
    }
  };

  const handleDrawnTileClick = () => {
    if (!drawnTile) return;
    
    if (
      riichiSelection === true &&
      handOptions.riichi === 'none' &&
      (approveRiichiDiscards?.length ?? 0) > 0
    ) {
      // In that scenario, we might want to do:
      //   select-riichi-tile with the index = fullHand.length since index starts at 0
      //   payload: drawnIndex should be 1,4,7,10,13
      const fullHand = [...hand];
      const drawnIndex = fullHand.length; 
      dispatch({ type: 'select-riichi-tile', payload: drawnIndex });
      return;
    }

    // Fallback: normal discard drawn tile
    dispatch({ type: 'discard-drawn-tile', payload: null });
  };

  // A callback ref that logs the tile's bounding box
  // TileButton has refs enabled by using forwardRef
  // (el: HTMLButtonElement | null) is the DOM element or null if unmounted.
  const measureTileRef = useRef<HTMLButtonElement>(null);
  // State to store marginLeft
  const [newWidth, setNewWidth] = useState<number>(0);
  const [newHeight, setNewHeight] = useState<number>(0);
  const [marginRotate, setMarginRotate] = useState<number>(0);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    // Function to handle measurements
    const updateMeasurements = () => {
      if (measureTileRef.current) {
        const dimensions = measureTileRef.current.getBoundingClientRect();
        /* console.log('unrotated tile dimensions =>', 
          {
          width: dimensions.width,
          height: dimensions.height,
          top: dimensions.top,
          left: dimensions.left,
          }); */
        // Calculate the margin based on dimensions
        const newWidth = dimensions.width;
        // console.log('newWidth:', newWidth);
        setNewWidth(newWidth);
        const newHeight = dimensions.height;
        // console.log('newHeight:', newHeight);
        setNewHeight(newHeight);
        const marginRotate = dimensions.height - dimensions.width;
        // console.log('marginRotate:', marginRotate);
        setMarginRotate(marginRotate);
        // console.log('width3:',2*newWidth + newHeight);
      }
    };
  
    // Initial measurement
    updateMeasurements();
  
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
      updateMeasurements();
    };

    // Add resize event listener
    window.addEventListener('resize', handleResize);
  
    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [measureTileRef, dimensions, melds.length, dispatch]); // dependency array remains the same

  
  // 3) Render a single Meld (3 or 4 tiles). If closed Kan, show 1st & 4th face-down.
  const renderMeld = (meldObj: Meld, meldIndex: number) => {
    // 1) Extract `tiles` from meldObj
    const tiles = meldObj.tiles;  // <-- Now `tiles` is defined

    const rotateTileStyle = {
      width: `${newWidth}px`,
      aspectRatio: '1/1.3332'
    } as const;
    
    // 2) If it's a "chii" meld:
    if (meldObj.type === 'chii') {
      // tiles = [the discard tile in position 0, 
      //          the next two picked tiles in positions 1 & 2]
  
      return (
        <div key={meldIndex} className="flex items-end gap-0" 
        style={{ marginLeft: `${marginRotate}px` }}
        >
          {/* Sizing container for rotated tile */}
          
            {/* 1) The first tile is rotated (the discard tile) */}
            {/* Column 1: discard tile (rotated) */}
            <TileButton
              key={`chi-${meldIndex}-discard`}
              tile={tiles[0]}
              className={`tile-rotated ${handtileButtonClass} `}
              style={{ ...rotateTileStyle,  }}
            />
        

          {/* 2) The remaining two tiles are normal orientation */}
          {/* Column 2: the two picked tiles */}

          {tiles.slice(1).map((t, i) => (
            <TileButton
              key={`chi-${meldIndex}-picked${i}`}
              tile={t}
              className={handtileButtonClass}
              style={{ width: `${newWidth}px` }}
            />
          ))}
        
        </div> 
      );
    } {/* end of chii */}
  
    // 3) If it's a "kan" meld:
    if (meldObj.type === 'kan') {
      // Suppose we have `closed?: boolean;` on the 'kan' meld interface
      if (meldObj.closed) {
        // If it's a closed kan, typically show tiles[0] & tiles[3] facedown
        return (
          <div key={meldIndex} className="flex items-end gap-0">
            <TileButton
              key={`closed-kan-${meldIndex}-0`}
              tile={{ type: 'back' }} 
              className={handtileButtonClass}
              style={{ width: `${newWidth}px` }}
            />
            <TileButton
              key={`closed-kan-${meldIndex}-1`}
              tile={tiles[1]}
              className={handtileButtonClass}
              style={{ width: `${newWidth}px` }}
            />
            <TileButton
              key={`closed-kan-${meldIndex}-2`}
              tile={tiles[2]}
              className={handtileButtonClass}
              style={{ width: `${newWidth}px` }}
            />
            <TileButton
              key={`closed-kan-${meldIndex}-3`}
              tile={{ type: 'back' }}
              className={handtileButtonClass}
              style={{ width: `${newWidth}px` }}
            />
          </div>
        );
      } 
        else if ((meldObj as Kan).shouminkan) {
          const rotatedIndex = (meldObj as Kan).discardIndex ?? -1; // Use type assertion to access fromPlayer
          
          if (rotatedIndex === 0) {
            return (
              // The rotated tiles are positioned in a container that is a flex item.
              // The flex layout system automatically adjusts the container's size 
              // to accommodate its content, including the rotated tiles.
              <div className="flex items-end gap-0">
                {/* First column with rotated tiles */}
                <div className="relative flex items-end gap-0" 
                style={{ 
                  marginLeft: `${marginRotate}px`,
                  transformOrigin: 'top right', 
                transform: 'rotate(90deg)' }}
                >
                  {/* Bottom tile */}
                  <TileButton
                    key={`kan-${meldIndex}-0`}
                    tile={tiles[0]}
                    className={handtileButtonClass}
                    style={{ 
                      ...rotateTileStyle,
                      transform: ' translateX(133%)',
                      transformBox: 'fill-box'
                    }}
                  />
                  {/* Top tile (rotated) */}
                  <div className="absolute top-0">
                    <TileButton
                      key={`kan-${meldIndex}-1`}
                      tile={tiles[1]}
                      className={handtileButtonClass}
                      style={{ 
                        ...rotateTileStyle,
                        transform: `translateX(${marginRotate}px)`,
                        transformBox: 'fill-box'
                      }}
                    />
                  </div>
              
                </div>

                  {/* Middle regular tile */}
                  <TileButton
                    key={`kan-${meldIndex}-2`}
                    tile={tiles[2]}
                    //className={handtileButtonClass}
                    style={{ width: `${newWidth}px`, aspectRatio: '1/1.3332' }} 
                  />

                  {/* Last regular tile */}
                  <TileButton
                    key={`kan-${meldIndex}-3`}
                    tile={tiles[3]}
                    //className={handtileButtonClass}
                    style={{ width: `${newWidth}px`, aspectRatio: '1/1.3332' }} 
                />
              </div>
            );
          }

          else if (rotatedIndex === 1) {
            return (
              <div className="flex items-end gap-0"
              style={{ width: `${2 * newWidth + newHeight}px`, height: '{newHeight}px' }}
              >
                {/* First regular tile */}
                <TileButton
                  key={`kan-${meldIndex}-1`}
                  tile={tiles[0]}
                  className={handtileButtonClass}
                />
          
                <div className="relative flex items-end gap-0"
                  style={{
                    marginLeft: `${marginRotate}px`,
                    transformOrigin: 'top right',
                    transform: 'rotate(90deg)'
                  }}
                >
                  {/* Bottom tile */}
                  <TileButton
                    key={`kan-${meldIndex}-2`}
                    tile={tiles[1]}
                    className={handtileButtonClass}
                    style={{
                      ...rotateTileStyle,
                      transform: 'translateX(133%)',
                      transformBox: 'fill-box'
                    }}
                  />
                  {/* Top tile (rotated) */}
                  <div className="absolute top-0">
                    <TileButton
                      key={`kan-${meldIndex}-3`}
                      tile={tiles[2]}
                      className={handtileButtonClass}
                      style={{
                        ...rotateTileStyle,
                        transform: `translateX(${marginRotate}px)`,
                        transformBox: 'fill-box'
                      }}
                    />
                  </div>
                </div>
          
                {/* last regular tile */}
                <TileButton
                  key={`kan-${meldIndex}-4`}
                  tile={tiles[3]}
                  className={handtileButtonClass}
                />
              </div>
            );
          }

          else if (rotatedIndex === 2) {
            return (
              <div className="flex items-end gap-0"
                style={{ width: `${2 * newWidth + newHeight}px` }}
              >
                {/* First regular tile */}
                <TileButton
                  key={`kan-${meldIndex}-1`}
                  tile={tiles[0]}
                  className={handtileButtonClass}
                />
          
                {/* Second regular tile */}
                <TileButton
                  key={`kan-${meldIndex}-2`}
                  tile={tiles[1]}
                  className={handtileButtonClass}
                />
          
                {/* Third column with rotated tiles */}
                <div className="relative flex items-end gap-0"
                  style={{
                    marginLeft: `${marginRotate}px`,
                    transformOrigin: 'top right',
                    transform: 'rotate(90deg)'
                  }}
                >
                  {/* Bottom tile */}
                  <TileButton
                    key={`kan-${meldIndex}-0`}
                    tile={tiles[0]}
                    className={handtileButtonClass}
                    style={{
                      ...rotateTileStyle,
                      transform: 'translateX(133%)',
                      transformBox: 'fill-box'
                    }}
                  />
                  {/* Top tile (rotated) */}
                  <div className="absolute top-0">
                    <TileButton
                      key={`kan-${meldIndex}-1`}
                      tile={tiles[1]}
                      className={handtileButtonClass}
                      style={{
                        ...rotateTileStyle,
                        transform: `translateX(${marginRotate}px)`,
                        transformBox: 'fill-box'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          }

        } // end of shouminakan
        
        else {
          // For open Kan melds
          // Render open Kan meld
          const rotatedIndex = (meldObj as Kan).discardIndex ?? -1; // Use type assertion to access fromPlayer

          return (
            <div key={meldIndex} className="flex items-end gap-0 transition-none"
            //style={{ marginLeft: `${marginRotate}px` }}
            >
              {meldObj.tiles.map((tile, index) => (
                <TileButton
                  key={`kan-${meldIndex}-${index}`}
                  tile={tile}
                  className={`${handtileButtonClass} ${index === rotatedIndex ? 'tile-rotated' : ''}`}
                  style={index === rotatedIndex ? { 
                    ...rotateTileStyle, 
                    //width: `${newHeight}px`,
                    marginLeft: `${marginRotate}px`, 
                  } : {
                    // Add explicit width constraint for non-rotated tiles to match hand
                    width: `${newWidth}px`
                  }}
                />
              ))}
            </div>
          );
        } 
      } {/* end of kan */}

    if (meldObj.type === 'pon') {
      // For Pon melds
      const rotatedIndex = (meldObj as Pon).discardIndex ?? -1; // Use type assertion to access fromPlayer

      return (
        <div key={meldIndex} className="flex items-end gap-0 transition-none" 
        //style={{ width: `${2*newWidth + newHeight}px` }}
        >
          {meldObj.tiles.map((tile, index) => (
            <TileButton
              key={`pon-${meldIndex}-${index}`}
              tile={tile}
              className={`${handtileButtonClass} ${index === rotatedIndex ? 'tile-rotated' : ''}`}
              style={index === rotatedIndex ? { 
                ...rotateTileStyle, 
                //width: `${newHeight}px`,
                marginLeft: `${marginRotate}px`, 
              } : {
                // Add explicit width constraint for non-rotated tiles to match hand
                width: `${newWidth}px`
              }}
            />
          ))}
        </div>
      );
    }
    return null;

  }; {/* end of renderMeld */}

  // 4) The main layout:
  //    "flex w-full justify-between" => 3 columns: 
  //       Column1 (Hand), Column2 (Drawn tile), Column3 (Meld region)
  //    "gap-x-16" => ensures at least a tile's worth of space horizontally
  return (
    <div className="p-2 mx-4">
      <div className="flex w-full items-start justify-between gap-x-16">
        {/* Column 1: Hand (left) */}
        <div className="flex gap-0">
          {hand.map((tile, i) => {
            const picked = isTilePicked(i);
            return (
              <TileButton
                key={i}
                tile={tile}
                ref={i === 0 ? measureTileRef : undefined}
                className={
                  `${handtileButtonClass} hover:-translate-y-2 cursor-nes ` +
                  (picked ? 'opacity-50' : '')
                }
                onClick={() => handleTileClick(i)}
              />
            );
          })}
        </div>

        {/* Column 2: Drawn tile (center) */}
        <div className="flex gap-0">
          {drawnTile ? (
            <TileButton
              tile={drawnTile}
              className={
                `${handtileButtonClass} hover:-translate-y-2 cursor-nes ` +
                (kanSelection?.highlightDrawn ? 'opacity-50' : '')
              }
              onClick={handleDrawnTileClick}
            />
          ) : (
            // placeholder same size
            <div
              className={`relative flex h-full drop-shadow ${handtileButtonClass}`}
            />
          )}
        </div>

        {/* Column 3: Meld region (right) */}
        <div className="flex flex-row gap-0 items-start">
          {melds.map((meldObj, i) => renderMeld(meldObj, i))}
        </div>
      </div>
    </div>
  );
};

// GameBoard Component
const GameBoard = () => {
  const [state] = useStore();
  const {
    currentTurn,
    watashiDiscards,
    kamichaDiscards,
    toimenDiscards,
    shimochaDiscards
  } = state;

  return (
    <div className="flex-1 h-full flex flex-col justify-center">
      {/* Top Section */}
      <div className="flex flex-col items-center mb-2">
        <DiscardArea
          className="rotate-180"
          tiles={toimenDiscards}
          player="toimen"
        />
        <PlayerNameTag
          name="TOIMEN"
          className="rotate-180"
          isCurrentTurn={currentTurn === 'toimen'}
          playerSeat="toimen"
        />
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_1fr] items-center">
        {/* Left Section for Kamicha */}
        <div className="col-start-2 flex items-center justify-center">
          <div className="flex flex-col items-center transform rotate-90">
            <PlayerNameTag
              name="KAMICHA"
              isCurrentTurn={currentTurn === 'kamicha'}
              playerSeat="kamicha"
            />
            <DiscardArea tiles={kamichaDiscards} player="kamicha" />
          </div>
        </div>

        {/* Center (DeadWall) */}
        <div className="col-start-3 flex justify-center items-center">
          <DeadWall />
        </div>

        {/* Right Section for Shimocha */}
        <div className="col-start-4 flex items-center justify-center">
          <div className="flex flex-col items-center transform -rotate-90">
            <PlayerNameTag
              name="SHIMOCHA"
              isCurrentTurn={currentTurn === 'shimocha'}
              playerSeat="shimocha"
            />
            <DiscardArea tiles={shimochaDiscards} player="shimocha" />
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col items-center mt-2">
        <PlayerNameTag
          name={
            <>
              {/* 
              <span className="font-jpn4 text-xl font-bold">
                {windKanjiMap[state.table.seat]}
              </span>{' '} 
              */}
              WATASHI
              {(state.furiten || state.tempFuriten) && (
                <span className="ml-1 font-jpn4 text-xl font-bold text-red-600">
                振聴
                </span>
              )}
            </>
          }
          isCurrentTurn={currentTurn === 'watashi'}
           playerSeat="watashi"
        />

        {/* if riichi state place 1000 tenbou stick */}
        {state.handOptions.riichi !== 'none' && (
        <Stick1000 className="pt-1.5 w-[100px] h-auto drop-shadow" />
        )}

        <DiscardArea tiles={watashiDiscards} player="watashi" />
      </div>

      
    </div>
  );
};


// Left Main MahjongLayout component
export const MahjongLayout: FC = () => {
  const [state, dispatch] = useStore(); // import state, dispatch from store
  const { table, input, handOptions, currentRule, currentTurn, mustDiscard, 
    watashiDiscards, kamichaDiscards, toimenDiscards, shimochaDiscards } = state;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomOpen, SetIsCustomOpen] = useState(false);
  const [inHora, setInHora] = useState(false);

  // Prepare the allDiscards object to pass to generateResult
  const allDiscards = [
    ...watashiDiscards,
    ...kamichaDiscards,
    ...toimenDiscards,
    ...shimochaDiscards,
  ];

  // Generate result here to share between children
  const result = generateResult(table, input, handOptions, currentRule, allDiscards);
  // see riichi button line 1082
  // see sidebar component line 1191

  // Ref to track if it's the initial render
  //const initialRenderRef = useRef(true);

  useEffect(() => {
    // We *only* want to log if the seed changes, AND it's not the absolute initial render.
    if (state.seed !== undefined) { // Only run if seed is defined (after first new-game)
      //console.log("=== Logging Shanten (Seed Changed) ===")
      dispatch({ type: 'log-shanten', payload: { result } })
    }}, [state.seed]); 

  // helper function that returns what the "Next" button should do-line 709
  function handleNextButton() {
    // 0) If the game is already over, do nothing:
    if (state.gameOver) {
      //console.log("Game is already over. Nothing to do.");
      return;
    }
    // if roundOver, we dispatch 'new-round'
    if (state.roundOver) {
      dispatch({ type: 'new-round', payload: null });
      return;
    }

    // 2) Check if the wall is empty AND there's no drawnTile:
    if (state.wall.length === 0 && state.input.drawnTile === null) {
      // 2a) If we've reached the round limit
      if (state.table.roundCount === 4) {
        // => Game over scenario
        dispatch({ type: 'game-over', payload: null });
      } else {
        // => Otherwise, it's round over (but not game over)
        dispatch({ type: 'round-over', payload: { result } });
      }
      return;
    }
  
    // 2) If we are in reactionPhase AND user clicks "Pass"
    //    so we skip this discard opportunity:
    if (state.reactionPhase ) {
      dispatch({ type: 'pass-discard', payload: { result } });
      return;
    }
  
    // 3) If it’s Watashi’s turn => user wants to draw a tile:
    if (state.currentTurn === 'watashi') {
      dispatch({ type: 'draw-tile', payload: null });
      return;
    }
  
    // 4) Otherwise, it must be another seat’s turn => 
    //    user clicks next to make that seat "discard" a tile immediately.
    //    (store-discard also checks if Watashi can react, sets reactionPhase, etc.)
    dispatch({ type: 'store-discard', payload: { result } });
  } 
  
  // global listener for when user presses escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        dispatch({ type: 'escape-selection', payload: null });
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch]);
  
  // Handle error message clearance
  // Always return one cleanup function:
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
  
    const anyErrorExists =
      state.chiErrorMessage ||
      state.ponErrorMessage ||
      state.kanErrorMessage ||
      state.riichiErrorMessage ||
      state.ronErrorMessage ||
      state.tsumoErrorMessage;
  
    // If anyErrorExists is true, we set up a timeout and clear it
    if (anyErrorExists) {
      timer = setTimeout(() => {
        dispatch({ type: 'clear-error-message', payload: null });
      }, 2000);
    }
  
    // If anyErrorExists is false, timer remains null and no timeout was set
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [
    state.chiErrorMessage,
    state.ponErrorMessage,
    state.kanErrorMessage,
    state.riichiErrorMessage,
    state.ronErrorMessage,
    state.tsumoErrorMessage,
    dispatch
  ]);

  useEffect(() => {
    const isTenpai = result && result.type === 'hora-shanten' && result.info.type === 'hora';

    if (isTenpai) {
      dispatch({ type: 'check-furiten', payload: { result } });
    }
    // No else needed, as you specified "otherwise do nothing"
  }, [watashiDiscards]); // Depend on watashiDiscards, result, and dispatch

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ backgroundColor: '#314f82' }}>

      {/* Top bar spanning the whole page */}
      <LiveWall />

      {/* Area below top bar */}
      {/* flex-1 so that it fills the remaining space after LiveWall */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[6fr_4fr] overflow-hidden">
        {/* Left Column */}
        <div className="flex flex-col h-full relative" style={{ backgroundColor: '#314f82' }}>
          {/* Main game area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-[600px]">
            {/* Center game board */}
            <div className="flex-1 overflow-auto">
              <GameBoard />
            </div>

            {/* PlayerHand */}
            <div className="flex-shrink-0">
              <PlayerHand />
            </div>
          </div>

          {/* Left Button Row */}
          <div className="h-16 p-2 my-2 mx-2">
            <div className="grid grid-cols-7 gap-2 h-full justify-items-center">
              
            <button
              type="button"
              className={`button`}
              onClick={() => {
                dispatch({ 
                  type: 'call-riichi', 
                  payload: { result } 
                });
              }}
            >
              <span className="button-inside">リーチ</span>
            </button>

              {/* Kan */}
              <button
                type="button"
                className={`button`}
                disabled={mustDiscard}  
                onClick={() => {
                  if ( state.reactionPhase ) {
                    dispatch({ type: 'call-kan-discard', payload: null });
                  } else if (currentTurn === 'watashi') {
                    // It’s Watashi’s turn → we try drawn-tile Kan logic
                    dispatch({ type: 'call-kan-drawn', payload: null });
                  } else {
                  }
                }}
              >
                <span className="button-inside tr">カン</span>
              </button>

              {/* Pon */}
              <button
                type="button"
                className={`button`}
                disabled={mustDiscard}  
                onClick={() => dispatch({ type: 'call-pon', payload: null })}            
              >
                <span className="button-inside tr">ポン</span>
              </button>

              {/* Chi */}
              <button
                type="button"
                className={`button`}
                onClick={() => dispatch({ type: 'call-chi', payload: null })}
              >
                <span className="button-inside tr">チー</span>
              </button>


              {/* Ron */}
              <button 
                type="button"
                className={`button`}
                //disabled={state.furiten || state.tempFuriten || state.riichiFuriten} 
                onClick={() => {
                  dispatch({ type: 'call-ron', payload: { result }  })
                  //console.log('reactionphase',state.reactionPhase)
                  //console.log('furiten',state.furiten)
                  //console.log('tempfuriten',state.tempFuriten)
                }}
              >
                <span className="button-inside bo">ロン</span>
              </button>

              {/* Tsumo */}
              <button 
                type="button"
                className={`button`}
                onClick={() => {
                  dispatch({ type: 'call-tsumo', payload: { result } })
                  
                }}
              >
                <span className="button-inside bo">ツモ</span>
              </button>


              {/* Next or Pass */}
              <button
                type="button"
                className={`button`}
                disabled={mustDiscard}  // turn off to test mustDiscard
                onClick={() => {
                  if (!mustDiscard) {
                    handleNextButton();
                  }
                  //console.log('walllength',state.wall.length)
                  //console.log('drawntile', state.input.drawnTile)
                  //console.log('round',state.table.roundCount)
                  //console.log('roundover',state.roundOver)
                  //console.log('gameover',state.gameOver)
                  //console.log('result',result)
/*                   if (state.furiten === true) {
                    console.log('furi', state.furiten);
                  }
                  if (state.tempFuriten === true) {
                    console.log('tempfuri', state.tempFuriten);
                  }
                  if (state.riichiFuriten === true) {
                    console.log('riichifuri', state.riichiFuriten);
                }  */
                }}
              >
                <span className="button-inside green">NEXT</span>
              </button>
            </div>
          </div>
          
          {/* The single overlay balloon for errors & selection instructions */}
          <OverlayBalloon />

          {/* Settings Popup */}
          {isSettingsOpen && (
            <SettingsPopup onClose={() => setIsSettingsOpen(false)} />
          )}

          {/* Custom Hand Popup */}
          {isCustomOpen && (
            <CustomHandPopup onClose={() => SetIsCustomOpen(false)} />
          )}
        </div>

        {/* Right sidebar */}
        <Sidebar 
          setIsSettingsOpen={setIsSettingsOpen} 
          SetIsCustomOpen={SetIsCustomOpen}
          result={result}
        />

      </div>
    </div>
  );
};
