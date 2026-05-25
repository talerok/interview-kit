import { Routes } from '@angular/router';

export const INTERVIEW_ROUTES: Routes = [
  {
    path: 'new',
    loadComponent: () =>
      import('./components/new-interview/new-interview.component').then(
        (m) => m.NewInterviewComponent,
      ),
  },
  {
    path: 'run/:id',
    loadComponent: () =>
      import('./components/interview-runner/interview-runner.component').then(
        (m) => m.InterviewRunnerComponent,
      ),
  },
];
