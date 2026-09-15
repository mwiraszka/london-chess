import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Highlight all occurrences of a search query in a piece of text.
 */
@Pipe({
  name: 'highlight',
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value?: string | null, searchQuery?: string): SafeHtml {
    if (!value) {
      return '';
    }

    if (!searchQuery?.trim()) {
      return value;
    }

    // Escape special regex characters in the search query
    const escapedSearchQuery = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create a case-insensitive regex
    const regex = new RegExp(`(${escapedSearchQuery})`, 'gi');

    // Replace matches with highlighted spans
    const highlightedText = value.replace(
      regex,
      '<mark class="lcc-search-highlight">$1</mark>',
    );

    // Return sanitized HTML
    return this.sanitizer.bypassSecurityTrustHtml(highlightedText);
  }
}
