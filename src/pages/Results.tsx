import React, { useState, useEffect } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";

interface ModuleScore {
  moduleId: string;
  moduleName: string;
  score: number;
  total: number;
  scaledScore?: number;
  correctAnswers: number;
  totalQuestions: number;
}

interface ResultsState {
  score: number;
  total: number;
  answers: Record<string, string>;
  questions: QuestionData[];
  scaledScoring?: ScaledScore[];
  moduleScores?: ModuleScore[];
  overallScaledScore?: number;
}

interface TestResult {
  id: string;
  test_id: string;
  total_score: number;
  total_questions: number;
  scaled_score: number | null;
  created_at: string;
  time_taken: number | null;
}

interface ModuleResult {
  id: string;
  module_name: string;
  score: number;
  total: number;
  scaled_score: number | null;
}

interface SavedTestResults {
  testResult: TestResult;
  moduleResults: ModuleResult[];
}

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const [savedResults, setSavedResults] = useState<SavedTestResults[]>([]);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [viewingHistory, setViewingHistory] = useState(false);
  
  const state = location.state as ResultsState;
  
  const fetchResults = async () => {
    if (!user) return;
    
    try {
      // Fetch user's test results
      const { data: testResults, error: testError } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (testError) {
        console.error('Error fetching test results:', testError);
        return;
      }
      
      // Fetch module results for each test result
      const moduleResultPromises = testResults.map(testResult => 
        supabase
          .from('module_results')
          .select('*')
          .eq('test_result_id', testResult.id)
      );
      
      const moduleResultsResponses = await Promise.all(moduleResultPromises);
      
      // Combine test results with their module results
      const combinedResults: SavedTestResults[] = testResults.map((testResult, index) => ({
        testResult,
        moduleResults: moduleResultsResponses[index].data || []
      }));
      
      setSavedResults(combinedResults);
      
      // Select the most recent result by default
      if (combinedResults.length > 0 && !selectedResult) {
        setSelectedResult(combinedResults[0].testResult.id);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };
  
  // Fetch results when component mounts and user is available
  useEffect(() => {
    fetchResults();
  }, [user]);
  
  // Calculate total scaled score from module scores
  const calculateTotalScaledScore = (moduleScores: ModuleScore[]) => {
    if (!state.scaledScoring || state.scaledScoring.length === 0) {
      return null;
    }

    // Find scaled scoring entries without module_id (for overall score)
    const overallScoring = state.scaledScoring.filter(s => !s.module_id);
    if (overallScoring.length === 0) return null;

    // Calculate total correct answers from all modules
    const totalCorrect = moduleScores.reduce((sum, module) => sum + module.correctAnswers, 0);

    // Find exact match or closest lower score
    const exactMatch = overallScoring.find(s => s.correct_answers === totalCorrect);
    if (exactMatch) {
      return exactMatch.scaled_score;
    }

    // Sort by correct_answers in descending order and find the first that's less than the score
    const sortedScoring = [...overallScoring].sort((a, b) => b.correct_answers - a.correct_answers);
    const closestLower = sortedScoring.find(s => s.correct_answers < totalCorrect);
    
    return closestLower ? closestLower.scaled_score : sortedScoring[sortedScoring.length - 1].scaled_score;
  };
  
  // Toggle between current result and history
  const toggleHistory = () => {
    setViewingHistory(!viewingHistory);
  };
  
  let content;
  
  if (!state || viewingHistory) {
    // Show saved results history
    const currentResult = savedResults.find(r => r.testResult.id === selectedResult);
    
    content = (
      <>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Test Results History</h2>
          {state && (
            <Button variant="outline" onClick={toggleHistory}>
              Return to Current Result
            </Button>
          )}
        </div>
        
        {savedResults.length > 0 ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Test Result</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedResult || undefined} onValueChange={setSelectedResult}>
                  <TabsList className="mb-4 flex-wrap overflow-x-auto max-h-[200px]">
                    {savedResults.map(result => (
                      <TabsTrigger key={result.testResult.id} value={result.testResult.id}>
                        {new Date(result.testResult.created_at).toLocaleDateString()}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
            
            {currentResult && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <ScoreCard 
                    score={currentResult.testResult.total_score} 
                    total={currentResult.testResult.total_questions}
                    scaledScore={currentResult.testResult.scaled_score} 
                  />
                  <SummaryCard 
                    score={currentResult.testResult.total_score}
                    total={currentResult.testResult.total_questions}
                    answeredCount={currentResult.testResult.total_score + 
                      (currentResult.testResult.total_questions - currentResult.testResult.total_score)} 
                  />
                </div>
                
                {currentResult.moduleResults.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Module Scores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue={currentResult.moduleResults[0].id}>
                        <TabsList className="mb-4">
                          {currentResult.moduleResults.map(module => (
                            <TabsTrigger key={module.id} value={module.id}>
                              {module.module_name}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        
                        {currentResult.moduleResults.map(module => (
                          <TabsContent key={module.id} value={module.id}>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="bg-white rounded-lg p-4 border">
                                <h3 className="text-lg font-medium mb-2">{module.module_name} Score</h3>
                                <div className="text-3xl font-bold">
                                  {module.score} / {module.total}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {Math.round((module.score / module.total) * 100)}%
                                </div>
                              </div>
                              
                              {module.scaled_score !== null && (
                                <div className="bg-white rounded-lg p-4 border">
                                  <h3 className="text-lg font-medium mb-2">Scaled Score</h3>
                                  <div className="text-3xl font-bold">
                                    {module.scaled_score}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                      
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-lg font-medium mb-2">Total Scaled Score</h3>
                        <div className="text-3xl font-bold">
                          {currentResult.moduleResults.reduce((sum, module) => 
                            sum + (module.scaled_score || 0), 0
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-md">
            <p className="text-gray-500">No saved test results found.</p>
          </div>
        )}
      </>
    );
  } else if (state) {
    // Show current test result
    const { score, total, answers, questions, moduleScores } = state;
    
    content = (
      <>
        <ResultsHeader />
        
        <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={toggleHistory}>
            View Results History
          </Button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <ScoreCard 
            score={score} 
            total={total} 
            scaledScoring={state.scaledScoring}
            scaledScore={state.overallScaledScore || (state.scaledScoring ? calculateTotalScaledScore(moduleScores || []) : null)} 
          />
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
                          {module.correctAnswers} / {module.totalQuestions}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {module.totalQuestions > 0 ? Math.round((module.correctAnswers / module.totalQuestions) * 100) : 0}%
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border">
                        <h3 className="text-lg font-medium mb-2">Scaled Score</h3>
                        <div className="text-3xl font-bold">
                          {module.scaledScore !== undefined && module.scaledScore !== null ? module.scaledScore : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Total Scaled Score</h3>
                <div className="text-3xl font-bold">
                  {state.overallScaledScore || calculateTotalScaledScore(moduleScores) || 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <QuestionReview questions={questions} userAnswers={answers} />
      </>
    );
  } else {
    content = (
      <div className="text-center py-8">
        <p className="text-gray-500">No results data available.</p>
        <Button className="mt-4" onClick={() => navigate("/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
        {content}
        
        <div className="flex justify-center mt-10">
          <Button onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Results;
