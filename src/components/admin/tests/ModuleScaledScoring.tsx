
import React, { useEffect } from 'react';
import { ScaledScore, TestModule } from './types';
import ScaledScoreTable from './ScaledScoreTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ModuleScaledScoringProps {
  modules: TestModule[];
  moduleScores: Map<string, ScaledScore[]>;
  onScoreChange: (moduleId: string, scores: ScaledScore[]) => void;
  questionCount: number;
}

const ModuleScaledScoring: React.FC<ModuleScaledScoringProps> = ({
  modules,
  moduleScores,
  onScoreChange,
  questionCount
}) => {
  // Ensure each module has its own independent scores
  useEffect(() => {
    modules.forEach(module => {
      const moduleId = module.id || '';
      if (!moduleScores.has(moduleId)) {
        // Initialize with empty array if no scores exist for this module
        onScoreChange(moduleId, []);
      }
    });
  }, [modules, moduleScores, onScoreChange]);

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4">Module Scaled Scoring</h3>
      
      <Tabs defaultValue={modules[0]?.id || ''}>
        <TabsList className="mb-4">
          {modules.map((module) => (
            <TabsTrigger key={module.id} value={module.id || ''}>
              {module.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {modules.map((module) => (
          <TabsContent key={module.id} value={module.id || ''}>
            <Card>
              <CardHeader>
                <CardTitle>{module.name} Scoring</CardTitle>
                <CardDescription>
                  Configure scaled scoring for the {module.name} module
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScaledScoreTable 
                  scores={moduleScores.get(module.id || '') || []}
                  onChange={(scores) => onScoreChange(module.id || '', scores)}
                  questionCount={questionCount / modules.length} // Divide questions across modules
                  moduleId={module.id || ''}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ModuleScaledScoring;
