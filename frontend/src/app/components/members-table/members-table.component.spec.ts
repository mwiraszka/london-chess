import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { BasicDialogComponent } from '@app/components/basic-dialog/basic-dialog.component';
import { MEMBERS_PAGE_SIZES } from '@app/constants/members-table';
import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { AdminControlsConfig, DataPaginationOptions, Member } from '@app/models';
import { AdminControlsService, DialogService, StoreRequestService } from '@app/services';
import { MembersActions, initialState as membersInitialState } from '@app/store/members';
import { CITY_CHAMPION, lastOpenedDialog, query, queryAll } from '@app/utils';

import { MemberRow, MembersTableComponent } from './members-table.component';

describe('MembersTableComponent', () => {
  let fixture: ComponentFixture<MembersTableComponent>;
  let component: MembersTableComponent;
  let router: Router;

  let dialogOpenSpy: MockInstance;
  let openSpy: Mock;
  let optionsChangeSpy: MockInstance;
  let storeRequestSpy: Mock;

  // In the order the server sends them for these options
  const members = [...MOCK_MEMBERS].sort((a, b) => a.lastName.localeCompare(b.lastName));

  const options: DataPaginationOptions<Member> = {
    page: 2,
    pageSize: 10,
    sortBy: 'lastName',
    sortOrder: 'asc',
    filters: {
      showInactiveMembers: {
        label: 'Show inactive members',
        value: false,
      },
    },
    search: '',
  };

  const textOf = (element: DebugElement): string =>
    element.nativeElement.textContent.replace(/\s+/g, ' ').trim();

  const headers = () =>
    queryAll(fixture.debugElement, '.ea-data-table__cell--header').map(textOf);

  const bodyRows = () =>
    queryAll(fixture.debugElement, '.ea-data-table__body .ea-data-table__row');

  const cellTexts = (row: DebugElement) =>
    queryAll(row, '.ea-data-table__cell').map(textOf);

  // The controls a right click on the row hands to the service
  const controlsOf = (row: DebugElement): AdminControlsConfig => {
    query(row, '.members__name').nativeElement.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    return openSpy.mock.calls.at(-1)?.[0] as AdminControlsConfig;
  };

  const render = (inputs: Partial<Record<string, unknown>> = {}) => {
    const values = {
      isAdmin: false,
      isSafeMode: false,
      members,
      options,
      filteredCount: 50,
      isLoading: false,
      ...inputs,
    };
    Object.entries(values).forEach(([name, value]) =>
      fixture.componentRef.setInput(name, value),
    );
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersTableComponent],
      providers: [
        provideMockStore({ initialState: { membersState: membersInitialState } }),
        provideRouter([]),
        { provide: AdminControlsService, useValue: { open: vi.fn() } },
        { provide: DialogService, useValue: { open: vi.fn() } },
        {
          provide: StoreRequestService,
          useValue: { dispatch: vi.fn().mockResolvedValue(null) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MembersTableComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    dialogOpenSpy = vi.spyOn(TestBed.inject(DialogService), 'open');
    openSpy = vi.mocked(TestBed.inject(AdminControlsService).open);
    optionsChangeSpy = vi.spyOn(component.optionsChange, 'emit');
    storeRequestSpy = vi.mocked(TestBed.inject(StoreRequestService).dispatch);
    TestBed.inject(MockStore);
  });

  describe('for the public', () => {
    beforeEach(() => render());

    it('should show the public columns', () => {
      expect(headers()).toEqual([
        '#',
        'Name',
        'Rating',
        'Peak rating',
        'City',
        'Chess.com username',
        'Lichess username',
      ]);
    });

    it('should number the rows on from the page before', () => {
      expect(bodyRows().map(row => cellTexts(row)[0])).toEqual([
        '11',
        '12',
        '13',
        '14',
        '15',
      ]);
    });

    it('should show each member as recorded', () => {
      expect(cellTexts(bodyRows()[2])).toEqual([
        '13',
        'Billy McChesserton',
        '900/5',
        '900/5',
        'London',
        '',
        '',
      ]);
    });

    it('should link a member with a profile to it, by name and by row', () => {
      const [withProfile, withoutProfile] = bodyRows();

      expect(query(withProfile, 'a.members__profile-link').attributes['href']).toBe(
        '/members/0',
      );
      expect(query(withProfile, 'a.ea-data-table__row-link').attributes['href']).toBe(
        '/members/0',
      );
      expect(query(withoutProfile, 'a.members__profile-link')).toBeFalsy();
      expect(query(withoutProfile, 'a.ea-data-table__row-link')).toBeFalsy();
    });

    it('should open a profile when its row is activated', () => {
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      bodyRows()[0].triggerEventHandler('click');
      bodyRows()[1].triggerEventHandler('click');

      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(['/members', 0]);
    });

    it('should mark inactive members', () => {
      const inactive = queryAll(
        fixture.debugElement,
        '.ea-data-table__body .members__name--inactive',
      );

      expect(inactive.map(textOf)).toEqual(['Ding Liren', 'Judit Polgar']);
    });

    it('should mark the city champion', () => {
      render({
        members: [{ ...MOCK_MEMBERS[0], ...CITY_CHAMPION }],
      });

      expect(query(bodyRows()[0], '.members__champion-link')).toBeTruthy();
    });

    it('should highlight what was searched for', () => {
      render({ options: { ...options, search: 'lon' } });

      expect(queryAll(bodyRows()[3], 'mark.lcc-search-highlight').map(textOf)).toEqual([
        'Lon',
      ]);
    });

    it('should size the columns by the widest members it is given', () => {
      fixture.componentRef.setInput('widestMembers', [MOCK_MEMBERS[1]]);
      fixture.detectChanges();

      const sizingRows: MemberRow[] = query(
        fixture.debugElement,
        'ea-data-table',
      ).componentInstance.sizingRows();

      expect(sizingRows.map(row => row.member)).toEqual([MOCK_MEMBERS[1]]);
    });
  });

  describe('for admins', () => {
    beforeEach(() => render({ isAdmin: true }));

    it('should show every detail', () => {
      expect(headers()).toEqual([
        '#',
        'First name',
        'Last name',
        'Rating',
        'Peak rating',
        'City',
        'Chess.com username',
        'Lichess username',
        'Last updated',
        'Born',
        'Email',
        'Phone number',
        'Date joined',
      ]);
      expect(cellTexts(bodyRows()[0]).slice(1, 4)).toEqual(['Magnus', 'Carlsen', '2850']);
      expect(cellTexts(bodyRows()[0]).slice(9)).toEqual([
        '1990',
        'magnus.carlsen@example.com',
        '555-123-4567',
        'Thu, May 10, 2018',
      ]);
    });

    it('should not make the rows links, as they hold the controls', () => {
      expect(query(fixture.debugElement, 'a.ea-data-table__row-link')).toBeFalsy();
      expect(query(bodyRows()[0], 'a.members__profile-link')).toBeTruthy();
    });

    it('should offer the controls of a member on a right click on their row', () => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });

      query(bodyRows()[0], '.members__name').nativeElement.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(openSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          editPath: ['member', 'edit', members[0].id],
          itemName: `${members[0].firstName} ${members[0].lastName}`,
        }),
        bodyRows()[0].nativeElement,
        undefined,
        'center',
      );
    });

    it('should delete a member from the confirmation dialog', async () => {
      const member = members[0];

      controlsOf(bodyRows()[0]).deleteCb();
      await fixture.whenStable();
      await lastOpenedDialog(dialogOpenSpy).confirmAction?.();

      expect(dialogOpenSpy).toHaveBeenCalledWith({
        componentType: BasicDialogComponent,
        inputs: {
          dialog: expect.objectContaining({
            title: 'Confirm',
            body: `Delete ${member.firstName} ${member.lastName}?`,
            confirmButtonText: 'Delete',
            confirmButtonType: 'warning',
          }),
        },
        isModal: true,
      });
      expect(storeRequestSpy).toHaveBeenCalledWith(
        MembersActions.deleteMemberRequested({ member }),
        [MembersActions.deleteMemberSucceeded, MembersActions.deleteMemberFailed],
      );
    });

    it('should not delete anything until the dialog is confirmed', async () => {
      dialogOpenSpy.mockResolvedValue('cancel');

      controlsOf(bodyRows()[0]).deleteCb();
      await fixture.whenStable();

      expect(storeRequestSpy).not.toHaveBeenCalled();
    });

    it('should show the public columns in safe mode, with a notice', () => {
      render({ isAdmin: true, isSafeMode: true });

      expect(headers()).toHaveLength(7);
      expect(query(fixture.debugElement, 'lcc-safe-mode-notice')).toBeTruthy();
    });
  });

  describe('sorting', () => {
    beforeEach(() => render());

    it('should sort a new column ascending, and ratings descending', () => {
      component.onSorted({ column: 'city', direction: 'asc' });
      component.onSorted({ column: 'rating', direction: 'asc' });

      expect(optionsChangeSpy).toHaveBeenNthCalledWith(1, {
        ...options,
        sortBy: 'city',
        sortOrder: 'asc',
        page: 1,
      });
      expect(optionsChangeSpy).toHaveBeenNthCalledWith(2, {
        ...options,
        sortBy: 'rating',
        sortOrder: 'desc',
        page: 1,
      });
    });

    it('should turn the sorted column around when it is sorted again', () => {
      component.onSorted({ column: 'lastName', direction: 'desc' });

      expect(optionsChangeSpy).toHaveBeenCalledWith({
        ...options,
        sortBy: 'lastName',
        sortOrder: 'desc',
        page: 1,
      });
    });

    it('should show the order the members are in', () => {
      const table = query(fixture.debugElement, 'ea-data-table');

      expect(table.componentInstance.sort()).toEqual({
        column: 'lastName',
        direction: 'asc',
      });
    });
  });

  describe('paging', () => {
    beforeEach(() => render());

    it('should offer the page sizes and turn the pages', () => {
      const paginator = query(fixture.debugElement, 'ea-paginator');

      paginator.triggerEventHandler('changed', { page: 3, pageSize: 50 });

      expect(paginator.componentInstance.pageSizeOptions()).toEqual(MEMBERS_PAGE_SIZES);
      expect(paginator.componentInstance.totalItems()).toBe(50);
      expect(optionsChangeSpy).toHaveBeenCalledWith({
        ...options,
        page: 3,
        pageSize: 50,
      });
    });
  });

  describe('while the members load', () => {
    it('should hold a skeleton row for each member of the page', () => {
      render({ members: [], isLoading: true });

      expect(bodyRows()).toHaveLength(10);
      expect(queryAll(bodyRows()[0], 'lcc-text-skeleton')).toHaveLength(7);
    });

    it('should show placeholders in place of the members already loaded', () => {
      render({ isLoading: true });

      expect(bodyRows()).toHaveLength(10);
      expect(query(fixture.debugElement, '.ea-data-table__body a')).toBeFalsy();
    });

    it('should say when no member matches, once the members have loaded', () => {
      render({ members: [], filteredCount: 0 });

      expect(query(fixture.debugElement, 'ea-data-table')).toBeFalsy();
      expect(
        query(fixture.debugElement, 'ea-empty-state').nativeElement.textContent,
      ).toContain('No members match these filters.');
    });
  });
});
