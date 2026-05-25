import { describe, expect, it } from 'vitest';
import { AnswerDto, InterviewDto } from '../../../../api/storage';
import {
  toAnswer,
  toAnswerDto,
  toInterview,
  toInterviewDto,
} from './interview.mapper';

const INTERVIEW_DTO: InterviewDto = {
  id: 'iv1',
  templateId: 't1',
  status: 'completed',
  candidateName: 'Анна Иванова',
  candidatePosition: 'Senior Backend',
  candidateDate: '2026-05-20',
  durationMin: 45,
  notes: '',
  rev: 7,
  answersCount: 10,
  answeredCount: 8,
  skippedCount: 2,
  avg: 4.125,
  createdAt: '2026-05-20T10:00:00.000Z',
  updatedAt: '2026-05-20T10:45:00.000Z',
};

const ANSWER_DTO: AnswerDto = {
  id: 'a1',
  interviewId: 'iv1',
  questionId: 'q1',
  categoryId: 'c1',
  questionText: 'Сложность quicksort',
  questionWeight: 2,
  score: 4,
  comment: 'Раскрыл хорошо',
  skipped: false,
  order: 0,
};

describe('interview.mapper', () => {
  describe('Interview', () => {
    it('round-trips Interview ↔ InterviewDto', () => {
      const domain = toInterview(INTERVIEW_DTO);
      expect(toInterviewDto(domain)).toEqual(INTERVIEW_DTO);
    });

    it('groups candidate fields into a single object', () => {
      const domain = toInterview(INTERVIEW_DTO);
      expect(domain.candidate).toEqual({
        name: 'Анна Иванова',
        position: 'Senior Backend',
        date: '2026-05-20',
      });
    });

    it('defaults missing aggregate stats to 0', () => {
      const partial: InterviewDto = {
        ...INTERVIEW_DTO,
        answersCount: undefined as unknown as number,
        answeredCount: undefined as unknown as number,
        skippedCount: undefined as unknown as number,
        avg: undefined as unknown as number,
      };
      const domain = toInterview(partial);
      expect(domain.answersCount).toBe(0);
      expect(domain.answeredCount).toBe(0);
      expect(domain.skippedCount).toBe(0);
      expect(domain.avg).toBe(0);
    });
  });

  describe('Answer', () => {
    it('round-trips Answer ↔ AnswerDto', () => {
      const domain = toAnswer(ANSWER_DTO);
      expect(toAnswerDto(domain)).toEqual(ANSWER_DTO);
    });

    it('preserves null categoryId for uncategorized questions', () => {
      const dto: AnswerDto = { ...ANSWER_DTO, categoryId: null };
      const domain = toAnswer(dto);
      expect(domain.categoryId).toBeNull();
      expect(toAnswerDto(domain).categoryId).toBeNull();
    });

    it('preserves null score for unanswered/skipped questions', () => {
      const dto: AnswerDto = { ...ANSWER_DTO, score: null, skipped: true };
      const domain = toAnswer(dto);
      expect(domain.score).toBeNull();
      expect(domain.skipped).toBe(true);
    });
  });
});
