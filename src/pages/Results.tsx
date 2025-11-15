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
  testCategory?: 'SAT' | 'ACT';
}

interface TestResult {
  id: string;
  test_id: string;
  total_score: number;
  total_questions: number;
  scaled_score: number | null;
  created_at: string;
  time_taken: number | null;
  answers?: Record<string, string> | null;
}

interface ModuleResult {
  id: string;
  module_id: string;
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
  const [historyQuestions, setHistoryQuestions] = useState<QuestionData[] | null>(null);
  const [historyAnswers, setHistoryAnswers] = useState<Record<string, string> | null>(null);
  const [isLoadingHistoryReview, setIsLoadingHistoryReview] = useState(false);
  const [historyTestTitle, setHistoryTestTitle] = useState<string | null>(null);
  const [currentTestTitle, setCurrentTestTitle] = useState<string | null>(null);
  const [historyTestCategory, setHistoryTestCategory] = useState<'SAT' | 'ACT' | null>(null);
  const [currentTestCategory, setCurrentTestCategory] = useState<'SAT' | 'ACT' | null>(null);
  const [historyReviewCache, setHistoryReviewCache] = useState<Record<string, { questions: QuestionData[]; answers: Record<string, string> | null; testTitle: string | null; testCategory?: 'SAT' | 'ACT' }>>({});
  
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
      // Fetch user's test results (limit to last 50 to reduce egress)
      const { data: testResults, error: testError } = await supabase
        .from('test_results')
        .select('id, test_id, total_score, total_questions, scaled_score, created_at, time_taken, answers')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      console.log('Fetched testResults:', testResults);
      if (testError) {
        console.error('Error fetching test results:', testError);
        return;
      }
      
