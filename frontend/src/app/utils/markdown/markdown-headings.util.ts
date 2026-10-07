import { marked } from 'marked';

const textOf = (html: string): string =>
  new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? '';

/**
 * The text of each second-level heading as the page will show it, in order, written in
 * markdown or as HTML. Read from the markdown itself so the contents can be laid out with
 * the article rather than added once it has rendered.
 */
export function markdownHeadings(markdown: string): string[] {
  const headings: string[] = [];
  marked.walkTokens(marked.lexer(markdown), token => {
    if (token.type === 'heading' && token.depth === 2) {
      headings.push(textOf(marked.Parser.parseInline(token.tokens ?? [])));
    } else if (token.type === 'html' && token.block) {
      new DOMParser()
        .parseFromString(token.text, 'text/html')
        .querySelectorAll('h2')
        .forEach(heading => headings.push(heading.textContent?.trim() ?? ''));
    }
  });
  return headings.filter(heading => heading !== '');
}
