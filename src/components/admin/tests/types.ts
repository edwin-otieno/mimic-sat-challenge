// Define the test interface with scaled scoring
export interface Test {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  test_category: 'SAT' | 'ACT';
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
  type: "reading_writing" | "math" | "english" | "reading" | "science" | "writing" | "essay";
  time?: number; // time in minutes
  questionCount?: number; // required, but will be enforced in the form
}

export const DEFAULT_SAT_MODULES: TestModule[] = [
  {
    id: "reading_writing",
    name: "Reading & Writing",
    type: "reading_writing",
    time: 60
  },
  {
    id: "math",
    name: "Math",
    type: "math",
    time: 60
  }
];

export const DEFAULT_ACT_MODULES: TestModule[] = [
  {
    id: "english",
    name: "English",
    type: "english",
    time: 45
  },
  {
    id: "math",
    name: "Math",
    type: "math",
    time: 60
  },
  {
    id: "reading",
    name: "Reading",
    type: "reading",
    time: 35
  },
  {
    id: "science",
    name: "Science",
    type: "science",
    time: 35
  },
  {
    id: "essay",
    name: "Essay",
    type: "writing",
    time: 40
  }
];

// Legacy export for backward compatibility
export const DEFAULT_MODULES = DEFAULT_SAT_MODULES;

// Function to get default modules based on test category
export const getDefaultModules = (testCategory: 'SAT' | 'ACT'): TestModule[] => {
  return testCategory === 'ACT' ? DEFAULT_ACT_MODULES : DEFAULT_SAT_MODULES;
};
