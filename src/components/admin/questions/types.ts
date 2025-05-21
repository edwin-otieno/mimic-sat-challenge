// Define the question option interface
export interface QuestionOption {
  id?: string;
  text: string;
  is_correct: boolean;
}

// Define the question type enum
export enum QuestionType {
  MultipleChoice = "multiple_choice",
  TextInput = "text_input"
}

// Define the question interface
export interface Question {
  id?: string;
  test_id: string;
  text: string;
  explanation?: string;
  options?: QuestionOption[]; // Make options optional
  module_id?: string; // ID of the module this question belongs to
  module_type: "reading_writing" | "math"; // Type of module
  question_type: QuestionType; // Type of question (multiple choice or text input)
  image_url?: string; // URL for an optional image
  correct_answer?: string; // For text input questions
  created_at?: string;
  question_order: number;
}
