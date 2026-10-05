import { useTestDatabase } from '../testing/database';
import { createMember, readMember, startMemberNumbers } from '../testing/fixtures';
import { assignMemberNumber } from './member-numbers.service';

describe('assignMemberNumber', () => {
  useTestDatabase();

  it('should give a member the next number and move the counter on', async () => {
    await startMemberNumbers(42);
    const first = await createMember();
    const second = await createMember();

    await assignMemberNumber(first._id.toString());
    await assignMemberNumber(second._id.toString());

    expect((await readMember(first._id)).number).toBe(42);
    expect((await readMember(second._id)).number).toBe(43);
  });

  it('should keep the number a returning member already has', async () => {
    await startMemberNumbers(42);
    const member = await createMember({ number: 7 });

    await assignMemberNumber(member._id.toString());

    expect((await readMember(member._id)).number).toBe(7);
  });

  it('should do nothing for a member that does not exist', async () => {
    await startMemberNumbers(42);

    await expect(assignMemberNumber('64b7f0c2a1d3e4f5a6b7c8d9')).resolves.toBeUndefined();
  });

  it('should refuse to number a member before the counter is set up', async () => {
    const member = await createMember();

    await expect(assignMemberNumber(member._id.toString())).rejects.toThrow(
      'The member number counter has not been initialized.',
    );
  });
});
