import { unnotifiedMembers } from './unnotified-members.util';

describe('unnotifiedMembers', () => {
  it('should list the recipients not emailed, by surname, with their address', () => {
    const recipients = [
      { firstName: 'Olga', lastName: 'Zhou', email: 'olga@example.com' },
      { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
      { firstName: 'Adam', lastName: 'Doe', email: 'adam@example.com' },
      { firstName: 'Nina', lastName: 'Bell', email: 'nina@example.com' },
    ];

    const result = unnotifiedMembers(recipients, [false, false, false, true]);

    expect(result).toEqual([
      { name: 'Adam Doe', email: 'adam@example.com' },
      { name: 'Jane Doe', email: 'jane@example.com' },
      { name: 'Olga Zhou', email: 'olga@example.com' },
    ]);
  });
});
