// Define the question option interface
export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
}

// Define the question type enum
export enum QuestionType {
  MultipleChoice = 'multiple_choice',
  TextInput = 'text_input'
}

// Define the question interface
export interface Question {
  id: string;
  test_id: string;
  question_order: number;
  text: string;
  options?: QuestionOption[];
  explanation?: string;
  imageUrl?: string;
  module_type?: 'reading_writing' | 'math';
  question_type: QuestionType;
  correct_answer?: string;
}
