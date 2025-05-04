
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { QuestionData } from "@/components/Question";
import { ScaledScore } from "@/components/admin/tests/types";
import ResultsHeader from "@/components/results/ResultsHeader";
import ScoreCard from "@/components/results/ScoreCard";
import SummaryCard from "@/components/results/SummaryCard";
import QuestionReview from "@/components/results/QuestionReview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ResultsState {
  score: number;
  total: number;
  answers: Record<string, string>;
  questions: QuestionData[];
  scaledScoring?: ScaledScore[];
  moduleScores?: {
    moduleId: string;
    moduleName: string;
    score: number;
    total: number;
    scaledScore?: number;
  }[];
}

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ResultsState;
  
  if (!state) {
    // If no results data, redirect to dashboard
    React.useEffect(() => {
      navigate("/dashboard");
    }, [navigate]);
    
    return null;
  }
  
  const { score, total, answers, questions, scaledScoring, moduleScores } = state;
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
        <ResultsHeader />
        
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <ScoreCard score={score} total={total} scaledScoring={scaledScoring} />
          <SummaryCard 
            score={score} 
            total={total} 
            answeredCount={Object.keys(answers).length} 
          />
        </div>
        
        {moduleScores && moduleScores.length > 0 && (
          <Card className="mb-10">
            <CardHeader>
              <CardTitle>Module Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={moduleScores[0].moduleId}>
                <TabsList className="mb-4">
                  {moduleScores.map(module => (
                    <TabsTrigger key={module.moduleId} value={module.moduleId}>
                      {module.moduleName}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {moduleScores.map(module => (
                  <TabsContent key={module.moduleId} value={module.moduleId}>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border">
                        <h3 className="text-lg font-medium mb-2">{module.moduleName} Score</h3>
                        <div className="text-3xl font-bold">
                          {module.score} / {module.total}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {Math.round((module.score / module.total) * 100)}%
                        </div>
                      </div>
                      
                      {module.scaledScore !== undefined && (
                        <div className="bg-white rounded-lg p-4 border">
                          <h3 className="text-lg font-medium mb-2">Scaled Score</h3>
                          <div className="text-3xl font-bold">
                            {module.scaledScore}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        <QuestionReview questions={questions} userAnswers={answers} />
        
        <div className="flex justify-center mt-10">
          <Button onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Results;
