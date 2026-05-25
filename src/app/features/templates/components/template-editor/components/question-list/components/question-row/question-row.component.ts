import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../../../../../../../shared/ui/icon';
import { Category, Question, QuestionId } from '../../../../../../interfaces/template';

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

  protected _onEdit(): void {
    this.edit.emit(this.question().id);
  }

  protected _onDelete(event: Event): void {
    event.stopPropagation();
    this.remove.emit(this.question().id);
  }
}
