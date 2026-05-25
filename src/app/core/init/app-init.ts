import { inject, provideAppInitializer } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDb } from '../../api/storage';

export const provideAppInit = () =>
  provideAppInitializer(() => {
    const db = inject(AppDb);
    return firstValueFrom(db.init());
  });
