import { type FC, useEffect, useState } from 'react';
import { useStore } from '../contexts/store';
import type { Hora } from '../lib/hora';
import { HoraItemSummary } from './HoraItemSummary';
import { FuDetail } from './FuDetail';
import { YakuList } from './YakuList';
import { Score } from './Score';
import { ScorePlusList } from './ScorePlusList';
import { PointDiff } from './PointDiff';

/**
 * Render Check (the shouldRender logic): 
   If both handOptions.ron and handOptions.tsumo are false, it returns true → meaning “render all lines,” but each line starts collapsed (more on this in step 2).
   If only ron is true, it returns true only for lines whose info.by === 'ron', and false for lines with info.by === 'tsumo'.
   If only tsumo is true, it returns true only for lines whose info.by === 'tsumo'.
   If both ron and tsumo are true, it returns true for both lines → thus everything is rendered.
   If shouldRender is false we return null
 * useEffect for auto‑open (collapsing or expanding):
   It re‑runs on [ron, tsumo, info.by].
   If both are false, it calls setOpen(false) so everything remains collapsed, but we see all lines
   If this line’s info.by === 'ron' and ron === true, we call setOpen(true).
   If this line’s info.by === 'tsumo' and tsumo === true, we call setOpen(true).
   Otherwise, we set open to false.
 */

/** A single “Hora line” item. */
interface HoraItemProps {
  info: Hora;
}

export const HoraItem: FC<HoraItemProps> = ({ info }) => {
  const [{ handOptions }] = useStore();
  const { ron, tsumo } = handOptions;

  // Local "expanded" state for this line
  const [open, setOpen] = useState(false);

  /**
   * Whenever `ron` / `tsumo` change, decide if this line (info.by)
   * should be automatically opened or closed.
   */
  useEffect(() => {
    // If both are false => do not auto–open
    if (!ron && !tsumo) {
      setOpen(false);
      return;
    }

    // If the line is "ron" & handOptions.ron===true => open
    if (info.by === 'ron' && ron) {
      setOpen(true);
      return;
    }

    // If the line is "tsumo" & handOptions.tsumo===true => open
    if (info.by === 'tsumo' && tsumo) {
      setOpen(true);
      return;
    }

    // Otherwise, close
    setOpen(false);
  }, [ron, tsumo, info.by]);

  /**
   * Decide if we should render this line at all:
   *  - If both ron/tsumo are false => show all lines (collapsed by default).
   *  - If ron=true => only show lines where info.by==='ron'.
   *  - If tsumo=true => only show lines where info.by==='tsumo'.
   *  - If both are true => show all lines.
   */
  const shouldRender = (() => {
    if (!ron && !tsumo) {
      // Both false => show everything
      return true;
    }
    // If this line is 'ron' & ron is on => show
    if (info.by === 'ron' && ron) return true;
    // If this line is 'tsumo' & tsumo is on => show
    if (info.by === 'tsumo' && tsumo) return true;
    return false;
  })();

  // If we decided not to render this line, bail out early.
  if (!shouldRender) {
    return null;
  }

  // -----------------------------
  // Render the line
  // -----------------------------
  return (
    <div className="flex flex-col rounded-md bg-white shadow dark:bg-black">
      <button onClick={() => setOpen(o => !o)} className="peer text-left">
        <HoraItemSummary info={info} />
      </button>

      {open && (
        <>
          <div className="mx-2 border-t border-neutral-200 dark:border-neutral-800" />

          <FuDetail
            fu={
              info.type === 'mentsu'
                ? info.fu
                : info.type === 'chitoitsu'
                ? 'chitoitsu'
                : undefined
            }
          />
          <YakuList yaku={info.yaku} />
          <Score info={info} />
          <ScorePlusList info={info} />
          <PointDiff info={info} />
        </>
      )}
    </div>
  );
};
