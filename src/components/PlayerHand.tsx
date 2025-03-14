// src/components/PlayerHand.tsx
import { type FC, useEffect, useRef, useState } from 'react';
import { TileButton, RotateTileButton } from './ui/TileButton';
import { useStore } from '../contexts/store';
import type { Meld, Kan, Pon } from '../lib/input'; // Import Kan and Pon


interface PlayerHandProps {} // Currently no props, but good practice

export const PlayerHand: FC<PlayerHandProps> = () => { 
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