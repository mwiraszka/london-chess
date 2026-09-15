import { Article } from './article.model';
import { Event } from './event.model';
import { Image } from './image.model';
import { Member } from './member.model';

export type EntityType = Article | Event | Image | Member;

export type Entity = 'article' | 'event' | 'image' | 'album' | 'member';
