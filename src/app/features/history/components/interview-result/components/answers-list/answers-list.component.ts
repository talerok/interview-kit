import { ChangeDetectionStrategy, Component, Signal, computed, input } from '@angular/core';
import { IconComponent } from '../../../../../../shared/ui/icon';
import { Category } from '../../../../../templates/interfaces/template';
import { Answer } from '../../../../../interview/interfaces/interview';

interface AnswerRow {
  readonly answer: Answer;
  readonly category: Category | null;
  readonly index: number;
}

@Component({
  selector: 'app-answers-list',
  imports: [IconComponent],
  templateUrl: './answers-list.component.html',
  styleUrl: './answers-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswersListComponent {
  readonly answers = input.required<readonly Answer[]>();
  readonly categories = input.required<readonly Category[]>();

  private readonly _categoryById: Signal<Readonly<Record<string, Category>>> = computed(() =>
    indexCategories(this.categories()),
  );

  protected readonly _rows: Signal<readonly AnswerRow[]> = computed(() =>
    this._buildRows(),
  );

  private _buildRows(): readonly AnswerRow[] {
    const byId = this._categoryById();
    return this.answers().map((answer, index) => ({
      answer,
      category: answer.categoryId === null ? null : (byId[answer.categoryId] ?? null),
      index,
    }));
  }
}

const indexCategories = (
  categories: readonly Category[],
): Readonly<Record<string, Category>> => {
  const out: Record<string, Category> = {};
  for (const c of categories) out[c.id] = c;
  return out;
};
