import { Page, expect, test } from './fixtures';
import { EVENTS, PAST_EVENTS, UPCOMING_EVENTS } from './seed';
import { flipSwitch, setSwitch } from './switches';

const SIMUL = EVENTS.find(event => event.type === 'simul')!;
const CLOSURE = EVENTS.find(event => event.type === 'closed')!;
const LINKED = EVENTS.find(event => event.articleId)!;

function eventsTable(page: Page) {
  return page.locator('lcc-events-table').getByRole('table', { name: 'Events' });
}

function indicator(page: Page, type: string) {
  return page.locator(
    `lcc-events-calendar-grid a.event-indicator.${type}:not(.other-month)`,
  );
}

async function openListView(page: Page): Promise<void> {
  await page.goto('/schedule');
  await setSwitch(page, 'Calendar view', false);
  await expect(page.getByRole('switch', { name: 'Calendar view' })).not.toBeChecked();
}

test.describe('schedule', () => {
  test('lists the upcoming events in the list view', async ({ page }) => {
    await openListView(page);

    for (const event of UPCOMING_EVENTS) {
      await expect(
        eventsTable(page).getByRole('heading', { name: event.title, exact: true }),
      ).toBeVisible();
    }
    for (const event of PAST_EVENTS) {
      await expect(
        eventsTable(page).getByRole('heading', { name: event.title, exact: true }),
      ).toHaveCount(0);
    }
  });

  test('shows past events once asked to', async ({ page }) => {
    await openListView(page);

    await flipSwitch(page, 'Show past events');

    for (const event of PAST_EVENTS) {
      await expect(
        eventsTable(page).getByRole('heading', { name: event.title, exact: true }),
      ).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Clear filters' })).toBeEnabled();

    await page.getByRole('button', { name: 'Clear filters' }).click();

    await expect(
      page.getByRole('switch', { name: 'Show past events' }),
    ).not.toBeChecked();
    await expect(
      eventsTable(page).getByRole('heading', { name: PAST_EVENTS[0].title, exact: true }),
    ).toHaveCount(0);
  });

  test('searches events by name', async ({ page }) => {
    await openListView(page);

    await page.getByRole('textbox', { name: 'Search' }).fill('rapid');

    const titles = eventsTable(page).getByRole('heading', { level: 3 });
    await expect(titles).toHaveText(['Rapid Night', 'Long Rapid Night']);
  });

  test('shows an event from the calendar in a dialog', async ({ page }) => {
    await page.goto('/schedule');
    await expect(page.getByRole('switch', { name: 'Calendar view' })).toBeChecked();

    await expect(indicator(page, 'simul')).toHaveAccessibleName(
      new RegExp(`^${SIMUL.title}, `),
    );
    await indicator(page, 'simul').click();

    const dialog = page.locator('lcc-dialog');
    await expect(dialog).toContainText(SIMUL.title);
    await expect(dialog).toContainText(SIMUL.details);

    await dialog.getByRole('button', { name: 'Close dialog' }).click();

    await expect(dialog).toHaveCount(0);
  });

  test("opens a past event's article from its dialog", async ({ page }) => {
    await page.goto('/schedule');
    await flipSwitch(page, 'Show past events');

    await indicator(page, 'championship').click();
    await page
      .locator('lcc-dialog')
      .getByRole('button', { name: 'More details' })
      .click();

    await expect(page).toHaveURL(new RegExp(`/article/view/${LINKED.articleId}$`));
  });

  test('closes only the newly opened dialog on Escape after earlier ones closed', async ({
    page,
  }) => {
    await page.goto('/schedule');
    const dialog = page.locator('lcc-dialog');
    const client = await page.context().newCDPSession(page);
    const documentKeydownListeners = async (): Promise<number> => {
      const { result } = await client.send('Runtime.evaluate', {
        expression: 'document',
      });
      const { listeners } = await client.send('DOMDebugger.getEventListeners', {
        objectId: result.objectId!,
      });
      return listeners.filter(({ type }) => type === 'keydown').length;
    };
    await expect(indicator(page, 'simul')).toBeVisible();
    const listenersBefore = await documentKeydownListeners();

    // Opening and closing in one task closes the dialog before its listeners attach
    await page.evaluate(() => {
      document
        .querySelector<HTMLElement>(
          'lcc-events-calendar-grid a.event-indicator.simul:not(.other-month)',
        )!
        .click();
      document.querySelector<HTMLElement>('lcc-dialog .close-button')!.click();
    });
    // A timer queued now runs after the one the dialog queued to attach its listeners
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve)));

    await expect(dialog).toHaveCount(0);
    expect(await documentKeydownListeners()).toBe(listenersBefore);

    await indicator(page, 'closed').click();
    await expect(dialog).toContainText(CLOSURE.title);
    await expect.poll(documentKeydownListeners).toBeGreaterThan(listenersBefore);

    await page.keyboard.press('Escape');

    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/schedule$/);
    await expect.poll(documentKeydownListeners).toBe(listenersBefore);
  });
});
