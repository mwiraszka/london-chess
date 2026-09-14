import {
  ChevronLeftIconComponent,
  ChevronRightIconComponent,
  ChevronsLeftIconComponent,
  ChevronsRightIconComponent,
} from '@eagami/ui';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isEqual } from 'lodash';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { CommonModule, KeyValue } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';

import { TooltipDirective } from '@app/directives/tooltip.directive';
import { DataPaginationOptions, Entity, EntityType, Filter } from '@app/models';

@UntilDestroy()
@Component({
  selector: 'lcc-data-toolbar',
  templateUrl: './data-toolbar.component.html',
  styleUrls: ['./data-toolbar.component.scss'],
  imports: [
    ChevronLeftIconComponent,
    ChevronRightIconComponent,
    ChevronsLeftIconComponent,
    ChevronsRightIconComponent,
    CommonModule,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataToolbarComponent<T = EntityType> implements OnInit {
  public readonly STANDARD_PAGE_SIZES: number[] = [10, 20, 50, 100];

  private readonly searchQuerySubject = new Subject<DataPaginationOptions<T>>();

  @Input({ required: true }) public entity!: Entity;
  @Input({ required: true }) public filteredCount!: number | null;
  @Input({ required: true }) public options!: DataPaginationOptions<T>;

  @Input() public searchPlaceholder: string = 'Search';

  @Output() public readonly optionsChange = new EventEmitter<DataPaginationOptions<T>>();
  @Output() public readonly optionsChangeNoFetch = new EventEmitter<
    DataPaginationOptions<T>
  >();

  public isSearchFocused = false;

  public get lastPage(): number {
    return !this.filteredCount || this.options.pageSize < 1
      ? 1
      : Math.ceil(this.filteredCount / this.options.pageSize);
  }

  public get allPageSizeTooltip(): string {
    if (this.filteredCount === 1) {
      return 'Show this one ' + this.entity + ' on a single page';
    }
    return 'Show all ' + this.filteredCount + ' ' + this.entity + 's on a single page';
  }

  public get paginationSummary(): string {
    if (this.filteredCount === null) {
      return 'Loading...';
    }

    if (this.filteredCount === 0) {
      return 'No matches 😢';
    }

    const rangeStart = this.options.pageSize * (this.options.page - 1) + 1;
    const rangeEnd =
      this.options.pageSize === -1
        ? this.filteredCount
        : Math.min(this.options.pageSize * this.options.page, this.filteredCount);
    const range = `${rangeStart}\u00A0\u2013\u00A0${rangeEnd}`;
    const entityName = this.filteredCount === 1 ? this.entity : this.entity + 's';

    return `Showing ${range}\u00A0\u00A0/\u00A0\u00A0${this.filteredCount} ${entityName}`;
  }

  public ngOnInit(): void {
    // Debounce to avoid emitting on every keystroke
    this.searchQuerySubject
      .pipe(untilDestroyed(this), debounceTime(300), distinctUntilChanged(isEqual))
      .subscribe(options => this.optionsChange.emit(options));
  }

  public onPageSizeChange(pageSize: number): void {
    if (pageSize === this.options.pageSize) {
      return;
    }

    // Prevent unnecessary fetch when all data is guaranteed to already be available
    if (this.options.page === 1 && pageSize < this.options.pageSize && pageSize !== -1) {
      this.optionsChangeNoFetch.emit({ ...this.options, pageSize });
      return;
    }

    this.optionsChange.emit({ ...this.options, pageSize, page: 1 });
  }

  public onFirstPage(): void {
    this.optionsChange.emit({ ...this.options, page: 1 });
  }

  public onPreviousPage(): void {
    this.optionsChange.emit({ ...this.options, page: this.options.page - 1 });
  }

  public onNextPage(): void {
    this.optionsChange.emit({ ...this.options, page: this.options.page + 1 });
  }

  public onLastPage(): void {
    this.optionsChange.emit({ ...this.options, page: this.lastPage });
  }

  public onSearchQueryChange(event: Event): void {
    const search = (event.target as HTMLInputElement).value;

    this.searchQuerySubject.next({ ...this.options, search, page: 1 });
  }

  public onToggleFilter(filter: KeyValue<string, Filter>): void {
    const filters = {
      ...this.options.filters,
      [filter.key]: { ...filter.value, value: !filter.value.value },
    };
    this.optionsChange.emit({ ...this.options, filters, page: 1 });
  }

  public originalOrder = () => 0;
}
