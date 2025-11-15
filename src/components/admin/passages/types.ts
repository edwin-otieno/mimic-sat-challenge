import { QuestionType } from '../questions/types';

// Define the passage interface
export interface Passage {
  id: string;
  test_id: string;
  module_type: 'reading' | 'science' | 'english';
  title?: string;
  content: string;
  passage_order: number;
  created_at?: string;
  updated_at?: string;
  questions?: PassageQuestion[];
}

// Define the passage question interface (extends the base Question)
export interface PassageQuestion {
  id: string;
  test_id: string;
  passage_id: string;
  question_number: number;
  text: string;
  options?: PassageQuestionOption[];
  explanation?: string;
  imageUrl?: string;
  module_type: 'reading' | 'science' | 'english';
  question_type: QuestionType;
  correct_answer?: string;
  question_order?: number;
  sentence_references?: Array<number | { sentenceIndex: number; start: number; end: number }>; // Array of sentence indices (0-based) or character ranges within sentences
}

// Define the passage question option interface
export interface PassageQuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
}

// Define the passage form values for admin interface
export interface PassageFormValues {
  id?: string;
  test_id: string;
  module_type: 'reading' | 'science' | 'english';
  title?: string;
  content: string;
  passage_order: number;
  questions: PassageQuestionFormValues[];
}

// Define the passage question form values
export interface PassageQuestionFormValues {
  id?: string;
  text: string;
  question_number: number;
  options?: PassageQuestionOption[];
  explanation?: string;
  imageUrl?: string;
  question_type: QuestionType;
  correct_answer?: string;
  sentence_references?: Array<number | { sentenceIndex: number; start: number; end: number }>; // Array of sentence indices (0-based) or character ranges within sentences
}

// Define the passage creation/update payload
export interface PassagePayload {
  id?: string;
  test_id: string;
  module_type: 'reading' | 'science' | 'english';
  title?: string;
  content: string;
  passage_order: number;
  questions: PassageQuestionPayload[];
}

// Define the passage question payload
export interface PassageQuestionPayload {
  id?: string;
  text: string;
  question_number: number;
  options?: PassageQuestionOption[];
  explanation?: string;
  image_url?: string;
  question_type: QuestionType;
  correct_answer?: string;
  sentence_references?: Array<number | { sentenceIndex: number; start: number; end: number }>; // Array of sentence indices (0-based) or character ranges within sentences
}

// Define the passage display interface for student interface
export interface PassageDisplay {
  passage: Passage;
  currentQuestionIndex: number;
  totalQuestions: number;
  userAnswers: Record<string, string>;
  flaggedQuestions: Set<string>;
  crossedOutOptions: Record<string, string[]>;
}
