import { markdownHeadings } from './markdown-headings.util';

describe('markdownHeadings', () => {
  it('should list the second-level headings in order', () => {
    const headings = markdownHeadings(
      '# Title\n\n## First\n\nText\n\n### Aside\n\n## Second\n',
    );

    expect(headings).toEqual(['First', 'Second']);
  });

  it('should read each heading as the page shows it, without its markup', () => {
    const headings = markdownHeadings(
      '## Second *Part*\n\n## Q&amp;A with <em>guests</em>\n\n## [Linked](https://example.com) ![logo](logo.png)\n',
    );

    expect(headings).toEqual(['Second Part', 'Q&A with guests', 'Linked']);
  });

  it('should include headings written as HTML or nested in other blocks', () => {
    const headings = markdownHeadings(
      '## First\n\n<h2>Written as HTML</h2>\n\n> ## Quoted\n\n- ## Listed\n',
    );

    expect(headings).toEqual(['First', 'Written as HTML', 'Quoted', 'Listed']);
  });

  it('should leave out headings with no text', () => {
    const headings = markdownHeadings('## First\n\n<h2></h2>\n\n##\n');

    expect(headings).toEqual(['First']);
  });
});
