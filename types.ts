
export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Quiz {
  id: string;
  title: string;
  content: string;
  questions: Question[];
  createdAt: number;
  timeLimitMinutes?: number;
}

export interface QuizResult {
  id: string;
  quizId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  timestamp: number;
}

export enum AppMode {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  HOME = 'HOME'
}
