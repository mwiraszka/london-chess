import { EagamiPaletteConfig, PaletteRoles, SelectOption } from '@eagami/ui';

import { Brand, BrandDefinition } from '@app/models';

export const DEFAULT_BRAND: Brand = 'modern';

// The dark page sits mid-scale rather than near black, so brand text takes a lighter
// shade there than the library's default to stay readable on it
const ROLES: Partial<PaletteRoles> = { textDark: '200' };

const palette = (primary: string, secondary: string): EagamiPaletteConfig => ({
  primary: { base: primary, roles: ROLES },
  secondary: { base: secondary, roles: ROLES },
});

export const BRANDS: Record<Brand, BrandDefinition> = {
  modern: {
    label: 'Modern',
    palette: palette('#608ea9', '#dd7027'),
    stylesheet: null,
  },
  classic: {
    label: 'Classic',
    palette: palette('#2f6b4f', '#b8892b'),
    stylesheet:
      'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Playfair+Display:ital,wght@0,400;0,600;1,600&display=swap',
  },
  sunset: {
    label: 'Sunset',
    palette: palette('#d37d38', '#bb584f'),
    stylesheet:
      'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Righteous&family=Sora:wght@400;600&display=swap',
  },
  newsprint: {
    label: 'Newsprint',
    palette: palette('#44403c', '#936a37'),
    stylesheet:
      'https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,500;0,600;1,400&family=UnifrakturMaguntia&display=swap',
  },
  playground: {
    label: 'Playground',
    palette: palette('#65a30d', '#9333ea'),
    stylesheet:
      'https://fonts.googleapis.com/css2?family=Chewy&family=Fredoka:wght@300;400;500;600&display=swap',
  },
};

export const BRAND_OPTIONS: SelectOption[] = Object.entries(BRANDS).map(
  ([value, { label }]) => ({ value, label }),
);
