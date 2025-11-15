import React, { useEffect } from 'react';
import { ScaledScore, TestModule } from './types';
import ScaledScoreTable from './ScaledScoreTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ModuleScaledScoringProps {
  modules: TestModule[];
  moduleScores: Map<string, ScaledScore[]>;
  onScoreChange: (moduleId: string, scores: ScaledScore[]) => void;
  questionCounts: { [moduleId: string]: number | undefined };
}

const ModuleScaledScoring: React.FC<ModuleScaledScoringProps> = ({
  modules,
  moduleScores,
  onScoreChange,
  questionCounts
}) => {
  // Ensure each module has its own independent scores
  useEffect(() => {
    modules.forEach(module => {
      const moduleId = module.id || module.name;
      if (!moduleScores.has(moduleId)) {
        // Initialize with empty array if no scores exist for this module
        onScoreChange(moduleId, moduleScores.get(moduleId) || []);
      }
    });
  }, [modules, moduleScores, onScoreChange]);

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4">Module Scaled Scoring</h3>
      
      <Tabs defaultValue={modules[0]?.id || modules[0]?.name || 'default'} className="w-full">
        <TabsList className="mb-4">
          {modules.map((module, index) => {
            const moduleId = module.id || module.name;
            return (
              <TabsTrigger key={moduleId} value={moduleId}>
                {module.name}
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        {modules.map((module, index) => {
          const moduleId = module.id || module.name;
          const moduleScoreData = moduleScores.get(moduleId) || [];
          const questionCount = questionCounts[moduleId] ?? 0;
          
          return (
            <TabsContent key={moduleId} value={moduleId}>
              <Card>
                <CardHeader>
                  <CardTitle>{module.name} Scoring</CardTitle>
                  <CardDescription>
                    Configure scaled scoring for the {module.name} module. Each module has its own independent scoring table.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScaledScoreTable 
                    scores={moduleScoreData}
                    onChange={(scores) => onScoreChange(moduleId, scores)}
                    questionCount={questionCount}
                    moduleId={moduleId}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default ModuleScaledScoring;
