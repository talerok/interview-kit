import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { IconComponent } from '../../../../../../../../shared/ui/icon';
import { Category, Question, QuestionId } from '../../../../../../interfaces/template';

const CLAMP_CHAR_THRESHOLD = 240;
const CLAMP_LINE_THRESHOLD = 4;

@Component({
  selector: 'app-question-row',
  imports: [IconComponent],
  templateUrl: './question-row.component.html',
  styleUrl: './question-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionRowComponent {
  readonly question = input.required<Question>();
  readonly category = input<Category | null>(null);
  readonly index = input<number>(0);

  readonly edit = output<QuestionId>();
  readonly remove = output<QuestionId>();

  protected readonly _expanded = signal(false);
  protected readonly _isLong = computed(() => {
    const text = this.question().text;
    return text.length > CLAMP_CHAR_THRESHOLD || text.split('\n').length > CLAMP_LINE_THRESHOLD;
  });

  protected _onEdit(): void {
    this.edit.emit(this.question().id);
  }

  protected _onDelete(event: Event): void {
    event.stopPropagation();
    this.remove.emit(this.question().id);
  }

  protected _onToggle(event: Event): void {
    event.stopPropagation();
    this._expanded.update((v) => !v);
  }
}
