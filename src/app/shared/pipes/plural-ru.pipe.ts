import { Pipe, PipeTransform } from '@angular/core';
import { RuPluralForms, pluralRu } from '../utils';

@Pipe({ name: 'pluralRu', pure: true })
export class PluralRuPipe implements PipeTransform {
  transform(value: number, forms: RuPluralForms): string {
    return pluralRu(value, forms);
  }
}
