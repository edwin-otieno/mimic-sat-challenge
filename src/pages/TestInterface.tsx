import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Timer from "@/components/Timer";
import { QuestionData } from "@/components/Question";
import { getTestQuestions } from "@/services/testService";
import TestContainer from "@/components/test/TestContainer";
import TestDialogs from "@/components/test/TestDialogs";
import { ScaledScore, TestModule } from "@/components/admin/tests/types";
import { useTests } from "@/hooks/useTests";
import ReviewPage from "@/components/test/ReviewPage";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import { QuestionType } from "@/components/admin/questions/types";
import { useTestAutoSave } from '@/hooks/useTestAutoSave';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TestInterface = () => {
  const navigate = useNavigate();
  const { permalink } = useParams<{ permalink: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [scaledScoring, setScaledScoring] = useState<ScaledScore[]>([]);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [crossedOutOptions, setCrossedOutOptions] = useState<Record<string, string[]>>({});
  const [showReviewPage, setShowReviewPage] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [testStartTime, setTestStartTime] = useState<Date>(new Date());
  const { tests } = useTests();
  const [currentTest, setCurrentTest] = useState<any>(null);
  const [currentModuleStartTime, setCurrentModuleStartTime] = useState<Date>(new Date());
  const [currentModuleTimeLeft, setCurrentModuleTimeLeft] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showModuleSelection, setShowModuleSelection] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [showModuleScores, setShowModuleScores] = useState(false);
  const [currentModuleScores, setCurrentModuleScores] = useState<any[]>([]);
  
  const { saveTestState, loadTestState, clearTestState, isRestoring, setIsRestoring } = useTestAutoSave(permalink || '');

  useEffect(() => {
    const loadTest = async () => {
      if (!user) {
        console.log('No user found, returning');
        return;
      }

      // Wait for tests to be loaded
      if (!tests || tests.length === 0) {
        console.log('Tests not yet loaded, waiting...');
        return;
      }

      console.log('Loading test with permalink:', permalink);
      console.log('Available tests:', tests);

      try {
        // Find the test by permalink or ID
        const foundTest = tests.find(test => 
          test.permalink === permalink || test.id === permalink
        );
        
        console.log('Found test:', foundTest);
        
        if (!foundTest) {
          console.error("Test not found:", permalink);
          toast({
            title: "Error",
            description: "Test not found. Please try again.",
            variant: "destructive"
          });
          navigate("/dashboard");
          return;
        }

        setCurrentTest(foundTest);
        console.log('Fetching test questions for test ID:', foundTest.id);
        const testQuestions = await getTestQuestions(foundTest.id);
        console.log('Received test questions:', testQuestions);
        
        if (!testQuestions || !testQuestions.questions || testQuestions.questions.length === 0) {
          console.error('No questions found for test:', foundTest.id);
          toast({
            title: "Error",
            description: "No questions found for this test. Please contact support.",
            variant: "destructive"
          });
          navigate("/dashboard");
          return;
        }

        setQuestions(testQuestions.questions);
        setScaledScoring(foundTest.scaled_scoring || []);
        
        // Initialize the module timer for the first question
        if (testQuestions.questions.length > 0) {
          const firstModuleType = testQuestions.questions[0]?.module_type || 'reading_writing';
          const firstModule = foundTest.modules?.find((m: any) => m.type === firstModuleType);
          const initialTime = (firstModule?.time || 0) * 60; // Convert minutes to seconds
          setCurrentModuleTimeLeft(initialTime);
          setCurrentModuleStartTime(new Date());
        }
      } catch (error) {
        console.error("Error loading test questions:", error);
        toast({
          title: "Error",
          description: "Failed to load test questions. Please try again.",
          variant: "destructive"
        });
        navigate("/dashboard");
      }
    };
    
    loadTest();
  }, [user, permalink, tests, navigate, toast]);

  // Calculate total test duration from modules
  const totalTestDuration = currentTest?.modules?.reduce((total: number, module: TestModule) => 
    total + (module.time || 0), 0) * 60 || 0; // Convert minutes to seconds

  // Helper to get current module time
  const getCurrentModuleTime = () => {
    if (!currentTest || questions.length === 0) return 0;
    const currentModuleType = questions[currentQuestionIndex]?.module_type || 'reading_writing';
    const module = currentTest.modules?.find((m: any) => m.type === currentModuleType);
    return (module?.time || 0) * 60; // Convert minutes to seconds
  };

  // Update module timer when question changes
  useEffect(() => {
    if (questions.length > 0 && currentTest) {
      const currentModuleType = questions[currentQuestionIndex]?.module_type || 'reading_writing';
      const module = currentTest.modules?.find((m: any) => m.type === currentModuleType);
      const newModuleTime = (module?.time || 0) * 60; // Convert minutes to seconds
      
      // Only reset the timer if we're changing modules
      const previousModuleType = currentQuestionIndex > 0 
        ? questions[currentQuestionIndex - 1]?.module_type 
        : null;
      
      if (previousModuleType !== currentModuleType) {
        console.log('Changing module, setting new time:', newModuleTime);
        setCurrentModuleTimeLeft(newModuleTime);
        setCurrentModuleStartTime(new Date());
      }
    }
  }, [currentQuestionIndex, questions, currentTest]);

  // Update module time left
  useEffect(() => {
    if (!timerEnabled || currentModuleTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setCurrentModuleTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerEnabled, currentModuleTimeLeft]);

  const testDuration = 1800; // 30 minutes in seconds
  
  const handleSelectOption = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      const currentModuleType = questions[currentQuestionIndex]?.module_type;
      const nextModuleType = questions[nextIndex]?.module_type;
      
      if (currentModuleType !== nextModuleType) {
        // Module change detected, show scores
        handleModuleCompletion();
      } else {
        setCurrentQuestionIndex(nextIndex);
      }
    } else {
      // Last question of the module
      handleModuleCompletion();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const handleGoToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleToggleFlag = (questionId: string) => {
    const newFlaggedQuestions = new Set(flaggedQuestions);
    if (newFlaggedQuestions.has(questionId)) {
      newFlaggedQuestions.delete(questionId);
    } else {
      newFlaggedQuestions.add(questionId);
    }
    setFlaggedQuestions(newFlaggedQuestions);
  };
  
  const handleToggleCrossOut = (questionId: string, optionId: string) => {
    const currentCrossedOut = crossedOutOptions[questionId] || [];
    let newCrossedOut;
    
    if (currentCrossedOut.includes(optionId)) {
      newCrossedOut = currentCrossedOut.filter(id => id !== optionId);
    } else {
      newCrossedOut = [...currentCrossedOut, optionId];
    }
    
    setCrossedOutOptions({
      ...crossedOutOptions,
      [questionId]: newCrossedOut
    });
  };

  // Calculate module scores
  const calculateModuleScores = () => {
    // Group questions by module type
    const modules: Record<string, {
      moduleId: string,
      moduleName: string,
      questions: QuestionData[],
      correctAnswers: number
    }> = {};
    
    questions.forEach(question => {
      const moduleType = question.module_type || 'reading_writing'; 
      const moduleName = moduleType === 'reading_writing' ? 'Reading & Writing' : 'Math';
      // Use the module type as the ID to match with scaled scoring
      const moduleId = moduleType;
      
      if (!modules[moduleType]) {
        modules[moduleType] = {
          moduleId,
          moduleName,
          questions: [],
          correctAnswers: 0
        };
      }
      
      // Add question to module
      modules[moduleType].questions.push(question);
      
      // Check if answer is correct
      const userAnswer = userAnswers[question.id];
      if (userAnswer) {
        if (question.question_type === QuestionType.TextInput) {
          // For text input questions, check if the answer matches exactly
          if (userAnswer.toLowerCase() === question.correct_answer?.toLowerCase()) {
            modules[moduleType].correctAnswers++;
          }
        } else {
          // For multiple choice questions, check if the selected option is correct
          const selectedOption = question.options?.find(option => option.id === userAnswer);
          if (selectedOption && selectedOption.isCorrect) {
            modules[moduleType].correctAnswers++;
          }
        }
      }
    });
    
    // Convert to array and calculate scaled scores
    return Object.values(modules).map(module => {
      const totalQuestions = module.questions.length;
      const correctAnswers = module.correctAnswers;
      
      // Find the scaled score for this module's correct answers
      let scaledScore;
      if (scaledScoring && scaledScoring.length > 0) {
        // Filter scaled scoring for this specific module
        const moduleScoring = scaledScoring.filter(s => {
          // Match by module_id or module type
          const moduleIdMatch = s.module_id === module.moduleId;
          const moduleTypeMatch = s.module_type === module.moduleId;
          return moduleIdMatch || moduleTypeMatch;
        });
        
        if (moduleScoring.length > 0) {
          // Find exact match for the number of correct answers
          const matchingScore = moduleScoring.find(s => s.correct_answers === correctAnswers);
          
          if (matchingScore) {
            scaledScore = matchingScore.scaled_score;
          } else {
            // If no exact match, find the closest lower score
            const sortedScoring = [...moduleScoring].sort((a, b) => b.correct_answers - a.correct_answers);
            const closestLower = sortedScoring.find(s => s.correct_answers < correctAnswers);
            if (closestLower) {
              scaledScore = closestLower.scaled_score;
            }
          }
        }
      }
      
      return {
        ...module,
        totalQuestions,
        correctAnswers,
        scaledScore
      };
    });
  };

  // Save results to database
  const saveResults = async (
    correctAnswers: number, 
    totalQuestions: number, 
    moduleScores: any[], 
    scaledScore?: number
  ) => {
    if (!user) {
      console.error("User not authenticated, can't save results");
      return;
    }
    
    try {
      const testEndTime = new Date();
      const timeTaken = Math.floor((testEndTime.getTime() - testStartTime.getTime()) / 1000);
      
      // Save test results first
      const { data: testResult, error: testError } = await supabase
        .from('test_results')
        .insert({
          user_id: user.id,
          test_id: currentTest?.id || permalink || '',
          total_score: correctAnswers,
          total_questions: totalQuestions,
          scaled_score: scaledScore,
          answers: userAnswers,
          time_taken: timeTaken,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (testError) {
        console.error("Error saving test results:", testError);
        toast({
          title: "Error",
          description: "There was a problem saving your results. Please contact support.",
          variant: "destructive"
        });
        return;
      }
      
      // Save module results
      if (testResult) {
        const moduleResultsPromises = moduleScores.map(module => {
          return supabase
            .from('module_results')
            .insert({
              test_result_id: testResult.id,
              module_id: module.moduleId,
              module_name: module.moduleName,
              score: module.correctAnswers,
              total: module.totalQuestions,
              scaled_score: module.scaledScore,
              created_at: new Date().toISOString()
            });
        });
        
        // Wait for all module results to be saved
        await Promise.all(moduleResultsPromises);
      }
      
      console.log("Results saved successfully");
    } catch (error) {
      console.error("Error saving results:", error);
      toast({
        title: "Error",
        description: "There was a problem saving your results. Please contact support.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitTest = async () => {
    try {
      // Save state before submission
      await saveTestState({
        currentQuestionIndex,
        userAnswers,
        flaggedQuestions,
        crossedOutOptions,
        testStartTime,
        currentModuleStartTime,
        currentModuleTimeLeft,
      });
      
      // Clear saved state after successful submission
      clearTestState();
      
      // Calculate results
      let correctAnswers = 0;
      let totalQuestions = questions.length;
      
      questions.forEach(question => {
        const userAnswer = userAnswers[question.id];
        if (userAnswer) {
          if (question.question_type === QuestionType.TextInput) {
            if (userAnswer.toLowerCase() === question.correct_answer?.toLowerCase()) {
              correctAnswers++;
            }
          } else {
            const selectedOption = question.options?.find(option => option.id === userAnswer);
            if (selectedOption && selectedOption.isCorrect) {
              correctAnswers++;
            }
          }
        }
      });
      
      // Calculate module scores
      const moduleScores = calculateModuleScores();
      
      // Calculate overall scaled score (if available)
      let overallScaledScore;
      if (moduleScores.length > 0) {
        // Sum the scaled scores of the two modules
        overallScaledScore = moduleScores.reduce((sum, module) => sum + (module.scaledScore || 0), 0);
      }
      
      // Save results to database
      await saveResults(correctAnswers, totalQuestions, moduleScores, overallScaledScore);
      
      // Navigate to results page with score data
      navigate("/results", {
        state: {
          score: correctAnswers,
          total: totalQuestions,
          answers: userAnswers,
          questions: questions,
          scaledScoring: scaledScoring,
          moduleScores: moduleScores.map(module => ({
            moduleId: module.moduleId,
            moduleName: module.moduleName,
            score: module.correctAnswers,
            total: module.totalQuestions,
            correctAnswers: module.correctAnswers,
            totalQuestions: module.totalQuestions,
            scaledScore: module.scaledScore
          })),
          overallScaledScore: overallScaledScore
        }
      });
    } catch (error) {
      console.error("Error submitting test:", error);
      toast({
        title: "Error",
        description: "Failed to submit test. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleTimeUp = () => {
    if (timerEnabled) {
      console.log('Time up for current module');
      setShowTimeUpDialog(true);
    }
  };

  const handleOpenReviewPage = () => {
    setShowReviewPage(true);
  };

  // Add a loading state check
  const isLoading = !currentTest || questions.length === 0;

  // Initialize module timer when test loads
  useEffect(() => {
    if (currentTest && questions.length > 0) {
      const firstModuleType = questions[0]?.module_type || 'reading_writing';
      const firstModule = currentTest.modules?.find((m: any) => m.type === firstModuleType);
      const initialTime = (firstModule?.time || 0) * 60; // Convert minutes to seconds
      
      console.log('Initializing module timer:', {
        moduleType: firstModuleType,
        moduleTime: firstModule?.time,
        initialTime
      });
      
      setCurrentModuleTimeLeft(initialTime);
      setCurrentModuleStartTime(new Date());
    }
  }, [currentTest, questions]);

  // Add new function to handle module selection
  const handleModuleSelection = (moduleType: string) => {
    setSelectedModule(moduleType);
    setShowModuleSelection(false);
    
    // Find the first question of the selected module
    const firstQuestionIndex = questions.findIndex(q => q.module_type === moduleType);
    if (firstQuestionIndex !== -1) {
      setCurrentQuestionIndex(firstQuestionIndex);
      
      // Initialize module timer
      const module = currentTest.modules?.find((m: any) => m.type === moduleType);
      const initialTime = (module?.time || 0) * 60;
      setCurrentModuleTimeLeft(initialTime);
      setCurrentModuleStartTime(new Date());
    }
  };

  // Add function to handle module completion
  const handleModuleCompletion = () => {
    if (!selectedModule) return;
    
    // Calculate scores for the completed module
    const moduleScores = calculateModuleScores();
    setCurrentModuleScores(moduleScores);
    setShowModuleScores(true);
    
    // Mark module as completed
    setCompletedModules(prev => new Set([...prev, selectedModule]));
  };

  // Add function to proceed to next module
  const handleProceedToNextModule = () => {
    setShowModuleScores(false);
    
    // Find the next uncompleted module
    const nextModule = currentTest.modules?.find((m: any) => !completedModules.has(m.type));
    
    if (nextModule) {
      handleModuleSelection(nextModule.type);
    } else {
      // All modules completed, show final results
      handleSubmitTest();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Loading test...</p>
        </div>
      </div>
    );
  }

  // Add the module selection screen to the render logic
  if (showModuleSelection) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Select Module to Start</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {currentTest?.modules?.map((module: TestModule) => (
                  <Button
                    key={module.type}
                    onClick={() => handleModuleSelection(module.type)}
                    className="w-full py-6 text-lg"
                    disabled={completedModules.has(module.type)}
                  >
                    {module.name} ({module.time} minutes)
                    {completedModules.has(module.type) && " - Completed"}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Add the module scores screen
  if (showModuleScores) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Module Results</CardTitle>
            </CardHeader>
            <CardContent>
              {currentModuleScores.map((module) => (
                <div key={module.moduleId} className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{module.moduleName}</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border">
                      <h4 className="text-lg font-medium mb-2">Raw Score</h4>
                      <div className="text-3xl font-bold">
                        {module.correctAnswers} / {module.totalQuestions}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {Math.round((module.correctAnswers / module.totalQuestions) * 100)}%
                      </div>
                    </div>
                    {module.scaledScore !== undefined && (
                      <div className="bg-white rounded-lg p-4 border">
                        <h4 className="text-lg font-medium mb-2">Scaled Score</h4>
                        <div className="text-3xl font-bold">
                          {module.scaledScore}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="mt-6">
                <Button onClick={handleProceedToNextModule} className="w-full">
                  {completedModules.size < (currentTest?.modules?.length || 0) 
                    ? "Proceed to Next Module" 
                    : "View Final Results"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showLogout={false} />
      
      <main className="flex-1 container max-w-4xl mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold">Practice Test</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={timerEnabled}
                onCheckedChange={setTimerEnabled}
              />
              <span className="text-sm">Timer</span>
            </div>
            {timerEnabled && (
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Total: {Math.floor(totalTestDuration / 60)}m
                </div>
                <div className="flex items-center gap-2">
                  <Timer 
                    initialTime={currentModuleTimeLeft} 
                    onTimeUp={handleTimeUp} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Display current module info */}
        {currentTest && questions.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded text-blue-900">
            <div className="text-lg font-semibold text-center">
              {currentTest.modules?.find((m: any) => m.type === questions[currentQuestionIndex]?.module_type)?.name || 'Current Module'}
            </div>
            <div className="text-sm text-center">
              Time: {Math.floor(currentModuleTimeLeft / 60)}m {currentModuleTimeLeft % 60}s remaining
            </div>
          </div>
        )}
        
        {showReviewPage ? (
          <ReviewPage
            questions={questions}
            userAnswers={userAnswers}
            flaggedQuestions={flaggedQuestions}
            onGoToQuestion={handleGoToQuestion}
            onSubmitTest={handleSubmitTest}
            onCancel={() => setShowReviewPage(false)}
          />
        ) : (
          <TestContainer
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            userAnswers={userAnswers}
            onSelectOption={handleSelectOption}
            onPreviousQuestion={handlePreviousQuestion}
            onNextQuestion={handleNextQuestion}
            onConfirmSubmit={() => setShowConfirmSubmit(true)}
            onGoToQuestion={handleGoToQuestion}
            flaggedQuestions={flaggedQuestions}
            onToggleFlag={handleToggleFlag}
            crossedOutOptions={crossedOutOptions}
            onToggleCrossOut={handleToggleCrossOut}
            onOpenReviewPage={handleOpenReviewPage}
            onSaveStatusChange={setIsSaving}
          />
        )}
      </main>
      
      <TestDialogs
        showConfirmSubmit={showConfirmSubmit}
        setShowConfirmSubmit={setShowConfirmSubmit}
        showTimeUpDialog={showTimeUpDialog}
        setShowTimeUpDialog={setShowTimeUpDialog}
        onSubmitTest={handleSubmitTest}
        onTimeUp={() => {
          setShowTimeUpDialog(true);
          handleSubmitTest();
        }}
      />
      <Footer />
    </div>
  );
};

export default TestInterface;
