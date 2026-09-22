import { TournamentSizing } from '@app/models';

export const TOURNAMENT_SIZING: TournamentSizing = {
  tournaments: [
    {
      name: 'COVID-19 Match',
      subtitle: 'Gajiwala, Kiritkumar vs. Sarson, Ryan',
    },
    {
      name: 'Blitz',
      subtitle: "Queen's Gambit",
    },
    {
      name: 'Blitz',
      subtitle: 'Dutch Defence',
    },
    {
      name: 'Blitz',
      subtitle: "King's Gambit",
    },
    {
      name: 'Blitz',
      subtitle: 'Sicilian',
    },
    {
      name: 'Blitz',
      subtitle: 'Chess960',
    },
    {
      name: 'London Junior Chess Championship',
      subtitle: '',
    },
    {
      name: 'Vassili Zolotovski Memorial',
      subtitle: '',
    },
    {
      name: 'Summer Solstice Showdown',
      subtitle: '',
    },
    {
      name: 'David Jackson Memorial',
      subtitle: '',
    },
    {
      name: 'Championship Qualifier',
      subtitle: '',
    },
  ],
  timeControls: ['3 hours', 'G90+30', 'G5+3'],
  players: [
    {
      firstName: 'Manju',
      lastName: 'Viralam Lakshminarasimha',
      suffix: '',
    },
    {
      firstName: 'Thamaraiselvan',
      lastName: 'Dhandapani',
      suffix: '',
    },
    {
      firstName: 'Medi Kaliso',
      lastName: 'Semuranganya',
      suffix: '',
    },
    {
      firstName: 'Alistair',
      lastName: 'Dennis-Grantham',
      suffix: '',
    },
    {
      firstName: 'Maheshkumar',
      lastName: 'Jayakrishnan',
      suffix: '',
    },
  ],
  results: [
    {
      name: 'Tandem Simul 2026',
      section: 'Cloutier, Annabelle 1847 / Hampson, Adam 1432',
    },
    {
      name: 'Tandem Simul 2025',
      section: 'Ivanchuk, Serhii 2208',
    },
    {
      name: 'Tandem Simul 2025',
      section: 'Hampson, Adam 1440',
    },
    {
      name: 'Tandem Simul 2025',
      section: 'Ehrman, Carl 2026',
    },
    {
      name: 'London Junior Chess Championship',
      section: '',
    },
    {
      name: 'Vassili Zolotovski Memorial',
      section: '',
    },
  ],
  resultNotes: [
    'Game incomplete, Winning on board',
    'Draw by mutual agreement',
    'Game incomplete',
  ],
  maxRounds: 9,
  maxPlayers: 82,
  maxSectionPlayers: 65,
  maxRating: 2307,
  maxProvisionalGames: 7,
  maxScore: 11.5,
  hasDateRanges: true,
};
