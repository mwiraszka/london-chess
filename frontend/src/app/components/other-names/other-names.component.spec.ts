import { of, throwError } from 'rxjs';

import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembersApiService } from '@app/services';
import { query, queryAll } from '@app/utils';

import { OtherNamesComponent } from './other-names.component';

describe('OtherNamesComponent', () => {
  let fixture: ComponentFixture<OtherNamesComponent>;
  let component: OtherNamesComponent;
  let membersApi: {
    getOtherNames: Mock;
    updateOtherNames: Mock;
  };

  const tagTexts = (): string[] =>
    queryAll(fixture.debugElement, 'ea-tag').map(tag =>
      tag.nativeElement.textContent.trim(),
    );

  beforeEach(async () => {
    membersApi = {
      getOtherNames: vi.fn().mockReturnValue(of({ data: ['Dunford, Jack'] })),
      updateOtherNames: vi.fn((_id: string, names: string[]) => of({ data: names })),
    };

    await TestBed.configureTestingModule({
      imports: [OtherNamesComponent],
      providers: [{ provide: MembersApiService, useValue: membersApi }],
    }).compileComponents();

    fixture = TestBed.createComponent(OtherNamesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('memberId', 'member-k');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it("should list the member's other names", () => {
    expect(membersApi.getOtherNames).toHaveBeenCalledWith('member-k');
    expect(tagTexts()).toEqual(['Dunford, Jack']);
  });

  it('should add a name and save the list', async () => {
    // @ts-expect-error Protected class member
    component.newName.setValue('Dunford, K.');

    await component.onAdd();
    fixture.detectChanges();

    expect(membersApi.updateOtherNames).toHaveBeenCalledWith('member-k', [
      'Dunford, Jack',
      'Dunford, K.',
    ]);
    expect(tagTexts()).toEqual(['Dunford, Jack', 'Dunford, K.']);
  });

  it('should save nothing without a name to add', async () => {
    await component.onAdd();

    expect(membersApi.updateOtherNames).not.toHaveBeenCalled();
  });

  it('should remove a name', async () => {
    query(fixture.debugElement, 'ea-tag').triggerEventHandler('removed');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(membersApi.updateOtherNames).toHaveBeenCalledWith('member-k', []);
    expect(tagTexts()).toEqual([]);
  });

  it('should show why a name could not be given', async () => {
    membersApi.updateOtherNames.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Stone, Sam is already recorded for another member.' },
          }),
      ),
    );
    // @ts-expect-error Protected class member
    component.newName.setValue('Stone, Sam');

    await component.onAdd();
    fixture.detectChanges();

    expect(query(fixture.debugElement, 'ea-alert').nativeElement.textContent).toContain(
      'Stone, Sam is already recorded for another member.',
    );
    expect(tagTexts()).toEqual(['Dunford, Jack']);
  });
});
