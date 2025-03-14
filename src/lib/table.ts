export type Wind = 'east' | 'south' | 'west' | 'north';

export interface Table {
  round: Wind;
  seat: Wind;
  roundCount: number;
  honba: boolean;
  riichiLastGame: boolean;
  continue: number;
  deposit: number;
}
