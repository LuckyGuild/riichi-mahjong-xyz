// src/components/Topbar.tsx
import React from 'react';
import { useStore } from '../contexts/store';
import { TileButton } from './ui/TileButton';

const livewallButtonClass = 'flex-1 max-w-[48px] aspect-[1/1.3332]';


export const LiveWall: React.FC = () => {
  const [state] = useStore();
  const { wall, liveWallCut,  
    wanpaiKan,
    wanpaiDora,
    wanpaiUradora,
    wanpaiHaitei,
    kamichaHand,
    toimenHand,
    shimochaHand,
    input: { hand, drawnTile, melds },
    watashiDiscards,
    kamichaDiscards,
    toimenDiscards,
    shimochaDiscards,
  } = state; 
  // wall.length is the number of live wall tiles remaining.
  // liveWallCut is the number of stacks for the first group.

  // The live wall is represented as 35 stacks (because each stack shows one tile back).
  const totalStacksCapacity = 35;
  const group1Capacity = liveWallCut; 
  const group2Capacity = 17;
  const group3Capacity = totalStacksCapacity - group1Capacity - group2Capacity; // e.g. 35 - 10 - 17 = 8

  // Determine how many stacks remain (round up so a half-drawn stack counts as full).
  const remainingStacks = Math.ceil(wall.length / 2);

  // Fill groups in order.
  const group1Visible = Math.min(group1Capacity, remainingStacks);
  const remainingAfterGroup1 = remainingStacks - group1Visible;
  const group2Visible = Math.min(group2Capacity, remainingAfterGroup1);
  const remainingAfterGroup2 = remainingAfterGroup1 - group2Visible;
  const group3Visible = Math.min(group3Capacity, remainingAfterGroup2);

  // Calculate placeholders for each group if they are not fully filled.
  const group1Placeholders = group1Capacity - group1Visible;
  const group2Placeholders = group2Capacity - group2Visible;
  const group3Placeholders = group3Capacity - group3Visible;

  // Combine hand + drawnTile if present.
  const combinedHand = drawnTile
    ? [...hand, drawnTile]
    : [...hand];
  const meldTiles = melds.flatMap(m => m.tiles);
  const handAndMelds = [...combinedHand, ...meldTiles];
  const totalTiles = wall.length + 
        wanpaiKan.length + wanpaiDora.length + wanpaiUradora.length + wanpaiHaitei.length +
        handAndMelds.length + kamichaHand.length + toimenHand.length + shimochaHand.length +
        watashiDiscards.length + kamichaDiscards.length + toimenDiscards.length + shimochaDiscards.length;
        /* console.log('totalTiles',totalTiles) */

  if (totalTiles !== 136) {
    console.error(`Expected 136 tiles, but found ${totalTiles}`);
  }

  return (
    <div 
      className="flex items-left p-2 w-full overflow-hidden"
      style={{ backgroundColor: '#314f82' }}
    >
      <div className="flex-1 flex justify-start items-center gap-[0.8px]">
        {/* ---------- GROUP 1 ---------- */}
          {Array.from({ length: group1Visible }).map((_, i) => (
            <TileButton 
              key={`g1-${i}`}
              tile={{ type: 'back' }}
              className={livewallButtonClass}
            />
          ))}
          {Array.from({ length: group1Placeholders }).map((_, i) => (
            <div key={`g1ph-${i}`} className={livewallButtonClass} />
          ))}
        
        {/* Placeholder between groups */}
        <div className={livewallButtonClass} />
        
        {/* ---------- GROUP 2 ---------- */}
          {Array.from({ length: group2Visible }).map((_, i) => (
            <TileButton 
              key={`g2-${i}`}
              tile={{ type: 'back' }}
              className={livewallButtonClass}
            />
          ))}
          {Array.from({ length: group2Placeholders }).map((_, i) => (
            <div key={`g2ph-${i}`} className={livewallButtonClass} />
          ))}

        {/* Placeholder between groups */}
        <div className={livewallButtonClass} />
        
        {/* ---------- GROUP 3 ---------- */}
          {Array.from({ length: group3Visible }).map((_, i) => (
            <TileButton 
              key={`g3-${i}`}
              tile={{ type: 'back' }}
              className={livewallButtonClass}
            />
          ))}
          {Array.from({ length: group3Placeholders }).map((_, i) => (
            <div key={`g3ph-${i}`} className={livewallButtonClass} />
          ))}

      </div>
    </div>
  );
};

export default LiveWall;