      // Fetch module results for each test result (limit fields to reduce egress)
      const moduleResultPromises = testResults.map(testResult => 
        supabase
          .from('module_results')
          .select('id, module_id, module_name, score, total, scaled_score')
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
      if (combinedResults.length > 0) {
        if (!selectedResult) {
          setSelectedResult(combinedResults[0].testResult.id);
        }
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };
  
  
  // Load current test title and category when viewing immediate results (non-history)
  useEffect(() => {
    const loadCurrentTestTitle = async () => {
      if (!state || !state.questions || state.questions.length === 0) return;
      const firstQuestion: any = state.questions[0] as any;
      const testId = firstQuestion?.test_id;
      if (!testId) return;
      const { data, error } = await supabase
        .from('tests')
        .select('title, test_category, category')
        .eq('id', testId)
        .single();
      if (!error && data) {
        setCurrentTestTitle(data.title || null);
        setCurrentTestCategory((data.test_category || data.category || 'SAT') as 'SAT' | 'ACT');
      }
    };
    loadCurrentTestTitle();
  }, [state]);

  // Only toggle the view, don't fetch again
  const toggleHistory = () => {
    setViewingHistory(!viewingHistory);
  };
  
  // Persist and load historical review data
  useEffect(() => {
    const loadHistoryReview = async () => {
      // Only load history review if we're in history mode (no state) and have a selected result
      if (state || !selectedResult) {
        // Clear history data if we're not in history mode
        if (state) {
          setHistoryQuestions(null);
          setHistoryAnswers(null);
        }
        return;
      }
      
      // Wait for savedResults to be populated
      if (!savedResults || savedResults.length === 0) {
        console.log('Waiting for savedResults to be populated...');
        return;
      }
      
      const current = savedResults.find(r => r.testResult.id === selectedResult);
      if (!current) {
        console.log('Current result not found for selectedResult:', selectedResult);
        setHistoryQuestions(null);
        setHistoryAnswers(null);
        return;
      }
      
      console.log('Loading history review for:', current.testResult.id);
      
      // Use cache if available
      const cached = historyReviewCache[current.testResult.id];
      if (cached) {
        setHistoryQuestions(cached.questions);
        setHistoryAnswers(cached.answers);
        setHistoryTestTitle(cached.testTitle);
        if (cached.testCategory) {
          setHistoryTestCategory(cached.testCategory);
        }
        return;
      }
      
      // Clear previous data while loading new data
      setHistoryQuestions(null);
      setHistoryAnswers(null);
      
      try {
        setIsLoadingHistoryReview(true);
        const answers = current.testResult.answers || null;
        console.log('Loading history review for result:', current.testResult.id, 'answers:', answers);
        setHistoryAnswers(answers);

        const testIdentifier = current.testResult.test_id;
        console.log('Looking up test with identifier:', testIdentifier);
        
        // Select category (the actual database column name)
        // The database uses 'category', frontend uses 'test_category' - we'll map it
        let testRow = await supabase
          .from('tests')
          .select('id, title, category')
          .eq('id', testIdentifier)
          .single();
        if (testRow.error || !testRow.data) {
          console.log('Test not found by id, trying permalink:', testIdentifier);
          testRow = await supabase
            .from('tests')
            .select('id, title, category')
            .eq('permalink', testIdentifier)
            .single();
        }
        
        if (testRow.error || !testRow.data) {
          console.error('Could not resolve test id for history review:', testRow.error);
          setHistoryQuestions(null);
          setIsLoadingHistoryReview(false);
          return;
        }
        
        console.log('Found test:', testRow.data);
        setHistoryTestTitle(testRow.data.title || null);
        // Map category to test_category (database uses 'category', frontend uses 'test_category')
        const testCategory = (testRow.data.category || 'SAT') as 'SAT' | 'ACT';
        setHistoryTestCategory(testCategory);

        const { data: questionsData, error: questionsError } = await supabase
          .from('test_questions')
          .select(`
            *,
            test_question_options (*)
          `)
          .eq('test_id', testRow.data.id)
          .order('question_order', { ascending: true });
          
        if (questionsError) {
          console.error('Error loading questions for history:', questionsError);
          setHistoryQuestions(null);
          setIsLoadingHistoryReview(false);
          return;
        }

        console.log('Loaded questions:', questionsData?.length || 0, 'questions');

        // Transform the data to match QuestionData format
        const questions = (questionsData || []).map((q: any) => ({
          ...q,
          imageUrl: q.image_url,
          options: q.test_question_options?.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            is_correct: opt.is_correct
          })) || []
        })) as unknown as QuestionData[];
        
        console.log('Transformed questions:', questions.length);
        
        if (questions.length === 0) {
          console.warn('No questions found for test:', testRow.data.id);
          setHistoryQuestions(null);
          setIsLoadingHistoryReview(false);
          return;
        }
        
        setHistoryQuestions(questions);
        setHistoryReviewCache(prev => ({
          ...prev,
          [current.testResult.id]: {
            questions,
            answers,
            testTitle: testRow.data.title || null,
            testCategory: testCategory,
          }
        }));
      } catch (error) {
        console.error('Unexpected error loading history review:', error);
        setHistoryQuestions(null);
      } finally {
        setIsLoadingHistoryReview(false);
      }
    };
    loadHistoryReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, selectedResult, savedResults]);

  // Calculate total scaled score from module scores (or Composite Score for ACT)
  const calculateTotalScaledScore = (moduleScores: ModuleScore[]) => {
    const testCategory = state?.testCategory || 'SAT';
    
    if (testCategory === 'ACT') {
      // For ACT: Composite Score = average of English, Math, and Reading
      const compositeModules = moduleScores.filter(module => 
        ['english', 'math', 'reading'].includes(module.moduleId)
      );
      
      if (compositeModules.length === 0) return null;
      
      // Calculate average of scaled scores
      const sum = compositeModules.reduce((sum, module) => sum + (module.scaledScore || 0), 0);
      return Math.round(sum / compositeModules.length);
    } else {
      // For SAT: Use scaled scoring table or sum module scores
      if (!state.scaledScoring || state.scaledScoring.length === 0) {
        // Fallback: sum module scores if no scaled scoring table
        return moduleScores.reduce((sum, module) => sum + (module.scaledScore || 0), 0);
      }

      // Find scaled scoring entries without module_id (for overall score)
      const overallScoring = state.scaledScoring.filter(s => !s.module_id);
      if (overallScoring.length === 0) {
        // Fallback: sum module scores
        return moduleScores.reduce((sum, module) => sum + (module.scaledScore || 0), 0);
      }

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
    }
  };
  
  let content;
  
  if (!state || viewingHistory) {
    // Show saved results history
    const currentResult = savedResults.find(r => r.testResult.id === selectedResult);
    console.log('Rendering history view. savedResults:', savedResults, 'selectedResult:', selectedResult, 'currentResult:', currentResult);
    
    // If we're in history view but viewingHistory is false, set it to true
    if (!state && !viewingHistory) {
      setViewingHistory(true);
    }

    content = (
      <>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Test Results History</h2>
            {historyTestTitle && (
              <div className="text-xs sm:text-sm text-gray-500 mt-1">{historyTestTitle}</div>
            )}
          </div>
          {state && (
            <Button variant="outline" onClick={toggleHistory} className="self-start sm:self-auto">
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
                <Tabs 
                  value={selectedResult || undefined} 
                  onValueChange={(value) => {
                    console.log('Tab changed to:', value);
                    setSelectedResult(value);
                  }}
                >
                  <TabsList className="mb-4 flex-wrap overflow-x-auto max-h-[200px]">
                    {savedResults.map(result => (
                      <TabsTrigger key={result.testResult.id} value={result.testResult.id} className="text-xs sm:text-sm">
                        {new Date(result.testResult.created_at).toLocaleDateString()}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
            
            {currentResult && (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <ScoreCard 
                    score={currentResult.testResult.total_score} 
                    total={currentResult.testResult.total_questions}
                    scaledScore={currentResult.testResult.scaled_score} 
                  />
                  <SummaryCard 
                    score={currentResult.testResult.total_score}
                    total={currentResult.testResult.total_questions}
                    answeredCount={currentResult.testResult.total_questions}
                  />
                </div>
                
                {currentResult.moduleResults.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">Module Scores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue={currentResult.moduleResults[0].id}>
                        <TabsList className="mb-4 flex-wrap">
                          {currentResult.moduleResults.map(module => (
                            <TabsTrigger key={module.id} value={module.id} className="text-xs sm:text-sm">
                              {module.module_name}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        
                        {currentResult.moduleResults.map(module => (
                          <TabsContent key={module.id} value={module.id}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="bg-white rounded-lg p-4 border">
                                <h3 className="text-base sm:text-lg font-medium mb-2">{module.module_name} Score</h3>
                                <div className="text-2xl sm:text-3xl font-bold">
                                  {module.score} / {module.total}
                                </div>
                              </div>
                              
                              {module.scaled_score !== null && (
                                <div className="bg-white rounded-lg p-4 border">
                                  <h3 className="text-base sm:text-lg font-medium mb-2">Scaled Score</h3>
                                  <div className="text-2xl sm:text-3xl font-bold">
                                    {module.scaled_score}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                      
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-base sm:text-lg font-medium mb-2">
                          {historyTestCategory === 'ACT' ? 'Composite Score' : 'Total Scaled Score'}
                        </h3>
                        <div className="text-2xl sm:text-3xl font-bold">
                          {historyTestCategory === 'ACT' ? (() => {
                            // For ACT: Calculate Composite Score (average of English, Math, Reading)
                            const compositeModules = currentResult.moduleResults.filter(module => 
                              module.module_id && ['english', 'math', 'reading'].includes(module.module_id)
                            );
                            if (compositeModules.length > 0) {
                              const sum = compositeModules.reduce((sum, module) => sum + (module.scaled_score || 0), 0);
                              return Math.round(sum / compositeModules.length);
                            }
                            return 'N/A';
                          })() : (
                            currentResult.moduleResults.reduce((sum, module) => 
                              sum + (module.scaled_score || 0), 0
                            )
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Historical answer review */}
            {currentResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Answer Review</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingHistoryReview ? (
                    <div className="text-center py-6">
                      <div className="animate-spin h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                      <p className="text-gray-500">Loading answer review...</p>
                    </div>
                  ) : historyQuestions ? (
                    <QuestionReview 
                      questions={historyQuestions} 
                      userAnswers={(historyAnswers || {}) as Record<string, string>} 
                      testCategory={historyTestCategory || 'SAT'}
                    />
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500 mb-2">Answer details are not available for this attempt.</p>
                      {isLoadingHistoryReview === false && (
                        <p className="text-sm text-gray-400">
                          This may be because the test questions could not be loaded or this is an older test result.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
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
        {currentTestTitle && (
          <div className="text-sm text-gray-500 mb-4">{currentTestTitle}</div>
        )}
        
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
                testCategory={state?.testCategory || currentTestCategory || 'SAT'}
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
                    <h3 className="text-lg font-medium mb-2">
                      {(state?.testCategory || currentTestCategory) === 'ACT' ? 'Composite Score' : 'Total Scaled Score'}
                    </h3>
                    <div className="text-3xl font-bold">
                      {memoizedScaledScore || 'N/A'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <QuestionReview 
              questions={state.questions} 
              userAnswers={state.answers} 
              testCategory={state?.testCategory || currentTestCategory || 'SAT'}
            />
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
