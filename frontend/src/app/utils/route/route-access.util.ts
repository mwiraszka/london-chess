import { Data } from '@angular/router';

import { RouteAccess, User } from '@app/models';

interface AccessRoute {
  data: Data;
  firstChild: AccessRoute | null;
}

export function declaredAccess(data: Data): RouteAccess | null {
  const access: unknown = data['access'];
  return access === 'admin' || access === 'member' ? access : null;
}

export function requiredAccess(state: { root: AccessRoute }): RouteAccess | null {
  let strictest: RouteAccess | null = null;
  let route: AccessRoute | null = state.root;

  while (route) {
    const access = declaredAccess(route.data);

    if (access === 'admin') {
      return 'admin';
    }

    if (access === 'member') {
      strictest = 'member';
    }

    route = route.firstChild;
  }

  return strictest;
}

export function hasAccess(access: RouteAccess | null, user: User | null): boolean {
  if (!access) {
    return true;
  }

  return !!user && (access === 'member' || user.isAdmin);
}
