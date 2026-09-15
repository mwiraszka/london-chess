export interface ChampionshipTableRowData {
  year: number;
  winners: { name: string; peakRating?: string }[];
  textStyle?: string;
}
