import { Route, Routes } from '@angular/router';

import { APP_ROUTES } from './app.routes';
import { accessGuard } from './guards/auth.guard';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';

async function childRoutes(route: Route): Promise<Routes> {
  const children = route.loadChildren ? ((await route.loadChildren()) as Routes) : [];
  // A pathless parent only lends its children providers, such as the article pages' markdown
  return children.flatMap(child =>
    child.path === '' && child.children ? child.children : [child],
  );
}

// The sections with editors, loaded alone since other pages bring libraries jsdom cannot run
const EDITOR_SECTIONS = ['album', 'article', 'event', 'image', 'member', 'tournament'];

async function editorRoutes(): Promise<{ path: string; route: Route }[]> {
  const editors: { path: string; route: Route }[] = [];
  const sections = APP_ROUTES.filter(({ path }) => EDITOR_SECTIONS.includes(path ?? ''));
  for (const parent of sections) {
    for (const child of await childRoutes(parent)) {
      if (child.path === 'add' || child.path?.startsWith('edit/')) {
        editors.push({ path: `${parent.path}/${child.path}`, route: child });
      }
    }
  }
  return editors;
}

describe('app routes', () => {
  it('should keep every editor to admins and guard its unsaved changes', async () => {
    const editors = await editorRoutes();

    expect(editors.map(({ path }) => path).sort()).toEqual([
      'album/add',
      'album/edit/:album',
      'article/add',
      'article/edit/:article_id',
      'event/add',
      'event/edit/:event_id',
      'image/add',
      'image/edit/:image_id',
      'member/add',
      'member/edit/:member_id',
      'tournament/add',
      'tournament/edit/:number',
    ]);
    editors.forEach(({ route }) => {
      expect(route.canActivate).toContain(accessGuard);
      expect(route.canDeactivate).toContain(unsavedChangesGuard);
      expect(route.data).toEqual({ access: 'admin' });
    });
  });

  it('should keep the account pages to members', () => {
    const account = APP_ROUTES.find(({ path }) => path === 'account/:section');

    expect(account?.canActivate).toContain(accessGuard);
    expect(account?.data).toEqual({ access: 'member' });
  });

  it('should send the old pages on to their new names', () => {
    const redirects = APP_ROUTES.filter(({ redirectTo }) => redirectTo).map(
      ({ path, redirectTo }) => [path, redirectTo],
    );

    expect(redirects).toEqual(
      expect.arrayContaining([
        ['about', 'faq'],
        ['news', 'articles'],
      ]),
    );
  });

  it('should send any unknown path home', () => {
    const fallback = APP_ROUTES[APP_ROUTES.length - 1];

    expect(fallback).toEqual({ path: '**', redirectTo: '' });
  });
});
