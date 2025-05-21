import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Test, ScaledScore, DEFAULT_MODULES, TestModule } from './types';
import TestModulesDisplay from './TestModulesDisplay';
import TestBasicInfoForm from './TestBasicInfoForm';
import ModuleScaledScoring from './ModuleScaledScoring';

// Form schema definition
export const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  is_active: z.boolean().default(true),
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
      type: z.enum(["reading_writing", "math"]),
      time: z.number().min(1, { message: "Time must be at least 1 minute" }),
      questionCount: z.number({ required_error: "Question count is required" }).min(1, { message: "Question count is required" })
    })
  ).default(DEFAULT_MODULES)
});

interface TestFormProps {
  currentTest: Test | null;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  onCancel: () => void;
  questionCount: number;
}

const TestForm: React.FC<TestFormProps> = ({ 
  currentTest, 
  onSubmit,
  onCancel,
  questionCount
}) => {
  // Group scaled scores by module
  const initializeModuleScores = () => {
    const modules = currentTest?.modules || DEFAULT_MODULES;
    const allScores = currentTest?.scaled_scoring || [];
    
    // Create a map for each module
    const moduleScores = new Map<string, ScaledScore[]>();
    
    modules.forEach(module => {
      // Filter scores for this module
      const moduleId = module.id || '';
      const scores = allScores.filter(score => score.module_id === moduleId);
      moduleScores.set(moduleId, scores.length > 0 ? scores : []);
    });
    
    return moduleScores;
  };

  const [moduleScores, setModuleScores] = useState<Map<string, ScaledScore[]>>(initializeModuleScores());
  
  const defaultModules = currentTest?.modules || DEFAULT_MODULES;

  // If modules change (e.g. when editing a test), reinitialize the scores
  useEffect(() => {
    setModuleScores(initializeModuleScores());
  }, [currentTest]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: currentTest?.id,
      title: currentTest?.title || '',
      description: currentTest?.description || '',
      is_active: currentTest?.is_active ?? true,
      scaled_scoring: currentTest?.scaled_scoring || [],
      modules: defaultModules
    }
  });

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

    console.log("Submitting scaled scores:", allScores);
    console.log("Current test ID:", currentTest?.id);

    // Include all the scaled scores in the form submission
    const updatedValues = {
      ...values,
      id: currentTest?.id,
      scaled_scoring: allScores,
      modules: values.modules || DEFAULT_MODULES
    };
    
    console.log("Submitting form with values:", JSON.stringify(updatedValues, null, 2));
    onSubmit(updatedValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
        <TestBasicInfoForm form={form} />
        
        {/* Module time editing UI */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Module Timing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.watch('modules').map((module, idx) => (
              <div key={module.id || idx} className="flex flex-col gap-2 p-3 border rounded-md">
                <div className="font-medium">{module.name}</div>
                <div className="text-sm text-gray-500 mb-1">Type: {module.type === 'reading_writing' ? 'Reading & Writing' : 'Math'}</div>
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
          modules={defaultModules}
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
