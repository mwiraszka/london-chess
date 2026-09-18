import { Type } from '@angular/core';
import { Params } from '@angular/router';

import { Id } from './core.model';
import { NavPath } from './nav-path.model';

interface BaseLink {
  text: string;
  icon?: Type<unknown>;
  tooltip?: string;
}

type ControlMode = 'add' | 'edit' | 'view';

export type InternalPath = NavPath | [NavPath, ControlMode] | [NavPath, ControlMode, Id];

export interface InternalLink extends BaseLink {
  internalPath: InternalPath;
  queryParams?: Params;
  externalPath?: never;
}

export interface ExternalLink extends BaseLink {
  externalPath: string | null;
  queryParams?: never;
  internalPath?: never;
}
