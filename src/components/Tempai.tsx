import { useTranslation } from 'react-i18next';
import { useStore } from '../contexts/store';
import { TileButton } from './ui/TileButton';
import type { TileAvailability } from '../lib/tile';
import type { FC } from 'react';

interface TempaiProps {
  tileAvailabilities: TileAvailability[];
}

export const Tempai: FC<TempaiProps> = ({ tileAvailabilities }) => {
  const [{ inputFocus }, dispatch] = useStore();
  const { t } = useTranslation();

  const ta = tileAvailabilities.filter(a => a.count > 0);

  const handleRiichi = () => {
    dispatch({ 
      type: 'call-riichi', 
      payload: { tileAvailabilities } 
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xl font-bold">{t('result.tempai')}</div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {ta.map((a, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-10">
              <TileButton
                tile={a.tile}
              />
            </div>
            <div>&times; {a.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
};