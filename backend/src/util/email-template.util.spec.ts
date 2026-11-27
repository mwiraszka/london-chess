import {
  buildEmail,
  codeBlock,
  groupedTable,
  link,
  mailtoLink,
  paragraph,
  table,
} from './email-template.util';

describe('buildEmail', () => {
  it('should open with the logo and heading, and start the text with the heading', () => {
    const email = buildEmail('Subject', 'Heading', [paragraph('Body')]);

    expect(email.subject).toBe('Subject');
    expect(email.html).toMatch(/^<div[^>]*><img src="https:\/\/londonchess\.ca\/[^"]+"/);
    expect(email.html).toMatch(/<h2[^>]*>Heading<\/h2>/);
    expect(email.text).toBe('Heading\n\nBody');
  });

  it('should space out every block but the last', () => {
    const email = buildEmail('Subject', 'Heading', [
      paragraph('First'),
      paragraph('Last'),
    ]);

    expect(email.html).toContain('<p style="margin: 0 0 16px;">First</p>');
    expect(email.html).toContain('<p style="margin: 0;">Last</p>');
  });

  it('should render links as anchors in HTML and as their label in text', () => {
    const email = buildEmail('Subject', 'Heading', [
      paragraph('Visit ', link('https://londonchess.ca'), '.'),
      paragraph('Email ', mailtoLink('club@example.com'), '.'),
    ]);

    expect(email.html).toContain(
      'Visit <a href="https://londonchess.ca">https://londonchess.ca</a>.',
    );
    expect(email.html).toContain(
      'Email <a href="mailto:club@example.com">club@example.com</a>.',
    );
    expect(email.text).toContain('Visit https://londonchess.ca.');
    expect(email.text).toContain('Email club@example.com.');
  });

  it('should give a table with columns a header row and name each value in text', () => {
    const email = buildEmail('Subject', 'Heading', [
      table([['City', 'London', 'Toronto']], ['Detail', 'Previous', 'New']),
    ]);

    expect(email.html).toMatch(/<th scope="col"[^>]*>Previous<\/th>/);
    expect(email.html).toMatch(/<td[^>]*>City<\/td>/);
    expect(email.text).toContain('City: previous London, new Toronto');
  });

  it('should label each row of a table without columns by its first cell', () => {
    const email = buildEmail('Subject', 'Heading', [table([['Name', 'Jane Doe']])]);

    expect(email.html).toMatch(/<th scope="row"[^>]*>Name<\/th><td[^>]*>Jane Doe<\/td>/);
    expect(email.text).toContain('Name: Jane Doe');
  });

  it('should name each group of a grouped table once, beside all of its rows', () => {
    const email = buildEmail('Subject', 'Heading', [
      groupedTable(
        [
          {
            label: 'Blitz (Dec 3)',
            rows: [
              ['Title', 'Blitz', 'Club Closed'],
              ['Type', 'Blitz', 'Closed'],
            ],
          },
        ],
        ['Event', 'Detail', 'Previous', 'New'],
      ),
    ]);

    expect(email.html).toMatch(/<th scope="col"[^>]*>Event<\/th>/);
    expect(email.html).toMatch(
      /<tr><td rowspan="2"[^>]*>Blitz \(Dec 3\)<\/td><td[^>]*>Title<\/td>/,
    );
    expect(email.html).toMatch(/<tr><td[^>]*>Type<\/td>/);
    expect(email.html.match(/Blitz \(Dec 3\)/g)).toHaveLength(1);
    expect(email.text).toContain(
      'Blitz (Dec 3)\nTitle: previous Blitz, new Club Closed\nType: previous Blitz, new Closed',
    );
  });

  it('should escape content in the HTML but not in the text', () => {
    const email = buildEmail('Subject', '<Heading>', [
      paragraph('<b>Jane</b> & co'),
      codeBlock('a"b'),
      table([['<Label>', '<Value>']]),
    ]);

    expect(email.html).toContain('&lt;Heading&gt;');
    expect(email.html).toContain('&lt;b&gt;Jane&lt;/b&gt; &amp; co');
    expect(email.html).toContain('a&quot;b');
    expect(email.html).toContain('&lt;Value&gt;');
    expect(email.html).not.toContain('<b>');
    expect(email.text).toContain('<b>Jane</b> & co');
    expect(email.text).toContain('<Label>: <Value>');
  });
});
