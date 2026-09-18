import { Router } from 'express';

import {
  getGame,
  getGames,
  getPlayers,
  getRandomGame,
  getSummary,
  getTournaments,
} from '../controllers/games.controller';

export const gamesRouter = Router()
  .get('/', getGames)
  .get('/players', getPlayers)
  .get('/random', getRandomGame)
  .get('/tournaments', getTournaments)
  .get('/summary', getSummary)
  .get('/:id', getGame);
