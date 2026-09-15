import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { query } from '@app/utils';

import { EnvironmentTagComponent } from './environment-tag.component';

describe('EnvironmentTagComponent', () => {
  let fixture: ComponentFixture<EnvironmentTagComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvironmentTagComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(EnvironmentTagComponent);
    httpMock = TestBed.inject(HttpTestingController);

    fixture.componentRef.setInput('branchName', 'v6.0.0');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should look up the open pull request for the branch', () => {
    fixture.componentRef.setInput('isPreview', false);

    fixture.detectChanges();

    const request = httpMock.expectOne(
      req => req.url === 'https://api.github.com/repos/mwiraszka/london-chess/pulls',
    );
    expect(request.request.params.get('state')).toBe('open');
    expect(request.request.params.get('head')).toBe('mwiraszka:v6.0.0');
    request.flush([]);
  });

  it('should link to the open pull request once it is found', async () => {
    fixture.componentRef.setInput('isPreview', true);
    fixture.detectChanges();

    httpMock.expectOne(() => true).flush([{ number: 359 }]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      query(fixture.debugElement, '.pull-request-link').nativeElement.getAttribute(
        'href',
      ),
    ).toBe('https://github.com/mwiraszka/london-chess/pull/359');
  });

  it('should show the branch without a link when it has no open pull request', async () => {
    fixture.componentRef.setInput('isPreview', false);
    fixture.detectChanges();

    httpMock.expectOne(() => true).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(query(fixture.debugElement, '.pull-request-link')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('v6.0.0');
  });

  it('should mark the preview site so it takes the preview colour', () => {
    fixture.componentRef.setInput('isPreview', true);

    fixture.detectChanges();

    expect(fixture.nativeElement.classList).toContain('preview');
    httpMock.expectOne(() => true).flush([]);
  });
});
