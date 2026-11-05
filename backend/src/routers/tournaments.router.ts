import { Router } from 'express';

import {
  addTournament,
  checkTournamentImport,
  deleteTournament,
  getArchiveGames,
  getMemberTournaments,
  getTournament,
  getTournaments,
  matchTournamentPlayers,
  registerForTournament,
  updateArchiveGames,
  updateTournament,
  withdrawFromTournament,
} from '../controllers/tournaments.controller';
import { adminAuth, authenticate } from '../middlewares/auth.middleware';

// Admin reads stay off the public CDN cache the tournaments router answers through
export const adminTournamentsRouter = Router()
  .get('/:number/archive-games', adminAuth, getArchiveGames)
  .put('/:number/archive-games', adminAuth, updateArchiveGames);

export const tournamentsRouter = Router()
  .get('/', getTournaments)
  .get('/members/:number', getMemberTournaments)
  .get('/:number', getTournament)
  .post('/', adminAuth, addTournament)
  .post('/player-matches', adminAuth, matchTournamentPlayers)
  .put('/:number', adminAuth, updateTournament)
  .post('/:number/import-changes', adminAuth, checkTournamentImport)
  .delete('/:number', adminAuth, deleteTournament)
  .post('/:number/registration', authenticate, registerForTournament)
  .delete('/:number/registration', authenticate, withdrawFromTournament);
