export interface GameArchiveLink {
  tournament: string;
  // The game archive's sections for each section of the tournament, keyed by its name
  sections: Record<string, string[]>;
}
