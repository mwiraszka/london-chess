export interface ChampionshipTableRowData {
  year: number;
  winners: { name: string; peakRating?: string }[];
  // The reigning champion
  isCurrent?: boolean;
  // A year the championship was not held
  isNote?: boolean;
}
