import { Router } from 'express';

import {
  getMemberTournaments,
  getTournament,
  getTournaments,
} from '../controllers/tournaments.controller';

export const tournamentsRouter = Router()
  .get('/', getTournaments)
  .get('/members/:number', getMemberTournaments)
  .get('/:number', getTournament);
