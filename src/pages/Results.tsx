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
  user_id?: string;
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
        .select('id, test_id, user_id, total_score, total_questions, scaled_score, created_at, time_taken, answers, is_completed')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      console.log('Fetched testResults:', testResults);
      if (testError) {
        console.error('Error fetching test results:', testError);
        return;
      }
      
      // Deduplicate: keep only one entry per user/test combination, preferring completed ones
      const deduplicatedResults = testResults.reduce((acc: any[], current: any) => {
        const key = `${current.user_id}-${current.test_id}`;
        const existing = acc.find(r => `${r.user_id}-${r.test_id}` === key);

        if (!existing) {
          acc.push(current);
        } else {
          const currentIsCompleted = current.is_completed === true;
          const existingIsCompleted = existing.is_completed === true;

          if (currentIsCompleted && !existingIsCompleted) {
            const index = acc.indexOf(existing);
            acc[index] = current;
          } else if (!currentIsCompleted && existingIsCompleted) {
            // Keep existing completed, ignore in-progress
          } else {
            // Both same status, keep the one with answers or most recent
            const currentHasAnswers = current.answers && typeof current.answers === 'object' && Object.keys(current.answers).length > 0;
            const existingHasAnswers = existing.answers && typeof existing.answers === 'object' && Object.keys(existing.answers).length > 0;
            
            if (currentHasAnswers && !existingHasAnswers) {
              const index = acc.indexOf(existing);
              acc[index] = current;
            } else if (!currentHasAnswers && existingHasAnswers) {
              // Keep existing with answers
            } else {
              // Both have or don't have answers, keep most recent
              const currentDate = new Date(current.created_at);
              const existingDate = new Date(existing.created_at);
              if (currentDate > existingDate) {
                const index = acc.indexOf(existing);
                acc[index] = current;
              }
            }
          }
        }
        return acc;
      }, []);
      
      console.log('📊 Deduplicated results:', {
        original: testResults.length,
        deduplicated: deduplicatedResults.length,
        removed: testResults.length - deduplicatedResults.length
      });
      
      // Fetch module results for deduplicated test results (limit fields to reduce egress)
      const moduleResultPromises = deduplicatedResults.map(testResult => 
        supabase
          .from('module_results')
          .select('id, module_id, module_name, score, total, scaled_score')
          .eq('test_result_id', testResult.id)
      );
      
      const moduleResultsResponses = await Promise.all(moduleResultPromises);
      
      // Combine deduplicated test results with their module results
      const combinedResults: SavedTestResults[] = deduplicatedResults.map((testResult, index) => ({
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
        
        // First, fetch the latest test_result data to ensure we have the most up-to-date answers
        const { data: latestTestResult, error: fetchError } = await supabase
          .from('test_results')
          .select('answers, is_completed')
          .eq('id', current.testResult.id)
          .single();
        
        if (fetchError) {
          console.error('⚠️ Error fetching latest test result:', fetchError);
        }
        
        let answers = latestTestResult?.answers || current.testResult.answers || null;
        console.log('Loading history review for result:', current.testResult.id);
        console.log('📝 Raw answers from test_result (cached):', current.testResult.answers);
        console.log('📝 Raw answers from test_result (latest):', latestTestResult?.answers);
        console.log('📝 Using answers:', answers);
        console.log('📝 Answers type:', typeof answers);
        
        // Parse answers if it's a string (JSON)
        if (typeof answers === 'string') {
          try {
            answers = JSON.parse(answers);
            console.log('📝 Parsed answers from JSON string');
          } catch (parseError) {
            console.error('⚠️ Error parsing answers JSON:', parseError);
            answers = null;
          }
        }
        
        console.log('📝 Answers after parsing:', answers);
        console.log('📝 Answers keys count:', answers && typeof answers === 'object' ? Object.keys(answers).length : 0);
        
        // If answers is null or empty, try to recover from test_states
        if (!answers || (typeof answers === 'object' && Object.keys(answers).length === 0)) {
          console.log('⚠️ Answers field is empty, attempting recovery from test_states...');
          try {
            const { data: testData } = await supabase
              .from('tests')
              .select('permalink')
              .eq('id', current.testResult.test_id)
              .single();
            
            if (testData?.permalink) {
              const { data: stateData } = await supabase
                .from('test_states')
                .select('state')
                .eq('user_id', current.testResult.user_id || user?.id)
                .eq('test_permalink', testData.permalink)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (stateData?.state?.userAnswers) {
                console.log('✅ Recovered answers from test_states');
                console.log('📝 Recovered answer keys:', Object.keys(stateData.state.userAnswers).slice(0, 10));
                answers = stateData.state.userAnswers;
              } else {
                console.log('⚠️ No answers found in test_states either');
              }
            }
          } catch (recoveryError) {
            console.error('⚠️ Error recovering from test_states:', recoveryError);
          }
        }
        
        console.log('📝 Final answers to use (before question mapping):', answers);
        console.log('📝 Final answers keys:', answers ? Object.keys(answers) : []);
        console.log('📝 Sample answer entries:', answers && typeof answers === 'object' ? Object.entries(answers).slice(0, 5) : []);
        
        // Normalize answers object - ensure it's a proper Record<string, string>
        let normalizedAnswers: Record<string, string> | null = null;
        if (answers && typeof answers === 'object') {
          normalizedAnswers = {};
          for (const [key, value] of Object.entries(answers)) {
            // Handle various value types
            if (value !== null && value !== undefined) {
              normalizedAnswers[key] = String(value);
            }
          }
          console.log('📝 Normalized answers:', normalizedAnswers);
          console.log('📝 Normalized answer keys:', Object.keys(normalizedAnswers));
        }
        
        // Store normalized answers - we'll map them to question IDs after questions are loaded
        setHistoryAnswers(normalizedAnswers);

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
        
        // Map answers to question IDs if needed
        let mappedAnswers = normalizedAnswers;
        if (normalizedAnswers && questions.length > 0) {
          // Check if answer keys match question IDs
          const questionIds = new Set(questions.map(q => q.id));
          const answerKeys = Object.keys(normalizedAnswers);
          const matchingKeys = answerKeys.filter(key => questionIds.has(key));
          
          console.log('🔍 Answer mapping check:', {
            totalQuestions: questions.length,
            totalAnswerKeys: answerKeys.length,
            matchingKeys: matchingKeys.length,
            sampleMatchingKeys: matchingKeys.slice(0, 5),
            sampleNonMatchingKeys: answerKeys.filter(k => !questionIds.has(k)).slice(0, 5),
            sampleQuestionIds: Array.from(questionIds).slice(0, 5)
          });
          
          // If no matches and all keys are UUIDs (old question IDs), try to recover from test_states
          if (matchingKeys.length === 0 && answerKeys.length > 0 && 
              answerKeys.every(key => key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))) {
            console.log('⚠️ All answer keys are UUIDs but none match current questions - attempting recovery from test_states...');
            try {
              const { data: testData } = await supabase
                .from('tests')
                .select('permalink')
                .eq('id', current.testResult.test_id)
                .single();
              
              if (testData?.permalink) {
                const { data: stateData } = await supabase
                  .from('test_states')
                  .select('state')
                  .eq('user_id', current.testResult.user_id || user?.id)
                  .eq('test_permalink', testData.permalink)
                  .order('updated_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                
                if (stateData?.state?.userAnswers) {
                  console.log('✅ Recovered answers from test_states (after detecting old question IDs)');
                  console.log('📝 Recovered answer keys:', Object.keys(stateData.state.userAnswers).slice(0, 10));
                  
                  // Re-normalize the recovered answers
                  const recoveredAnswers = stateData.state.userAnswers;
                  normalizedAnswers = {};
                  for (const [key, value] of Object.entries(recoveredAnswers)) {
                    if (value !== null && value !== undefined) {
                      normalizedAnswers[key] = String(value);
                    }
                  }
                  console.log('📝 Re-normalized recovered answers:', normalizedAnswers);
                  console.log('📝 Re-normalized answer keys:', Object.keys(normalizedAnswers));
                  
                  // Update answerKeys for the mapping logic below
                  const newAnswerKeys = Object.keys(normalizedAnswers);
                  const newMatchingKeys = newAnswerKeys.filter(key => questionIds.has(key));
                  console.log('🔍 After recovery - matching keys:', newMatchingKeys.length);
                  
                  // Update variables for the mapping logic below
                  mappedAnswers = {};
                  for (const key of newMatchingKeys) {
                    mappedAnswers[key] = normalizedAnswers[key];
                  }
                  
                  // If we have matches now, skip the order/number mapping
                  if (newMatchingKeys.length > 0) {
                    console.log('✅ Successfully recovered and mapped', newMatchingKeys.length, 'answers');
                    setHistoryQuestions(questions);
                    setHistoryAnswers(mappedAnswers);
                    setHistoryReviewCache(prev => ({
                      ...prev,
                      [current.testResult.id]: {
                        questions,
                        answers: mappedAnswers,
                        testTitle: testRow.data.title || null,
                        testCategory: testCategory,
                      }
                    }));
                    setIsLoadingHistoryReview(false);
                    return;
                  }
                }
              }
            } catch (recoveryError) {
              console.error('⚠️ Error recovering from test_states:', recoveryError);
            }
          }
          
          // Re-check matching keys after potential recovery
          const finalAnswerKeys = Object.keys(normalizedAnswers);
          const finalMatchingKeys = finalAnswerKeys.filter(key => questionIds.has(key));
          
          // If no direct matches, try to map by question_order or question_number
          if (finalMatchingKeys.length === 0 && finalAnswerKeys.length > 0) {
            console.log('⚠️ No direct ID matches found, attempting to map by order/number...');
            console.log('📝 Sample answer keys that need mapping:', finalAnswerKeys.slice(0, 10));
            console.log('📝 Sample question IDs to match against:', Array.from(questionIds).slice(0, 10));
            
            mappedAnswers = {};
            
            // Create a map of question_order -> question ID and question_number -> question ID
            const orderToId = new Map<number, string>();
            const numberToId = new Map<number, string>();
            const idToOrder = new Map<string, number>();
            const idToNumber = new Map<string, number>();
            
            questions.forEach(q => {
              if (q.question_order !== null && q.question_order !== undefined) {
                orderToId.set(q.question_order, q.id);
                idToOrder.set(q.id, q.question_order);
              }
              if (q.question_number !== null && q.question_number !== undefined) {
                numberToId.set(q.question_number, q.id);
                idToNumber.set(q.id, q.question_number);
              }
            });
            
            // Try to map answers using finalAnswerKeys
            for (const [key, value] of Object.entries(normalizedAnswers)) {
              // Skip if already mapped
              if (finalMatchingKeys.includes(key)) {
                mappedAnswers[key] = value;
                continue;
              }
              // First, check if key is already a valid question ID
              if (questionIds.has(key)) {
                mappedAnswers[key] = value;
                console.log(`✅ Direct match found for question ID: ${key}`);
                continue;
              }
              
              // Try as question_order (number)
              const orderKey = parseInt(key, 10);
              if (!isNaN(orderKey)) {
                if (orderToId.has(orderKey)) {
                  mappedAnswers[orderToId.get(orderKey)!] = value;
                  console.log(`✅ Mapped answer by order: ${key} -> ${orderToId.get(orderKey)}`);
                  continue;
                }
                if (numberToId.has(orderKey)) {
                  mappedAnswers[numberToId.get(orderKey)!] = value;
                  console.log(`✅ Mapped answer by number: ${key} -> ${numberToId.get(orderKey)}`);
                  continue;
                }
              }
              
              // If key is a UUID (question ID from old test version), try to find by matching order/number
              // This handles cases where questions were recreated with new IDs
              if (key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                // This is a UUID - it's likely an old question ID
                // We can't directly map it, but we'll log it for debugging
                console.log(`⚠️ Answer key is a UUID (old question ID?): ${key}, value: ${value}`);
                // Try to find a question with the same order/number by checking if we can match by position
                // This is a fallback - we'll need to rely on test_states recovery for these cases
              } else {
                console.log(`⚠️ Could not map answer key: ${key} (type: ${typeof key})`);
              }
            }
            
            console.log('📝 Mapped answers:', mappedAnswers);
            console.log('📝 Mapped answer keys:', Object.keys(mappedAnswers));
            console.log('📝 Unmapped answer keys:', answerKeys.filter(k => !Object.keys(mappedAnswers).includes(k) && !questionIds.has(k)).slice(0, 10));
          }
        }
        
        setHistoryQuestions(questions);
        setHistoryAnswers(mappedAnswers);
        setHistoryReviewCache(prev => ({
          ...prev,
          [current.testResult.id]: {
            questions,
            answers: mappedAnswers,
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
                    <>
                      {console.log('🔍 Passing to QuestionReview:', {
                        questionsCount: historyQuestions.length,
                        answersCount: historyAnswers ? Object.keys(historyAnswers).length : 0,
                        answersKeys: historyAnswers ? Object.keys(historyAnswers).slice(0, 10) : [],
                        questionIds: historyQuestions.slice(0, 10).map(q => q.id)
                      })}
                      <QuestionReview 
                        questions={historyQuestions} 
                        userAnswers={(historyAnswers || {}) as Record<string, string>} 
                        testCategory={historyTestCategory || 'SAT'}
                      />
                    </>
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
