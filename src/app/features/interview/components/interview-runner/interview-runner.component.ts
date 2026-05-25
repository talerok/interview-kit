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
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon';
import { FmtDatePipe, PluralRuPipe } from '../../../../shared/pipes';
import { asId } from '../../../../shared/utils';
import { SCORES, SCORE_LABELS } from '../../constants/score-labels.const';
import { AnswerScore } from '../../interfaces/interview';
import { RunnerActions } from './models/state/runner.actions';
import { RunnerStore } from './models/state/runner.store';

@Component({
  selector: 'app-interview-runner',
  imports: [RouterLink, IconComponent, FmtDatePipe, PluralRuPipe],
  templateUrl: './interview-runner.component.html',
  styleUrl: './interview-runner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RunnerStore, RunnerActions],
})
export class InterviewRunnerComponent implements OnInit {
  readonly id = input.required<string>();

  protected readonly _store = inject(RunnerStore);
  protected readonly _actions = inject(RunnerActions);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _scores = SCORES;
  protected readonly _scoreLabels = SCORE_LABELS;
  protected readonly _answerForms = ['ответ', 'ответа', 'ответов'] as const;

  protected readonly _notFound = computed(
    () => this._store.isLoaded() && this._store.interview() === null,
  );

  ngOnInit(): void {
    const id = asId<'InterviewId'>(this.id());
    this._actions.load(id).pipe(takeUntilDestroyed(this._destroyRef)).subscribe();
  }

  protected _onScore(score: AnswerScore): void {
    const current = this._store.currentAnswer();
    if (current?.score === score) {
      this._actions.clearScore().pipe(takeUntilDestroyed(this._destroyRef)).subscribe();
      return;
    }
    this._actions.setScore(score).pipe(takeUntilDestroyed(this._destroyRef)).subscribe();
  }

  protected _onComment(event: Event): void {
    const comment = (event.target as HTMLTextAreaElement).value;
    this._actions.setComment(comment).pipe(takeUntilDestroyed(this._destroyRef)).subscribe();
  }

  protected _onNotes(event: Event): void {
    const notes = (event.target as HTMLTextAreaElement).value;
    this._actions.updateNotes(notes).pipe(takeUntilDestroyed(this._destroyRef)).subscribe();
  }

  protected _onSkip(): void {
    this._actions.skipCurrent().pipe(takeUntilDestroyed(this._destroyRef)).subscribe();
    if (this._store.canNext()) {
      this._actions.next();
    }
  }

  protected _onPrev(): void {
    this._actions.prev();
  }

  protected _onNext(): void {
    this._actions.next();
  }

  protected _jumpTo(idx: number): void {
    this._actions.goToIndex(idx);
  }

  protected _onCancel(): void {
    if (!confirm('Отменить интервью? Прогресс не будет сохранён как завершённый.')) {
      return;
    }
    this._actions
      .cancel()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(() => this._router.navigate(['/templates']));
  }

  protected _onFinish(): void {
    this._actions
      .finish()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((interview) => this._router.navigate(['/results', interview.id]));
  }
}
