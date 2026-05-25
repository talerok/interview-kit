import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon';
import { FmtDatePipe } from '../../../../shared/pipes';
import { asId, initialsOf } from '../../../../shared/utils';
import { ResultActions } from '../../models/state/result.actions';
import { ResultStore } from '../../models/state/result.store';
import { AnswersListComponent } from './components/answers-list/answers-list.component';
import { ScoreHeroComponent } from './components/score-hero/score-hero.component';
import { ScoreProfileComponent } from './components/score-profile/score-profile.component';

@Component({
  selector: 'app-interview-result',
  imports: [
    RouterLink,
    IconComponent,
    FmtDatePipe,
    ScoreHeroComponent,
    ScoreProfileComponent,
    AnswersListComponent,
  ],
  templateUrl: './interview-result.component.html',
  styleUrl: './interview-result.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ResultStore, ResultActions],
})
export class InterviewResultComponent implements OnInit {
  readonly id = input.required<string>();

  protected readonly _store = inject(ResultStore);
  protected readonly _actions = inject(ResultActions);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _notFound = computed(
    () => this._store.isLoaded() && this._store.interview() === null,
  );

  protected readonly _initials = computed(() =>
    initialsOf(this._store.interview()?.candidate.name ?? ''),
  );

  ngOnInit(): void {
    const id = asId<'InterviewId'>(this.id());
    this._actions.load(id).pipe(takeUntilDestroyed(this._destroyRef)).subscribe();
  }
}
