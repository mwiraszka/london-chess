import { Router } from 'express';

import {
  addTournament,
  checkTournamentImport,
  deleteTournament,
  getMemberTournaments,
  getTournament,
  getTournaments,
  matchTournamentPlayers,
  registerForTournament,
  updateTournament,
  withdrawFromTournament,
} from '../controllers/tournaments.controller';
import { adminAuth, authenticate } from '../middlewares/auth.middleware';

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
