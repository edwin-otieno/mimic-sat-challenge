import React, { useState, useEffect, useMemo } from "react";
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const state = location.state as ResultsState;
  
  // Move hooks to top level to avoid conditional hook calls
  const memoizedScaledScore = useMemo(() => {
    return state?.overallScaledScore || (state?.scaledScoring ? calculateTotalScaledScore(state?.moduleScores || []) : null);
  }, [state?.overallScaledScore, state?.scaledScoring, state?.moduleScores]);

  const answeredCount = useMemo(() => Object.keys(state?.answers || {}).length, [state?.answers]);
  
  // Set initial load to false after a brief moment to ensure smooth transition
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 50);
    return () => clearTimeout(timer);
  }, []);
  
  // Fetch results history on mount if user is present
  useEffect(() => {
    if (user) {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  
  const fetchResults = async () => {
    if (!user) {
      console.log('No user found in fetchResults');
      return;
    }
    
    setIsLoadingHistory(true);
    try {
      // Fetch user's test results
      const { data: testResults, error: testError } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      console.log('Fetched testResults:', testResults);
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
      console.log('Set savedResults:', combinedResults);
      
      // Select the most recent result by default
      if (combinedResults.length > 0 && !selectedResult) {
        setSelectedResult(combinedResults[0].testResult.id);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  // Only toggle the view, don't fetch again
  const toggleHistory = () => {
    setViewingHistory(!viewingHistory);
  };
  
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
  
  let content;
  
  if (!state || viewingHistory) {
    // Show saved results history
    const currentResult = savedResults.find(r => r.testResult.id === selectedResult);
    console.log('Rendering history view. savedResults:', savedResults, 'selectedResult:', selectedResult, 'currentResult:', currentResult);
    
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
        
        {isLoadingHistory ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading test history...</p>
          </div>
        ) : savedResults.length > 0 ? (
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
    content = (
      <>
        <ResultsHeader />
        
        <div className="flex justify-end mb-4">
          <Button variant="outline" onClick={toggleHistory}>
            View Results History
          </Button>
        </div>
        
        {isInitialLoad ? (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your results...</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <ScoreCard 
                score={state.score} 
                total={state.total} 
                scaledScoring={state.scaledScoring}
                scaledScore={memoizedScaledScore} 
              />
              <SummaryCard 
                score={state.score} 
                total={state.total} 
                answeredCount={answeredCount} 
              />
            </div>
            
            {state.moduleScores && state.moduleScores.length > 0 && (
              <Card className="mb-10">
                <CardHeader>
                  <CardTitle>Module Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue={state.moduleScores[0].moduleId}>
                    <TabsList className="mb-4">
                      {state.moduleScores.map(module => (
                        <TabsTrigger key={module.moduleId} value={module.moduleId}>
                          {module.moduleName}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {state.moduleScores.map(module => (
                      <TabsContent key={module.moduleId} value={module.moduleId}>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg p-4 border">
                            <h3 className="text-lg font-medium mb-2">{module.moduleName} Score</h3>
                            <div className="text-3xl font-bold">
                              {module.correctAnswers} / {module.totalQuestions}
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
                      {memoizedScaledScore || 'N/A'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <QuestionReview questions={state.questions} userAnswers={state.answers} />
          </>
        )}
      </>
    );
  } else {
    content = (
      <div className="text-center py-8">
        <p className="text-gray-500">No results data available.</p>
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
