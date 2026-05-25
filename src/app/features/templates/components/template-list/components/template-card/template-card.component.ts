import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../../../../../shared/ui/icon';
import { PluralRuPipe } from '../../../../../../shared/pipes';
import { Template, TemplateId } from '../../../../interfaces/template';

@Component({
  selector: 'app-template-card',
  imports: [IconComponent, PluralRuPipe],
  templateUrl: './template-card.component.html',
  styleUrl: './template-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateCardComponent {
  readonly template = input.required<Template>();
  readonly questionCount = input<number>(0);
  readonly categoryCount = input<number>(0);

  readonly open = output<TemplateId>();
  readonly remove = output<TemplateId>();

  protected readonly _questionForms = ['вопрос', 'вопроса', 'вопросов'] as const;
  protected readonly _categoryForms = ['категория', 'категории', 'категорий'] as const;

  protected _activate(): void {
    this.open.emit(this.template().id);
  }

  protected _delete(event: Event): void {
    event.stopPropagation();
    this.remove.emit(this.template().id);
  }
}
