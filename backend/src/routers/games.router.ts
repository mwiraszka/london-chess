import { Router } from 'express';

import {
  getGame,
  getGames,
  getMemberOpenings,
  getPlayers,
  getSummary,
  getTournaments,
  getWidestGames,
} from '../controllers/games.controller';

export const gamesRouter = Router()
  .get('/', getGames)
  .get('/players', getPlayers)
  .get('/tournaments', getTournaments)
  .get('/summary', getSummary)
  .get('/widest', getWidestGames)
  .get('/members/:number/openings', getMemberOpenings)
  .get('/:id', getGame);
