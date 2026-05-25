import { Pipe, PipeTransform } from '@angular/core';
import { fmtDate, fmtDateTime } from '../utils';

@Pipe({ name: 'fmtDate', pure: true })
export class FmtDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return fmtDate(value);
  }
}

@Pipe({ name: 'fmtDateTime', pure: true })
export class FmtDateTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return fmtDateTime(value);
  }
}
