export interface GameArchiveLink {
  tournament: string;
  // The archive sections holding each tournament section's games, by section name
  sections: Record<string, string[]>;
}
