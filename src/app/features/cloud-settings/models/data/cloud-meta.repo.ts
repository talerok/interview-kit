import { Injectable, inject } from '@angular/core';
import { Observable, defer } from 'rxjs';
import { AppDb, META_KEYS, MetaEntryDto, STORES } from '../../../../api/storage';
import { CloudState, initialCloud } from '../../interfaces/cloud';

@Injectable({ providedIn: 'root' })
export class CloudMetaRepo {
  private readonly _appDb = inject(AppDb);

  load(): Observable<CloudState> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(STORES.meta, 'readonly');
      const dto = await tx.objectStore<MetaEntryDto<CloudState>>(STORES.meta).get(META_KEYS.cloud);
      await tx.done;
      return dto?.value ?? initialCloud();
    });
  }

  save(state: CloudState): Observable<void> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(STORES.meta, 'readwrite');
      await tx.objectStore<MetaEntryDto<CloudState>>(STORES.meta).put({
        key: META_KEYS.cloud,
        value: state,
      });
      await tx.done;
    });
  }
}
