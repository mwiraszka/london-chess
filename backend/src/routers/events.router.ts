import { Router } from 'express';

import {
  addEvent,
  deleteEvent,
  getEvent,
  getEvents,
  updateEvent,
} from '../controllers/events.controller';
import { adminAuth } from '../middlewares/auth.index';

export const eventsRouter = Router()
  .get('/', getEvents)
  .get('/:id', getEvent)
  .post('/', adminAuth, addEvent)
  .put('/:id', adminAuth, updateEvent)
  .delete('/:id', adminAuth, deleteEvent);
