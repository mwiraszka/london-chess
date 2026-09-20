import { MOCK_TOURNAMENTS } from '@app/mocks/tournaments.mock';
import { RoundResult } from '@app/models';

import {
  formatScore,
  parseSubtitlePeople,
  roundResultDescription,
  roundResultLabel,
  shortenSubtitle,
} from './crosstable.util';

const result = (overrides: Partial<RoundResult>): RoundResult => ({
  round: 1,
  outcome: 'game',
  scores: [1],
  points: 1,
  opponentRank: 12,
  color: 'white',
  gameId: null,
  ...overrides,
});

const OPPONENT = MOCK_TOURNAMENTS[0].sections[0].entries[1];

describe('formatScore', () => {
  it('should write half points as a fraction', () => {
    expect(formatScore(4.5)).toBe('4½');
    expect(formatScore(0.5)).toBe('½');
    expect(formatScore(3)).toBe('3');
    expect(formatScore(0)).toBe('0');
  });

  it('should show a dash for a score that was not recorded', () => {
    expect(formatScore(null)).toBe('–');
  });
});

describe('roundResultLabel', () => {
  it('should show each game result with the opponent rank', () => {
    expect(roundResultLabel(result({}))).toBe('W12');
    expect(roundResultLabel(result({ scores: [0.5], points: 0.5 }))).toBe('D12');
    expect(roundResultLabel(result({ scores: [1, 0], points: 1 }))).toBe('WL12');
    expect(roundResultLabel(result({ scores: [0], points: 0, opponentRank: null }))).toBe(
      'L',
    );
  });

  it('should mark forfeits, byes and rounds not played', () => {
    expect(roundResultLabel(result({ outcome: 'forfeit' }))).toBe('X12');
    expect(roundResultLabel(result({ outcome: 'forfeit', scores: [0], points: 0 }))).toBe(
      'F12',
    );
    expect(roundResultLabel(result({ outcome: 'full-point-bye' }))).toBe('B');
    expect(roundResultLabel(result({ outcome: 'half-point-bye' }))).toBe('H');
    expect(roundResultLabel(result({ outcome: 'unplayed' }))).toBe('U');
  });
});

describe('roundResultDescription', () => {
  it('should describe a game with its color and opponent', () => {
    expect(roundResultDescription(result({}), OPPONENT)).toBe(
      `Won with white against ${OPPONENT.player.firstName} ${OPPONENT.player.lastName}.`,
    );
    expect(
      roundResultDescription(result({ scores: [0.5], points: 0.5, color: null }), null),
    ).toBe('Drew.');
  });

  it('should describe both games of a round of two', () => {
    expect(
      roundResultDescription(result({ scores: [1, 1], points: 2, color: null }), null),
    ).toBe('Won both games.');
    expect(
      roundResultDescription(
        result({ scores: [0.5, 0], points: 0.5, color: null }),
        null,
      ),
    ).toBe('Drew one and lost one.');
  });

  it('should describe forfeits, byes and rounds not played', () => {
    expect(
      roundResultDescription(
        result({ outcome: 'forfeit', scores: [0], points: 0, color: null }),
        null,
      ),
    ).toBe('Lost by forfeit.');
    expect(roundResultDescription(result({ outcome: 'full-point-bye' }), null)).toBe(
      'Full-point bye.',
    );
    expect(roundResultDescription(result({ outcome: 'half-point-bye' }), null)).toBe(
      'Half-point bye.',
    );
    expect(roundResultDescription(result({ outcome: 'unplayed' }), null)).toBe(
      'Did not play this round.',
    );
  });
});

describe('parseSubtitlePeople', () => {
  it('should read the simul givers with their ratings', () => {
    expect(parseSubtitlePeople('Gibson, Kevin 2302 / Ivanchuk, Serhii 2189')).toEqual({
      people: [
        { name: 'Gibson, Kevin', rating: 2302 },
        { name: 'Ivanchuk, Serhii', rating: 2189 },
      ],
      separator: ' / ',
    });
  });

  it('should read the two sides of a match, rated or not', () => {
    expect(parseSubtitlePeople('Gajiwala, Kiritkumar vs. Sarson, Ryan')).toEqual({
      people: [
        { name: 'Gajiwala, Kiritkumar', rating: null },
        { name: 'Sarson, Ryan', rating: null },
      ],
      separator: ' vs. ',
    });
    expect(parseSubtitlePeople('Semuranganya, Medi Kaliso 1440')).toEqual({
      people: [{ name: 'Semuranganya, Medi Kaliso', rating: 1440 }],
      separator: '',
    });
  });

  it('should have no people in an opening or a theme', () => {
    expect(parseSubtitlePeople("Queen's Gambit")).toBeNull();
    expect(parseSubtitlePeople('Chess960')).toBeNull();
    expect(parseSubtitlePeople('')).toBeNull();
  });
});

describe('shortenSubtitle', () => {
  it('should name people by surname and initial, without ratings', () => {
    expect(shortenSubtitle('Gibson, Kevin 2302 / Ivanchuk, Serhii 2189')).toBe(
      'Gibson, K. / Ivanchuk, S.',
    );
    expect(shortenSubtitle('Gajiwala, Kiritkumar vs. Sarson, Ryan')).toBe(
      'Gajiwala, K. vs. Sarson, R.',
    );
    expect(shortenSubtitle('Hampson, Adam 1440')).toBe('Hampson, A.');
  });

  it('should leave an opening or a theme as it is', () => {
    expect(shortenSubtitle('Dutch Defence')).toBe('Dutch Defence');
  });
});
