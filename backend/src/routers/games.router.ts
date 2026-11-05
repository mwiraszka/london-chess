import { Router } from 'express';

import {
  getGame,
  getGames,
  getHeadToHead,
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
  .get('/head-to-head/:first/:second', getHeadToHead)
  .get('/:id', getGame);
