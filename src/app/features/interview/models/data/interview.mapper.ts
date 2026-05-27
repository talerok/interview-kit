import { AnswerDto, InterviewDto } from '../../../../api/storage';
import { asId } from '../../../../shared/utils';
import { Answer, Interview } from '../../interfaces/interview';

export const toInterview = (dto: InterviewDto): Interview => ({
  id: asId<'InterviewId'>(dto.id),
  templateId: asId<'TemplateId'>(dto.templateId),
  status: dto.status,
  candidate: {
    name: dto.candidateName,
    position: dto.candidatePosition,
    date: dto.candidateDate,
  },
  durationMin: dto.durationMin,
  notes: dto.notes,
  rev: dto.rev,
  answersCount: dto.answersCount ?? 0,
  answeredCount: dto.answeredCount ?? 0,
  skippedCount: dto.skippedCount ?? 0,
  avg: dto.avg ?? 0,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
});

export const toInterviewDto = (model: Interview): InterviewDto => ({
  id: model.id,
  templateId: model.templateId,
  status: model.status,
  candidateName: model.candidate.name,
  candidatePosition: model.candidate.position,
  candidateDate: model.candidate.date,
  durationMin: model.durationMin,
  notes: model.notes,
  rev: model.rev,
  answersCount: model.answersCount,
  answeredCount: model.answeredCount,
  skippedCount: model.skippedCount,
  avg: model.avg,
  createdAt: model.createdAt,
  updatedAt: model.updatedAt,
});

export const toAnswer = (dto: AnswerDto): Answer => ({
  id: asId<'AnswerId'>(dto.id),
  interviewId: asId<'InterviewId'>(dto.interviewId),
  questionId: asId<'QuestionId'>(dto.questionId),
  categoryId: dto.categoryId === null ? null : asId<'CategoryId'>(dto.categoryId),
  questionText: dto.questionText,
  questionWeight: dto.questionWeight,
  questionCriteria: dto.questionCriteria ?? '',
  score: dto.score,
  comment: dto.comment,
  skipped: dto.skipped,
  order: dto.order,
});

export const toAnswerDto = (model: Answer): AnswerDto => ({
  id: model.id,
  interviewId: model.interviewId,
  questionId: model.questionId,
  categoryId: model.categoryId,
  questionText: model.questionText,
  questionWeight: model.questionWeight,
  questionCriteria: model.questionCriteria,
  score: model.score,
  comment: model.comment,
  skipped: model.skipped,
  order: model.order,
});
