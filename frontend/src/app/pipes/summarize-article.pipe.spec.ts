import { SummarizeArticlePipe } from './summarize-article.pipe';

const MOCK_RESULT_TABLE_BODY =
  '## Open\n<br>\n\n| # | Name | Rating | Round 1 | Points |\n|--:|--|--|--|--:|\n' +
  '|1\t|Fry, Philip\t|2195\t|W6 (w)\t|1.0|\n' +
  '|2\t|Turanga, Leela\t|1954\t|W20 (w)\t|1.0|\n' +
  '|3\t|Rodriguez, Bender\t|1835\t|W13 (w)\t|1.0|\n' +
  '|4\t|Farnsworth, Hubert\t|2056\t|L8 (b)\t|0.0|\n' +
  '|5\t|Wong, Amy\t|1431\t|W15 (w)\t|1.0|\n' +
  '|6\t|Kroker, Kif\t|1827\t|L1 (b)\t|0.0|';

describe('SummarizeArticlePipe', () => {
  const pipe = new SummarizeArticlePipe();

  it('handles missing and empty input correctly', () => {
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform(' ')).toBe('');
    expect(pipe.transform('abc')).toBe('abc');
  });

  it('strips headings entirely (all levels)', () => {
    expect(pipe.transform('## Title')).toBe('');
    expect(pipe.transform('### Section')).toBe('');
    expect(pipe.transform('# H1')).toBe('');
    expect(pipe.transform('## Intro\n\nSome text')).toBe('Some text');
    expect(pipe.transform('## Intro\n\nSome text\n\n### Details\n\nMore text')).toBe(
      'Some text    More text',
    );
  });

  it('collapses all newlines to spaces', () => {
    expect(pipe.transform('Line one\nLine two')).toBe('Line one Line two');
    expect(pipe.transform('A\n\nB')).toBe('A  B');
    expect(pipe.transform('\n\nText')).toBe('Text');
  });

  it('converts bullet points to \u2022 markers on a new line', () => {
    expect(pipe.transform('- Item one\n- Item two')).toBe(
      '\u2022 Item one<br>\u2022 Item two',
    );
    expect(pipe.transform('* Item A\n* Item B')).toBe('\u2022 Item A<br>\u2022 Item B');
    expect(pipe.transform('Intro text\n- Item one\n- Item two')).toBe(
      'Intro text<br>\u2022 Item one<br>\u2022 Item two',
    );
  });

  it('strips markdown characters correctly', () => {
    expect(pipe.transform('|-')).toBe('-');
    expect(pipe.transform('|--')).toBe('');
    expect(pipe.transform('|---')).toBe('-');
    expect(pipe.transform('|--text|--')).toBe('text');

    expect(pipe.transform('&#39')).toBe('&#39');
    expect(pipe.transform('&#39;')).toBe("'");
    expect(pipe.transform('&#39;text&#39;')).toBe("'text'");

    expect(pipe.transform('&#39;text&#39; abc |--text|--')).toBe("'text' abc text");
  });

  it('removes special image syntax', () => {
    expect(pipe.transform('{{{https://example.com/image.jpg}}}')).toBe('');
    expect(pipe.transform('{{{image-id}}}')).toBe('');
    expect(pipe.transform('{{{https://example.com/image.jpg}}}(((300)))')).toBe('');
    expect(pipe.transform('{{{https://example.com/image.jpg}}}<<<caption>>>')).toBe('');
    expect(
      pipe.transform('{{{https://example.com/image.jpg}}}(((300)))<<<caption>>>'),
    ).toBe('');

    expect(
      pipe.transform(
        'text before {{{https://example.com/image.jpg}}}(((300)))<<<caption>>> text after',
      ),
    ).toBe('text before  text after');

    expect(
      pipe.transform('abc {{{url}}}(((300)))<<<caption with > character>>> def'),
    ).toBe('abc  def');

    expect(
      pipe.transform(
        'first {{{url1}}}(((100)))<<<caption1>>> middle {{{url2}}}<<<caption2>>> last',
      ),
    ).toBe('first  middle  last');
  });

  it('formats a result table article as a numbered player list', () => {
    expect(pipe.transform(MOCK_RESULT_TABLE_BODY, true)).toBe(
      '1. Fry, P. <span class="result-preview-rating">(2195)</span> \u2013 1.0<br>' +
        '2. Turanga, L. <span class="result-preview-rating">(1954)</span> \u2013 1.0<br>' +
        '3. Rodriguez... <span class="result-preview-rating">(1835)</span> \u2013 1.0<br>' +
        '4. Farnswort... <span class="result-preview-rating">(2056)</span> \u2013 0.0<br>' +
        '5. Wong, A. <span class="result-preview-rating">(1431)</span> \u2013 1.0',
    );
  });

  it('limits result table preview to 5 players', () => {
    const lines = pipe.transform(MOCK_RESULT_TABLE_BODY, true).split('<br>');
    expect(lines.length).toBe(5);
  });
});
