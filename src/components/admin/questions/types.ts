
// Define the question option interface
export interface QuestionOption {
  id?: string;
  text: string;
  is_correct: boolean;
}

// Define the question interface
export interface Question {
  id?: string;
  test_id: string;
  text: string;
  explanation?: string;
  options: QuestionOption[];
}
