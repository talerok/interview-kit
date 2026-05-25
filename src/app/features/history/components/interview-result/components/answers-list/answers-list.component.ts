import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../../../../../../shared/ui/icon';
import { Category, CategoryId } from '../../../../../templates/interfaces/template';
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

  private readonly _categoriesMap = computed<Map<CategoryId, Category>>(() => {
    const map = new Map<CategoryId, Category>();
    for (const c of this.categories()) map.set(c.id, c);
    return map;
  });

  protected readonly _rows = computed<readonly AnswerRow[]>(() => {
    const map = this._categoriesMap();
    return this.answers().map((answer, index) => ({
      answer,
      category: answer.categoryId === null ? null : map.get(answer.categoryId) ?? null,
      index,
    }));
  });
}
