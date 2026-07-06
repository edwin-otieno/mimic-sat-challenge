import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Test, ScaledScore, DEFAULT_MODULES, TestModule, getDefaultModules, isEssayModule } from './types';
import TestModulesDisplay from './TestModulesDisplay';
import TestBasicInfoForm from './TestBasicInfoForm';
import ModuleScaledScoring from './ModuleScaledScoring';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Form schema definition
export const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  is_active: z.boolean().default(true),
  test_category: z.enum(["SAT", "ACT"]),
  test_variant: z.enum(["full", "mini"]).default("full"),
  source_test_id: z.string().nullable().optional(),
  scaled_scoring: z.array(
    z.object({
      module_id: z.string().optional(),
      correct_answers: z.number().min(0),
      scaled_score: z.number()
    })
  ).optional(),
  modules: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      type: z.enum(["reading_writing", "math", "english", "reading", "science", "writing", "essay"]),
      time: z.number().min(1, { message: "Time must be at least 1 minute" }),
      questionCount: z.number({ required_error: "Question count is required" }).min(1, { message: "Question count is required" })
    })
  ).default(DEFAULT_MODULES)
});

interface TestFormProps {
  currentTest: Test | null;
  allTests: Test[];
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  onCancel: () => void;
}

const TestForm: React.FC<TestFormProps> = ({ 
  currentTest, 
  allTests,
  onSubmit,
  onCancel
}) => {
  // Group scaled scores by module
  const initializeModuleScores = () => {
    const testCategory = currentTest?.test_category || 'SAT';
    const testVariant = currentTest?.test_variant || 'full';
    const modules = currentTest?.modules || getDefaultModules(testCategory, testVariant);
    const allScores = currentTest?.scaled_scoring || [];
    
    // Create a map for each module
    const moduleScores = new Map<string, ScaledScore[]>();
    
    modules.forEach(module => {
      // Use module.id if available, otherwise use module.name as fallback
      const moduleId = module.id || module.name;
      const scores = allScores.filter(score => score.module_id === moduleId);
      moduleScores.set(moduleId, scores.length > 0 ? scores : []);
    });
    
    return moduleScores;
  };

  const [moduleScores, setModuleScores] = useState<Map<string, ScaledScore[]>>(initializeModuleScores());
  
  const testCategory = currentTest?.test_category || 'SAT';
  const testVariant = currentTest?.test_variant || 'full';
  const defaultModules = currentTest?.modules || getDefaultModules(testCategory, testVariant);

  // If modules change (e.g. when editing a test), reinitialize the scores
  useEffect(() => {
    setModuleScores(initializeModuleScores());
  }, [currentTest]);


  // Handle test category changes
  const handleTestCategoryChange = (category: 'SAT' | 'ACT') => {
    form.setValue('test_category', category);
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: currentTest?.id,
      title: currentTest?.title || '',
      description: currentTest?.description || '',
      is_active: currentTest?.is_active ?? true,
      test_category: currentTest?.test_category || currentTest?.category || 'SAT',
      test_variant: currentTest?.test_variant || 'full',
      source_test_id: currentTest?.source_test_id || null,
      scaled_scoring: currentTest?.scaled_scoring || [],
      modules: currentTest?.modules || getDefaultModules(
        currentTest?.test_category || currentTest?.category || 'SAT',
        currentTest?.test_variant || 'full'
      )
    }
  });

  // Reset form when currentTest changes (preserve modules from DB as-is)
  useEffect(() => {
    if (currentTest) {
      const testCategory = currentTest.test_category || currentTest.category || 'SAT';
      form.reset({
        id: currentTest.id,
        title: currentTest.title || '',
        description: currentTest.description || '',
        is_active: currentTest.is_active ?? true,
        test_category: testCategory,
        test_variant: currentTest.test_variant || 'full',
        source_test_id: currentTest.source_test_id || null,
        scaled_scoring: currentTest.scaled_scoring || [],
        // Important: do not inject defaults here; keep DB modules untouched
        modules: currentTest.modules || []
      });
    }
  }, [currentTest, form]);

  // Watch for test category changes and update modules accordingly
  const watchedTestCategory = form.watch('test_category');
  const watchedTestVariant = form.watch('test_variant');
  const watchedModules = form.watch('modules');
  
  useEffect(() => {
    // Only apply default modules if the user actually changed the category
    // from the loaded test's category. Avoid clobbering modules loaded from DB on open.
    if (!watchedTestCategory) return;
    const loadedCategory = currentTest?.test_category || currentTest?.category;
    const userChangedCategory = loadedCategory && watchedTestCategory !== loadedCategory;
    if (!currentTest || userChangedCategory) {
      const newModules = getDefaultModules(
        watchedTestCategory,
        watchedTestVariant === 'mini' ? 'mini' : 'full'
      );
      form.setValue('modules', newModules);
      
      // Reset module scores for new modules
      const newModuleScores = new Map<string, ScaledScore[]>();
      newModules.forEach(module => {
        const moduleId = module.id || module.name;
        newModuleScores.set(moduleId, []);
      });
      setModuleScores(newModuleScores);
    }
  }, [watchedTestCategory, watchedTestVariant, form, currentTest]);

  useEffect(() => {
    if (watchedTestCategory !== 'ACT' || watchedTestVariant !== 'mini') return;

    const currentModules = form.getValues('modules') || [];
    const filteredModules = currentModules.filter((module) => !isEssayModule(module));
    if (filteredModules.length !== currentModules.length) {
      form.setValue(
        'modules',
        filteredModules.length > 0 ? filteredModules : getDefaultModules('ACT', 'mini')
      );
    }
  }, [watchedTestCategory, watchedTestVariant, form]);

  useEffect(() => {
    if (watchedTestVariant !== 'mini') {
      form.setValue('source_test_id', null);
    }
  }, [watchedTestVariant, form]);

  // Sync module scores when modules change
  useEffect(() => {
    if (watchedModules && watchedModules.length > 0) {
      const newModuleScores = new Map<string, ScaledScore[]>();
      watchedModules.forEach(module => {
        const moduleId = module.id || module.name;
        // Preserve existing scores for this module if they exist
        const existingScores = moduleScores.get(moduleId) || [];
        newModuleScores.set(moduleId, existingScores);
      });
      setModuleScores(newModuleScores);
    }
  }, [watchedModules]);

  const handleScoreChange = (moduleId: string, scores: ScaledScore[]) => {
    // Update the scores for the specific module only
    const newModuleScores = new Map(moduleScores);
    newModuleScores.set(moduleId, scores);
    setModuleScores(newModuleScores);
  };

  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    // Combine all module scores into a single array and ensure module_id is set
    const allScores: ScaledScore[] = [];
    moduleScores.forEach((scores, moduleId) => {
      scores.forEach(score => {
        allScores.push({
          ...score,
          module_id: moduleId
        });
      });
    });

    console.log("=== FORM SUBMISSION DEBUG ===");
    console.log("Form values:", values);
    console.log("Module scores:", moduleScores);
    console.log("Submitting scaled scores:", allScores);
    console.log("Current test ID:", currentTest?.id);
    console.log("Test category from form:", values.test_category);

    // Include all the scaled scores in the form submission
    const updatedValues = {
      ...values,
      id: currentTest?.id,
      scaled_scoring: allScores,
      source_test_id: values.test_variant === 'mini' ? values.source_test_id || null : null,
      modules: values.modules // Remove the fallback that might be overriding values
    };
    
    console.log("Final values being submitted:", JSON.stringify(updatedValues, null, 2));
    console.log("=== END FORM SUBMISSION DEBUG ===");
    onSubmit(updatedValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
        <TestBasicInfoForm form={form} onTestCategoryChange={handleTestCategoryChange} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="test_variant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Test Variant</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="full">Full Test</SelectItem>
                    <SelectItem value="mini">Mini Test</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {watchedTestVariant === 'mini' && (
            <FormField
              control={form.control}
              name="source_test_id"
              render={({ field }) => {
                const matchingSourceTests = allTests
                  .filter((test) => test.id !== currentTest?.id)
                  .filter((test) => (test.test_category || 'SAT') === watchedTestCategory)
                  .filter((test) => (test.test_variant || 'full') === 'full')
                  .sort((a, b) => a.title.localeCompare(b.title));

                return (
                  <FormItem>
                    <FormLabel>Source Full Test (same category)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === '__none' ? null : value)}
                      value={field.value || '__none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Optional source test for question import" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none">No source test selected</SelectItem>
                        {matchingSourceTests.map((test) => (
                          <SelectItem key={test.id} value={test.id}>
                            {test.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          )}
        </div>
        
        {/* Module time editing UI */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Module Timing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.watch('modules')?.map((module, idx) => (
              <div key={module.id || idx} className="flex flex-col gap-2 p-3 border rounded-md">
                <div className="font-medium">{module.name}</div>
                <div className="text-sm text-gray-500 mb-1">Type: {
                  module.type === 'reading_writing' ? 'Reading & Writing' : 
                  module.type === 'math' ? 'Math' :
                  module.type === 'english' ? 'English' :
                  module.type === 'reading' ? 'Reading' :
                  module.type === 'science' ? 'Science' :
                  module.type === 'writing' ? 'Essay' : 
                  module.type === 'essay' ? 'Essay' : module.type
                }</div>
                <label className="text-sm font-medium">Time (minutes):</label>
                <input
                  type="number"
                  min={1}
                  value={module.time || ''}
                  onChange={e => {
                    const value = parseInt(e.target.value, 10);
                    const modules = [...form.getValues('modules')];
                    modules[idx].time = isNaN(value) ? undefined : value;
                    form.setValue('modules', modules);
                  }}
                  className="border rounded px-2 py-1 w-24"
                />
                {form.formState.errors.modules?.[idx]?.time && (
                  <span className="text-xs text-red-500">{form.formState.errors.modules[idx].time.message}</span>
                )}
                <label className="text-sm font-medium mt-2">Question Count:</label>
                <input
                  type="number"
                  min={1}
                  value={module.questionCount || ''}
                  onChange={e => {
                    const value = parseInt(e.target.value, 10);
                    const modules = [...form.getValues('modules')];
                    modules[idx].questionCount = isNaN(value) ? undefined : value;
                    form.setValue('modules', modules);
                  }}
                  className="border rounded px-2 py-1 w-24"
                />
                {form.formState.errors.modules?.[idx]?.questionCount && (
                  <span className="text-xs text-red-500">{form.formState.errors.modules[idx].questionCount.message}</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <TestModulesDisplay />
        
        <ModuleScaledScoring
          modules={form.watch('modules')}
          moduleScores={moduleScores}
          onScoreChange={handleScoreChange}
          questionCounts={form.watch('modules').reduce((acc, m) => { acc[m.id || m.name] = m.questionCount; return acc; }, {})}
        />
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {currentTest ? 'Save Changes' : 'Create Test'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TestForm;
