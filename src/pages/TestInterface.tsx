import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Timer from "@/components/Timer";
import { QuestionData } from "@/components/Question";
import { getTestQuestions } from "@/services/testService";
import TestContainer from "@/components/test/TestContainer";
import TestDialogs from "@/components/test/TestDialogs";
import { ScaledScore } from "@/components/admin/tests/types";
import { useTests } from "@/hooks/useTests";
import ReviewPage from "@/components/test/ReviewPage";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TestInterface = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
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
  
  useEffect(() => {
    if (testId) {
      // Get the current test from the available tests
      const currentTest = tests.find(test => test.id === testId);
      
      if (currentTest) {
        console.log("Found test:", currentTest);
        // In a real app, this would be an API call with the test id
        const { questions: testQuestions, scaledScoring: testScoring } = getTestQuestions(testId);
        
        // If the test has scaled scoring, use that instead of the default
        const finalScaledScoring = currentTest.scaled_scoring && currentTest.scaled_scoring.length > 0 
          ? currentTest.scaled_scoring 
          : testScoring || [];
          
        setQuestions(testQuestions);
        setScaledScoring(finalScaledScoring);
        setTestStartTime(new Date());
      } else {
        // Test not found, redirect to dashboard
        console.error("Test not found:", testId);
        navigate("/dashboard");
      }
    }
  }, [testId, tests, navigate]);

  const testDuration = 1800; // 30 minutes in seconds
  
  const handleSelectOption = (optionId: string) => {
    setUserAnswers({
      ...userAnswers,
      [questions[currentQuestionIndex].id]: optionId
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
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
      const moduleId = `${testId}-${moduleType}`;
      
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
        const selectedOption = question.options.find(option => option.id === userAnswer);
        if (selectedOption && selectedOption.isCorrect) {
          modules[moduleType].correctAnswers++;
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
        // Filter scaled scoring for this module
        const moduleScoring = scaledScoring.filter(s => !s.module_id || s.module_id === module.moduleId);
        
        if (moduleScoring.length > 0) {
          // Find exact match or closest lower score
          const exactMatch = moduleScoring.find(s => s.correct_answers === correctAnswers);
          if (exactMatch) {
            scaledScore = exactMatch.scaled_score;
          } else {
            const sortedScoring = [...moduleScoring].sort((a, b) => a.correct_answers - b.correct_answers);
            
            // Find the closest score brackets
            let lowerScoreBracket = null;
            let upperScoreBracket = null;
            
            for (const bracket of sortedScoring) {
              if (bracket.correct_answers <= correctAnswers) {
                lowerScoreBracket = bracket;
              }
              if (bracket.correct_answers >= correctAnswers && !upperScoreBracket) {
                upperScoreBracket = bracket;
              }
            }
            
            // Interpolate the scaled score
            if (lowerScoreBracket && upperScoreBracket) {
              const lowerCorrect = lowerScoreBracket.correct_answers;
              const upperCorrect = upperScoreBracket.correct_answers;
              const lowerScaled = lowerScoreBracket.scaled_score;
              const upperScaled = upperScoreBracket.scaled_score;
              
              if (upperCorrect !== lowerCorrect) {
                const ratio = (correctAnswers - lowerCorrect) / (upperCorrect - lowerCorrect);
                scaledScore = Math.round(lowerScaled + ratio * (upperScaled - lowerScaled));
              } else {
                scaledScore = lowerScaled;
              }
            } else if (lowerScoreBracket) {
              scaledScore = lowerScoreBracket.scaled_score;
            } else if (upperScoreBracket) {
              scaledScore = upperScoreBracket.scaled_score;
            }
          }
        }
      }
      
      return {
        moduleId: module.moduleId,
        moduleName: module.moduleName,
        score: correctAnswers,
        total: totalQuestions,
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
          test_id: testId || '',
          total_score: correctAnswers,
          total_questions: totalQuestions,
          scaled_score: scaledScore,
          answers: userAnswers,
          time_taken: timeTaken
        })
        .select()
        .single();
      
      if (testError) {
        console.error("Error saving test results:", testError);
        toast({
          title: "Error",
          description: "There was a problem saving your results.",
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
              score: module.score,
              total: module.total,
              scaled_score: module.scaledScore
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
        description: "There was a problem saving your results.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitTest = async () => {
    // Calculate results
    let correctAnswers = 0;
    let totalQuestions = questions.length;
    
    questions.forEach(question => {
      const userAnswer = userAnswers[question.id];
      if (userAnswer) {
        const selectedOption = question.options.find(option => option.id === userAnswer);
        if (selectedOption && selectedOption.isCorrect) {
          correctAnswers++;
        }
      }
    });
    
    // Calculate module scores
    const moduleScores = calculateModuleScores();
    
    // Calculate overall scaled score (if available)
    let overallScaledScore;
    if (scaledScoring && scaledScoring.length > 0) {
      // Filter for overall scores (ones without a module_id)
      const overallScoring = scaledScoring.filter(s => !s.module_id);
      if (overallScoring.length > 0) {
        const exactMatch = overallScoring.find(s => s.correct_answers === correctAnswers);
        if (exactMatch) {
          overallScaledScore = exactMatch.scaled_score;
        } else {
          // Use closest lower score
          const lowerScores = overallScoring
            .filter(s => s.correct_answers <= correctAnswers)
            .sort((a, b) => b.correct_answers - a.correct_answers);
            
          if (lowerScores.length > 0) {
            overallScaledScore = lowerScores[0].scaled_score;
          }
        }
      }
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
        moduleScores: moduleScores
      }
    });
  };

  const handleTimeUp = () => {
    if (timerEnabled) {
      setShowTimeUpDialog(true);
    }
  };

  const handleOpenReviewPage = () => {
    setShowReviewPage(true);
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg">Loading test...</p>
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
                id="timer-mode"
                checked={timerEnabled}
                onCheckedChange={setTimerEnabled}
              />
              <Label htmlFor="timer-mode">Timer</Label>
            </div>
            {timerEnabled && (
              <Timer initialTime={testDuration} onTimeUp={handleTimeUp} />
            )}
          </div>
        </div>
        
        {showReviewPage ? (
          <ReviewPage
            questions={questions}
            userAnswers={userAnswers}
            flaggedQuestions={flaggedQuestions}
            onGoToQuestion={(index) => {
              setCurrentQuestionIndex(index);
              setShowReviewPage(false);
            }}
            onSubmitTest={() => setShowConfirmSubmit(true)}
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
          />
        )}
      </main>
      
      <TestDialogs
        showConfirmSubmit={showConfirmSubmit}
        setShowConfirmSubmit={setShowConfirmSubmit}
        showTimeUpDialog={showTimeUpDialog}
        setShowTimeUpDialog={setShowTimeUpDialog}
        onSubmitTest={handleSubmitTest}
      />
    </div>
  );
};

export default TestInterface;
