import removeMd from 'remove-markdown';

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'summarizeArticle',
})
export class SummarizeArticlePipe implements PipeTransform {
  transform(markdown?: string, isBlitz = false): string {
    if (markdown === undefined || markdown === null) {
      return '';
    }

    if (isBlitz) {
      return this.getResultTablePreview(markdown);
    }

    return this.stripMarkdown(markdown);
  }

  private stripMarkdown(markdown: string): string {
    return removeMd(
      markdown
        .replace(/^#{1,6}\s+.+$/gm, '')
        .replace(/^[ \t]*[-*]\s+/gm, '\uE001')
        .replace(/{{{[^}]+}}}(?:\(\(\([^)]+\)\)\))?(?:<<<.*?>>>)?/gs, ''),
    )
      .replace(/\|--/g, '')
      .replace(/\|/g, '')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, ' ')
      .replace(/\s*\uE001/g, '<br>\u2022 ')
      .replace(/^<br>/, '')
      .trim();
  }

  private getResultTablePreview(body: string): string {
    const dataRows = body
      .split('\n')
      .filter(line => /^\|\s*\d+\s*\|/.test(line.trim()))
      .slice(0, 5);

    return dataRows
      .map(row => {
        const cols = row
          .split('|')
          .map(c => c.trim())
          .filter(c => c.length > 0);
        const [number, fullName, rating] = cols;
        const score = cols[cols.length - 1];
        const name = this.formatPlayerName(fullName);
        return `${number}. ${name} <span class="result-preview-rating">(${rating})</span> \u2013 ${score}`;
      })
      .join('<br>');
  }

  private formatPlayerName(fullName: string): string {
    const commaIndex = fullName.indexOf(',');
    const lastName =
      commaIndex === -1 ? fullName.trim() : fullName.slice(0, commaIndex).trim();
    const firstPart = commaIndex === -1 ? '' : fullName.slice(commaIndex + 1).trim();
    const initial = firstPart.charAt(0).toUpperCase();
    const name = initial ? `${lastName}, ${initial}.` : lastName;
    return name.length > 12 ? name.slice(0, 9).trimEnd() + '...' : name;
  }
}
