export interface TemplateDto {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly color: string;
  readonly rev: number;
  readonly categoryCount: number;
  readonly questionCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
