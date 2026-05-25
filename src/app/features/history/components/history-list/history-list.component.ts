import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon';
import { FmtDatePipe, PluralRuPipe } from '../../../../shared/pipes';
import { initialsOf, scoreBand } from '../../../../shared/utils';
import { Interview, InterviewId } from '../../../interview/interfaces/interview';
import { InterviewsActions } from '../../../interview/models/state/interviews.actions';
import { InterviewsStore } from '../../../interview/models/state/interviews.store';
import { Template, TemplateId } from '../../../templates/interfaces/template';
import { TemplatesActions } from '../../../templates/models/state/templates.actions';
import { TemplatesStore } from '../../../templates/models/state/templates.store';

interface HistoryRow {
  readonly interview: Interview;
  readonly template: Template | null;
  readonly band: 'lo' | 'mid' | 'hi';
  readonly initials: string;
}

const PAGE_SIZE = 10;

@Component({
  selector: 'app-history-list',
  imports: [IconComponent, FmtDatePipe, PluralRuPipe],
  templateUrl: './history-list.component.html',
  styleUrl: './history-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryListComponent implements OnInit {
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);
  protected readonly _interviews = inject(InterviewsStore);
  private readonly _interviewsActions = inject(InterviewsActions);
  protected readonly _templates = inject(TemplatesStore);
  private readonly _templatesActions = inject(TemplatesActions);

  protected readonly _interviewForms = ['интервью', 'интервью', 'интервью'] as const;
  protected readonly _answerForms = ['ответ', 'ответа', 'ответов'] as const;

  protected readonly _query = signal('');
  protected readonly _page = signal(0);

  private readonly _allRows = computed<readonly HistoryRow[]>(() => {
    const templatesMap = new Map<TemplateId, Template>();
    for (const t of this._templates.value()) templatesMap.set(t.id, t);

    return this._interviews
      .completed()
      .slice()
      .sort((a, b) => (a.candidate.date < b.candidate.date ? 1 : -1))
      .map<HistoryRow>((interview) => ({
        interview,
        template: templatesMap.get(interview.templateId) ?? null,
        band: scoreBand(interview.avg),
        initials: initialsOf(interview.candidate.name),
      }));
  });

  protected readonly _filteredRows = computed<readonly HistoryRow[]>(() => {
    const q = this._query().trim().toLowerCase();
    if (q.length === 0) {
      return this._allRows();
    }
    return this._allRows().filter(({ interview }) => {
      const haystack = `${interview.candidate.name} ${interview.candidate.position}`.toLowerCase();
      return haystack.includes(q);
    });
  });

  protected readonly _pageCount = computed(() =>
    Math.max(1, Math.ceil(this._filteredRows().length / PAGE_SIZE)),
  );

  protected readonly _currentPage = computed(() =>
    Math.min(this._page(), this._pageCount() - 1),
  );

  protected readonly _pagedRows = computed<readonly HistoryRow[]>(() => {
    const start = this._currentPage() * PAGE_SIZE;
    return this._filteredRows().slice(start, start + PAGE_SIZE);
  });

  protected readonly _hasResults = computed(() => this._filteredRows().length > 0);
  protected readonly _showPagination = computed(() => this._pageCount() > 1);

  protected readonly _avgTotal = computed(() => {
    const list = this._interviews.completed();
    if (list.length === 0) return 0;
    return list.reduce((s, i) => s + i.avg, 0) / list.length;
  });

  protected readonly _totalAnswers = computed(() =>
    this._interviews.completed().reduce((s, i) => s + i.answersCount, 0),
  );

  ngOnInit(): void {
    if (this._interviews.isEmpty()) {
      this._interviewsActions
        .load()
        .pipe(takeUntilDestroyed(this._destroyRef))
        .subscribe();
    }
    if (this._templates.isEmpty()) {
      this._templatesActions
        .load()
        .pipe(takeUntilDestroyed(this._destroyRef))
        .subscribe();
    }
  }

  protected _onQueryInput(event: Event): void {
    this._query.set((event.target as HTMLInputElement).value);
    this._page.set(0);
  }

  protected _clearQuery(): void {
    this._query.set('');
    this._page.set(0);
  }

  protected _prevPage(): void {
    this._page.set(Math.max(0, this._currentPage() - 1));
  }

  protected _nextPage(): void {
    this._page.set(Math.min(this._pageCount() - 1, this._currentPage() + 1));
  }

  protected _open(id: InterviewId): void {
    void this._router.navigate(['/results', id]);
  }

  protected _delete(id: InterviewId, event: Event): void {
    event.stopPropagation();
    if (!confirm('Удалить интервью? Это не восстановишь.')) return;
    this._interviewsActions.delete(id).pipe(takeUntilDestroyed(this._destroyRef)).subscribe();
  }

}
