import { Routes } from '@angular/router';

export const HISTORY_ROUTES: Routes = [
  {
    path: 'history',
    loadComponent: () =>
      import('./components/history-list/history-list.component').then(
        (m) => m.HistoryListComponent,
      ),
  },
  {
    path: 'results/:id',
    loadComponent: () =>
      import('./components/interview-result/interview-result.component').then(
        (m) => m.InterviewResultComponent,
      ),
  },
];
