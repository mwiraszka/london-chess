import { movetextTokens, parsePgnDate, parsePgnGames, parsePlayerName } from './pgn.util';

const GAME_ONE = `[Event "London, Canada (Fall Open)"]
[Site "?"]
[Date "1994.??.??"]
[Round "3"]
[White "Litchfield, G."]
[Black "Jung, H."]
[Result "1-0"]
[ECO "B22"]
[PlyCount "5"]

1. e4 c5 2. c3 { A comment
spanning lines } 2... d5 3. exd5 1-0`;

const GAME_TWO = `[Event "2023 London Ch A1"]
[Date "2023.12.07"]
[White "Chen, Sasha"]
[Black "Ivanchuk, Serhii"]
[Result "0-1"]

1. d4 $6 (1. e4 { -DS }) 1... d5 0-1`;

describe('parsePgnGames', () => {
  it('should split a file into games with their tags and movetext', () => {
    const games = parsePgnGames(`${GAME_ONE}\n\n${GAME_TWO}\n`);

    expect(games).toHaveLength(2);
    expect(games[0].tags['Event']).toBe('London, Canada (Fall Open)');
    expect(games[0].tags['Black']).toBe('Jung, H.');
    expect(games[1].tags['Event']).toBe('2023 London Ch A1');
    expect(games[1].tags['Result']).toBe('0-1');
  });

  it('should keep comments and variations in the movetext on one line', () => {
    const [first, second] = parsePgnGames(`${GAME_ONE}\n\n${GAME_TWO}`);

    expect(first.moves).toBe(
      '1. e4 c5 2. c3 { A comment spanning lines } 2... d5 3. exd5 1-0',
    );
    expect(second.moves).toBe('1. d4 $6 (1. e4 { -DS }) 1... d5 0-1');
  });

  it('should ignore text before the first game', () => {
    const games = parsePgnGames(`\n\n${GAME_TWO}`);

    expect(games).toHaveLength(1);
  });

  it('should return nothing for an empty file', () => {
    expect(parsePgnGames('')).toEqual([]);
  });
});

describe('movetextTokens', () => {
  it('should return only the moves played', () => {
    expect(
      movetextTokens(
        '1. e4 c5 2. c3 { A comment } 2... d5 $6 (2... Nf6 3. e5) 3. exd5 1-0',
      ),
    ).toEqual(['e4', 'c5', 'c3', 'd5', 'exd5']);
  });

  it('should skip nested variations', () => {
    expect(movetextTokens('1. d4 (1. e4 (1. c4 e5) 1... e5) 1... d5 *')).toEqual([
      'd4',
      'd5',
    ]);
  });
});

describe('parsePlayerName', () => {
  it('should read a full name', () => {
    expect(parsePlayerName('Chen, Sasha')).toEqual({
      firstName: 'Sasha',
      lastName: 'Chen',
      suffix: '',
    });
  });

  it('should keep an initial with its dot', () => {
    expect(parsePlayerName('Litchfield, G.')).toEqual({
      firstName: 'G.',
      lastName: 'Litchfield',
      suffix: '',
    });
    expect(parsePlayerName('Litchfield, G')).toEqual({
      firstName: 'G.',
      lastName: 'Litchfield',
      suffix: '',
    });
  });

  it('should dot each letter of a set of initials', () => {
    expect(parsePlayerName('Lacroix, JP.').firstName).toBe('J.P.');
    expect(parsePlayerName('Hansen, LB.').firstName).toBe('L.B.');
  });

  it('should keep a two-letter abbreviation as recorded', () => {
    expect(parsePlayerName('Jurjans, Mn').firstName).toBe('Mn');
  });

  it('should drop text that bled in after a run of spaces', () => {
    expect(parsePlayerName('Zendrowski, J               B04.').firstName).toBe('J.');
    expect(parsePlayerName('McTavish, Dale              B').firstName).toBe('Dale');
  });

  it('should separate a suffix', () => {
    expect(parsePlayerName('Charette, J Sr')).toEqual({
      firstName: 'J.',
      lastName: 'Charette',
      suffix: 'Sr',
    });
  });

  it('should drop a title', () => {
    expect(parsePlayerName('Hamilton, R(FM).').firstName).toBe('R.');
  });

  it('should read a name whose comma was typed as a dot', () => {
    expect(parsePlayerName('Samano.B')).toEqual({
      firstName: 'B.',
      lastName: 'Samano',
      suffix: '',
    });
  });

  it('should keep a bare surname', () => {
    expect(parsePlayerName('Wong Rieger')).toEqual({
      firstName: '',
      lastName: 'Wong Rieger',
      suffix: '',
    });
  });

  it('should name an unrecorded player', () => {
    expect(parsePlayerName('?').lastName).toBe('Unknown');
    expect(parsePlayerName('').lastName).toBe('Unknown');
  });
});

describe('parsePgnDate', () => {
  it('should keep as much of the date as was recorded', () => {
    expect(parsePgnDate('2023.12.07')).toEqual({ year: 2023, date: '2023-12-07' });
    expect(parsePgnDate('1996.05.??')).toEqual({ year: 1996, date: '1996-05' });
    expect(parsePgnDate('1996.??.??')).toEqual({ year: 1996, date: '1996' });
  });

  it('should reject a date without a year', () => {
    expect(parsePgnDate('????.??.??')).toBeNull();
    expect(parsePgnDate(undefined)).toBeNull();
  });
});
