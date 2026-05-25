import { Injectable, computed } from '@angular/core';
import { ListEntityStore } from '../../../../shared/state';
import { Interview } from '../../interfaces/interview';

@Injectable({ providedIn: 'root' })
export class InterviewsStore extends ListEntityStore<Interview> {
  readonly completed = computed(() =>
    this.value().filter((i) => i.status === 'completed'),
  );

  readonly completedCount = computed(() => this.completed().length);
}
