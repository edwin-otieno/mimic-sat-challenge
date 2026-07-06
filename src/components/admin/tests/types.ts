// Define the test interface with scaled scoring
export interface Test {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  test_category: 'SAT' | 'ACT';
  test_variant?: 'full' | 'mini';
  source_test_id?: string | null;
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

// Mini ACT tests omit the Essay section
export const DEFAULT_MINI_ACT_MODULES: TestModule[] = DEFAULT_ACT_MODULES.filter(
  (module) => module.id !== 'essay' && module.type !== 'writing'
);

// Legacy export for backward compatibility
export const DEFAULT_MODULES = DEFAULT_SAT_MODULES;

export const isEssayModule = (module: { type?: string; id?: string }): boolean =>
  module.type === 'writing' ||
  module.type === 'essay' ||
  module.id === 'essay' ||
  module.id === 'writing';

export const isMiniActTest = (
  test: { test_category?: string; test_variant?: string } | null | undefined
): boolean =>
  !!test && test.test_category === 'ACT' && (test.test_variant || 'full') === 'mini';

// Function to get default modules based on test category and variant
export const getDefaultModules = (
  testCategory: 'SAT' | 'ACT',
  testVariant: 'full' | 'mini' = 'full'
): TestModule[] => {
  if (testCategory === 'ACT') {
    return testVariant === 'mini' ? DEFAULT_MINI_ACT_MODULES : DEFAULT_ACT_MODULES;
  }
  return DEFAULT_SAT_MODULES;
};

export const getModulesForTest = (
  test: {
    test_category?: 'SAT' | 'ACT' | string;
    test_variant?: 'full' | 'mini' | string;
    modules?: TestModule[];
  } | null | undefined
): TestModule[] => {
  if (!test) return DEFAULT_SAT_MODULES;

  const category = test.test_category === 'ACT' ? 'ACT' : 'SAT';
  const variant = test.test_variant === 'mini' ? 'mini' : 'full';
  const modules = test.modules?.length ? test.modules : getDefaultModules(category, variant);

  if (isMiniActTest(test)) {
    if (!test.modules?.length) {
      return DEFAULT_MINI_ACT_MODULES;
    }
    if (!modules.some(isEssayModule)) {
      return modules;
    }
    return modules.filter((module) => !isEssayModule(module));
  }

  return modules;
};
