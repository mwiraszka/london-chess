import { type EagamiPaletteConfig } from '@eagami/ui';

import { Url } from './core.model';

export type Brand = 'modern' | 'classic' | 'sunset' | 'newsprint' | 'playground';

// A look for the whole site: its colours, derived from two base colours, and the web fonts
// its type needs beyond those every page already loads (the type itself is set in
// themes/_brands.scss)
export interface BrandDefinition {
  label: string;
  palette: EagamiPaletteConfig;
  stylesheet: Url | null;
}
