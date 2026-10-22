export function loadPage(url: string, { replace }: { replace: boolean }): void {
  if (replace) {
    window.location.replace(url);
  } else {
    window.location.assign(url);
  }
}
