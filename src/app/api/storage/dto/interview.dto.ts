export type InterviewStatus = 'in-progress' | 'completed' | 'cancelled';

export interface InterviewDto {
  readonly id: string;
  readonly templateId: string;
  readonly status: InterviewStatus;
  readonly candidateName: string;
  readonly candidatePosition: string;
  readonly candidateDate: string;
  readonly durationMin: number;
  readonly notes: string;
  readonly rev: number;
  readonly answersCount: number;
  readonly answeredCount: number;
  readonly skippedCount: number;
  readonly avg: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
