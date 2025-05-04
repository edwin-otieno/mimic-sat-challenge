
// Define the test interface with scaled scoring
export interface Test {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
  scaled_scoring?: ScaledScore[];
  modules?: TestModule[];
}

// Define the scaled score interface
export interface ScaledScore {
  module_id?: string;
  correct_answers: number;
  scaled_score: number;
}

// Define the test module interface
export interface TestModule {
  id?: string;
  name: string;
  type: "reading_writing" | "math";
}

export const DEFAULT_MODULES: TestModule[] = [
  {
    name: "Reading & Writing",
    type: "reading_writing"
  },
  {
    name: "Math",
    type: "math"
  }
];
