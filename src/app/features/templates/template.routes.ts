import { Routes } from '@angular/router';

export const TEMPLATE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/template-list/template-list.component').then(
        (m) => m.TemplateListComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./components/template-editor/template-editor.component').then(
        (m) => m.TemplateEditorComponent,
      ),
  },
];
