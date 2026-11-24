import { Router } from 'express';

import {
  addEvent,
  changeEvents,
  deleteEvent,
  getEvent,
  getEvents,
  getWidestEvents,
  updateEvent,
} from '../controllers/events.controller';
import { adminAuth } from '../middlewares/auth.middleware';

export const eventsRouter = Router()
  .get('/', getEvents)
  .get('/widest', getWidestEvents)
  .get('/:id', getEvent)
  .post('/', adminAuth, addEvent)
  .patch('/', adminAuth, changeEvents)
  .put('/:id', adminAuth, updateEvent)
  .delete('/:id', adminAuth, deleteEvent);
