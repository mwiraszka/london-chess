import { Observable, defer } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PendingRequestsService {
  private readonly count = signal(0);

  readonly hasPendingRequests = computed(() => this.count() > 0);

  track<T>(request$: Observable<T>): Observable<T> {
    return defer(() => {
      this.count.update(count => count + 1);
      return request$.pipe(finalize(() => this.count.update(count => count - 1)));
    });
  }
}
