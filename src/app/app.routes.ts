import { Routes } from '@angular/router';
import { AppShellComponent } from './features/layout/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: 'oauth/:kind',
    loadComponent: () =>
      import('./features/cloud-settings/components/oauth-callback/oauth-callback.component').then(
        (m) => m.OAuthCallbackComponent,
      ),
  },
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'templates' },
      {
        path: 'templates',
        loadChildren: () =>
          import('./features/templates/template.routes').then((m) => m.TEMPLATE_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('./features/interview/interview.routes').then((m) => m.INTERVIEW_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('./features/history/history.routes').then((m) => m.HISTORY_ROUTES),
      },
      // TODO: settings
    ],
  },
  { path: '**', redirectTo: '' },
];
