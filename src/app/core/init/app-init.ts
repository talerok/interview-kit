import { inject, provideAppInitializer } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDb } from '../../api/storage';
import { AccountsRepo, dbNameFor } from '../account';

export const provideAppInit = () =>
  provideAppInitializer(() => {
    const db = inject(AppDb);
    const accounts = inject(AccountsRepo);
    const registry = accounts.read();
    return firstValueFrom(db.open(dbNameFor(registry.activeId)));
  });
