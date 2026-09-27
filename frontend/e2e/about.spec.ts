import { expect, test } from './fixtures';

test.describe('about', () => {
  test('shows where the club meets without opening anything', async ({ page }) => {
    await page.goto('/about');

    await expect(page.locator('lcc-club-card')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Scheduled events' })).toBeVisible();
  });

  test('opens a question to read its answer and closes it again', async ({ page }) => {
    await page.goto('/about');
    const question = page.getByRole('button', { name: 'Is there parking?' });
    const answer = page.getByRole('region', { name: 'Is there parking?' });
    await expect(question).toHaveAttribute('aria-expanded', 'false');

    await question.click();

    await expect(answer).toBeVisible();
    await expect(answer).not.toBeEmpty();

    await question.click();

    await expect(answer).toHaveCount(0);
  });
});
