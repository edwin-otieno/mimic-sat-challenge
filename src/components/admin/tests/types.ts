
// Define the test interface with scaled scoring
export interface Test {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
  scaled_scoring?: ScaledScore[];
}

// Define the scaled score interface
export interface ScaledScore {
  correct_answers: number;
  scaled_score: number;
}
