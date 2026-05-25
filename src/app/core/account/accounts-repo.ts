import { Injectable } from '@angular/core';
import { AccountsRegistry, initialRegistry } from './account';

const STORAGE_KEY = 'interviewkit:registry';

/**
 * Persists the accounts registry in localStorage. Sync access keeps the
 * registry available at app-init time without bootstrapping IDB first,
 * and the data here is meta about *which* DB to open — not user content.
 */
@Injectable({ providedIn: 'root' })
export class AccountsRepo {
  read(): AccountsRegistry {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return initialRegistry();
      const parsed = JSON.parse(raw) as AccountsRegistry;
      if (!parsed.accounts || parsed.accounts.length === 0) return initialRegistry();
      return parsed;
    } catch {
      return initialRegistry();
    }
  }

  write(registry: AccountsRegistry): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
  }
}
