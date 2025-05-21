// Define the test interface with scaled scoring
export interface Test {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  scaled_scoring?: ScaledScore[];
  modules?: TestModule[];
  permalink?: string;
}

// Define the scaled score interface
export interface ScaledScore {
  module_id: string;
  module_type?: string;
  correct_answers: number;
  scaled_score: number;
}

// Define the test module interface
export interface TestModule {
  id?: string;
  name: string;
  type: "reading_writing" | "math";
  time?: number; // time in minutes
  questionCount?: number; // required, but will be enforced in the form
}

export const DEFAULT_MODULES: TestModule[] = [
  {
    name: "Reading & Writing",
    type: "reading_writing",
    time: 60
  },
  {
    name: "Math",
    type: "math",
    time: 60
  }
];
