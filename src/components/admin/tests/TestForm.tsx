
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
      type: z.enum(["reading_writing", "math"])
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
      title: currentTest?.title || '',
      description: currentTest?.description || '',
      is_active: currentTest?.is_active ?? true,
      id: currentTest?.id,
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
    // Combine all module scores into a single array
    const allScores: ScaledScore[] = [];
    moduleScores.forEach((scores, moduleId) => {
      scores.forEach(score => {
        allScores.push({
          ...score,
          module_id: moduleId
        });
      });
    });

    // Include all the scaled scores in the form submission
    const updatedValues = {
      ...values,
      scaled_scoring: allScores,
      modules: values.modules || DEFAULT_MODULES
    };
    onSubmit(updatedValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
        <TestBasicInfoForm form={form} />
        
        <TestModulesDisplay />
        
        <ModuleScaledScoring
          modules={defaultModules}
          moduleScores={moduleScores}
          onScoreChange={handleScoreChange}
          questionCount={questionCount}
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
