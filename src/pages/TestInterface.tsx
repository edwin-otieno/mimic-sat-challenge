import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTests, useOptimizedTest } from '@/hooks/useTests';
import { useTestAutoSave } from '@/hooks/useTestAutoSave';
import { useToast } from '@/hooks/use-toast';
import { getTestQuestions } from '@/services/testService';
import { QuestionData } from '@/components/Question';
import { TestModule } from '@/components/admin/tests/types';
import { ScaledScore } from '@/components/admin/tests/types';
import TestContainer from '@/components/test/TestContainer';
import TestNavigation from '@/components/test/TestNavigation';
import QuestionNavigator from '@/components/test/QuestionNavigator';
import Timer from '@/components/Timer';
import ProgressBar from '@/components/ProgressBar';
import TestDialogs from '@/components/test/TestDialogs';
import ReviewPage from '@/components/test/ReviewPage';
import LineReader from '@/components/test/LineReader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, Pause, RotateCcw, Eye, EyeOff, Flag, BookOpen, Calculator, Clock, CheckCircle, XCircle } from 'lucide-react';
import Header from "@/components/Header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { QuestionType } from "@/components/admin/questions/types";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import QuestionReview from '@/components/results/QuestionReview';
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const TestInterface = () => {
  const navigate = useNavigate();
  const { permalink } = useParams<{ permalink: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Debug currentQuestionIndex changes
  useEffect(() => {
    console.log('🔍 currentQuestionIndex changed to:', currentQuestionIndex, 'at:', new Date().toISOString());
  }, [currentQuestionIndex]);
  
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
  
  // Use optimized test loading directly by permalink or id from route
  const { testData, isLoading: testDataLoading, error: testDataError } = useOptimizedTest(permalink || null);
  const [currentModuleStartTime, setCurrentModuleStartTime] = useState<Date>(new Date());
  const [currentModuleTimeLeft, setCurrentModuleTimeLeft] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showModuleSelection, setShowModuleSelection] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [showModuleScores, setShowModuleScores] = useState(false);
  const [currentModuleScores, setCurrentModuleScores] = useState<any[]>([]);
  const [moduleParts, setModuleParts] = useState<{ [moduleType: string]: [QuestionData[], QuestionData[]] }>({});
  const [currentPart, setCurrentPart] = useState<{ [moduleType: string]: 1 | 2 }>({ reading_writing: 1, math: 1 });
  const [showPartTransition, setShowPartTransition] = useState(false);
  const [timerRunning, setTimerRunning] = useState(true);
  const [timerVisible, setTimerVisible] = useState(true);
  const [currentPartTimeLeft, setCurrentPartTimeLeft] = useState<number>(0);
  const [partTimes, setPartTimes] = useState<{ [moduleType: string]: number }>({});
  const [showReference, setShowReference] = useState(false);
  const [showMathReference, setShowMathReference] = useState(false);
  // Track the last saved question for each module/part
  const [lastSavedQuestions, setLastSavedQuestions] = useState<{ [key: string]: number }>({});
  const [crossOutMode, setCrossOutMode] = useState(() => {
    // Persist for the session
    const saved = sessionStorage.getItem('crossOutMode');
    return saved === 'true';
  });
  
  const { saveTestState, loadTestState, clearTestState, isRestoring, setIsRestoring } = useTestAutoSave(permalink || '');

  // Add a flag to track if state was loaded from persistence
  const [stateLoaded, setStateLoaded] = useState(false);
  // Removed isRestoringState and userHasInteracted since auto-save is disabled

  // Timer state persistence
  const saveTimerState = () => {
    const timerState = {
      currentPartTimeLeft,
      timerRunning,
      timerVisible,
      currentPart,
      selectedModule,
      partTimes,
      showModuleSelection,
      completedModules: Array.from(completedModules),
      showModuleScores,
      showPartTransition
    };
    sessionStorage.setItem(`timerState_${permalink}`, JSON.stringify(timerState));
  };

  const saveCompleteTestState = () => {
    const completeState = {
      currentQuestionIndex,
      userAnswers,
      flaggedQuestions: Array.from(flaggedQuestions),
      crossedOutOptions,
      testStartTime: testStartTime.toISOString(),
      currentModuleStartTime: currentModuleStartTime.toISOString(),
      currentModuleTimeLeft,
      currentPartTimeLeft,
      timerRunning,
      timerVisible,
      currentPart,
      selectedModule,
      partTimes,
      showModuleSelection,
      completedModules: Array.from(completedModules),
      showModuleScores,
      showPartTransition,
      lastSavedQuestions
    };
    sessionStorage.setItem(`completeTestState_${permalink}`, JSON.stringify(completeState));
  };

  const clearSessionTestState = () => {
    sessionStorage.removeItem(`completeTestState_${permalink}`);
    sessionStorage.removeItem(`timerState_${permalink}`);
  };

  const loadCompleteTestState = () => {
    const saved = sessionStorage.getItem(`completeTestState_${permalink}`);
    if (saved) {
      try {
        const state = JSON.parse(saved) as any;
        setCurrentQuestionIndex(state.currentQuestionIndex || 0);
        setUserAnswers(state.userAnswers || {});
        setFlaggedQuestions(new Set(state.flaggedQuestions || []));
        setCrossedOutOptions(state.crossedOutOptions || {});
        setTestStartTime(new Date(state.testStartTime || new Date()));
        setCurrentModuleStartTime(new Date(state.currentModuleStartTime || new Date()));
        setCurrentModuleTimeLeft(state.currentModuleTimeLeft || 0);
        setCurrentPartTimeLeft(state.currentPartTimeLeft || 0);
        setTimerRunning(state.timerRunning !== false);
        setTimerVisible(state.timerVisible !== false); // Default to true if not saved
        setCurrentPart(state.currentPart || { reading_writing: 1, math: 1 });
        setSelectedModule(state.selectedModule || null);
        setPartTimes(state.partTimes || {});
        // Always show module selection when resuming a saved test
        setShowModuleSelection(true);
        setCompletedModules(new Set(state.completedModules || []));
        setShowModuleScores(state.showModuleScores || false);
        setShowPartTransition(state.showPartTransition || false);
        setLastSavedQuestions(state.lastSavedQuestions || {});
        return true;
      } catch (error) {
        console.error('Error loading complete test state:', error);
      }
    }
    return false;
  };

  const loadTimerState = () => {
    const saved = sessionStorage.getItem(`timerState_${permalink}`);
    if (saved) {
      try {
        const timerState = JSON.parse(saved);
        setCurrentPartTimeLeft(timerState.currentPartTimeLeft || 0);
        setTimerRunning(timerState.timerRunning !== false); // Default to true if not saved
        setTimerVisible(timerState.timerVisible !== false); // Default to true if not saved
        setCurrentPart(timerState.currentPart || { reading_writing: 1, math: 1 });
        setSelectedModule(timerState.selectedModule || null);
        setPartTimes(timerState.partTimes || {});
        // Always show module selection when resuming a saved test
        setShowModuleSelection(true);
        setCompletedModules(new Set(timerState.completedModules || []));
        setShowModuleScores(timerState.showModuleScores || false);
        setShowPartTransition(timerState.showPartTransition || false);
        return true;
      } catch (error) {
        console.error('Error loading timer state:', error);
      }
    }
    return false;
  };

  // Load timer and test state on component mount
  useEffect(() => {
    if (!permalink || stateLoaded) return; // Prevent multiple loads
    (async () => {
      try {
        // Try to load from DB first with timeout
        const loadPromise = loadTestState();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000) // 5 second timeout
        );
        
        let saved: any = null;
        try {
          saved = await Promise.race([loadPromise, timeoutPromise]);
        } catch (_) {
          saved = null;
        }
        
        if (saved && typeof saved === 'object') {
          console.log('🔍 Loading saved state from database, setting currentQuestionIndex to:', saved.currentQuestionIndex);
          setCurrentQuestionIndex(saved.currentQuestionIndex);
          setUserAnswers(saved.userAnswers);
          setFlaggedQuestions(saved.flaggedQuestions);
          setCrossedOutOptions(saved.crossedOutOptions);
          setTestStartTime(new Date(saved.testStartTime));
          setCurrentModuleStartTime(new Date(saved.currentModuleStartTime));
          setCurrentModuleTimeLeft(saved.currentModuleTimeLeft);
          setCurrentPartTimeLeft(saved.currentPartTimeLeft);
          setTimerRunning(saved.timerRunning);
          setTimerVisible(saved.timerVisible !== false); // Default to true if not saved
          setCurrentPart(saved.currentPart);
          setSelectedModule(saved.selectedModule);
          setPartTimes(saved.partTimes);
          // Always show module selection when resuming a saved test
          setShowModuleSelection(true);
          setCompletedModules(saved.completedModules);
          setShowModuleScores(saved.showModuleScores);
          setShowPartTransition(saved.showPartTransition);
          setLastSavedQuestions(saved.lastSavedQuestions || {});
          setStateLoaded(true);
          
          return;
        }
        
        // Check for sessionStorage backup (created during beforeunload)
        const sessionBackup = sessionStorage.getItem(`test_state_${permalink}`);
        if (sessionBackup) {
          try {
            const saved = JSON.parse(sessionBackup);
            console.log('🔍 Loading saved state from sessionStorage backup, setting currentQuestionIndex to:', saved.currentQuestionIndex);
            setCurrentQuestionIndex(saved.currentQuestionIndex);
            setUserAnswers(saved.userAnswers);
            setFlaggedQuestions(new Set(saved.flaggedQuestions));
            setCrossedOutOptions(saved.crossedOutOptions);
            setTestStartTime(new Date(saved.testStartTime));
            setCurrentModuleStartTime(new Date(saved.currentModuleStartTime));
            setCurrentModuleTimeLeft(saved.currentModuleTimeLeft);
            setCurrentPartTimeLeft(saved.currentPartTimeLeft);
            setTimerRunning(saved.timerRunning);
            setTimerVisible(saved.timerVisible !== false);
            setCurrentPart(saved.currentPart);
            setSelectedModule(saved.selectedModule);
            setPartTimes(saved.partTimes);
            setShowModuleSelection(true);
            setCompletedModules(new Set(saved.completedModules));
            setShowModuleScores(saved.showModuleScores);
            setShowPartTransition(saved.showPartTransition);
            setLastSavedQuestions(saved.lastSavedQuestions || {});
            setStateLoaded(true);
            
            // Clear the sessionStorage backup after loading
            sessionStorage.removeItem(`test_state_${permalink}`);
            return;
          } catch (error) {
            console.error('Error parsing sessionStorage backup:', error);
            sessionStorage.removeItem(`test_state_${permalink}`);
          }
        }
        // Fallback to complete sessionStorage state
        const completeStateLoaded = loadCompleteTestState();
        if (!completeStateLoaded) {
          // Fallback to timer-only state if complete state not available
          const timerStateLoaded = loadTimerState();
          setStateLoaded(timerStateLoaded);
        } else {
          setStateLoaded(true);
        }
      } catch (error) {
        console.error('Error loading test state (falling back to sessionStorage):', error);
        // Fallback to complete sessionStorage state on error
        const completeStateLoaded = loadCompleteTestState();
        if (!completeStateLoaded) {
          // Fallback to timer-only state if complete state not available
          const timerStateLoaded = loadTimerState();
          setStateLoaded(timerStateLoaded);
        } else {
          setStateLoaded(true);
        }
      }
    })();
  }, [permalink, stateLoaded, loadTestState]);

  useEffect(() => {
    sessionStorage.setItem('crossOutMode', crossOutMode ? 'true' : 'false');
  }, [crossOutMode]);

  // Auto-save complete test state to sessionStorage
  useEffect(() => {
    if (stateLoaded && permalink) {
      saveCompleteTestState();
    }
  }, [
    currentQuestionIndex,
    userAnswers,
    flaggedQuestions,
    crossedOutOptions,
    currentModuleTimeLeft,
    currentPartTimeLeft,
    timerRunning,
    timerVisible,
    currentPart,
    selectedModule,
    partTimes,
    showModuleSelection,
    completedModules,
    showModuleScores,
    showPartTransition,
    stateLoaded,
    permalink
  ]);

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

  // Helper to get current module and part questions
  const getCurrentModuleType = () => questions[currentQuestionIndex]?.module_type || 'reading_writing';
  const getCurrentPartQuestions = () => {
    const moduleType = selectedModule || getCurrentModuleType();
    const part = currentPart[moduleType] || 1;
    return moduleParts[moduleType]?.[part - 1] || [];
  };

  // Update navigation logic
  const handleNextQuestion = () => {
    const moduleType = selectedModule || getCurrentModuleType();
    const part = currentPart[moduleType] || 1;
    const partQuestions = moduleParts[moduleType]?.[part - 1] || [];
    const partStartIndex = questions.findIndex(q => q.id === partQuestions[0]?.id);
    const partEndIndex = partStartIndex + partQuestions.length - 1;

    if (currentQuestionIndex < partEndIndex) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (part === 1) {
      // End of Part 1, prompt for Part 2
      setShowPartTransition(true);
    } else {
      // End of Part 2, complete module as before
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
          // For text input questions, check if the answer matches any correct answer (split by ';')
          if (
            question.correct_answer?.split(';')
              .map(a => a.trim().toLowerCase())
              .some(correctAnswer => userAnswer.trim().toLowerCase() === correctAnswer)
          ) {
            modules[moduleType].correctAnswers++;
          }
        } else {
          // For multiple choice questions, check if the selected option is correct
          const selectedOption = question.options?.find(option => option.id === userAnswer);
          if (selectedOption && selectedOption.is_correct) {
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
    console.log('handleSubmitTest called');
    try {
      console.log('Saving test state...');
      // Try to save state before submission, but don't block on it
      try {
        await saveTestState({
          currentQuestionIndex,
          userAnswers,
          flaggedQuestions,
          crossedOutOptions,
          testStartTime,
          currentModuleStartTime,
          currentModuleTimeLeft,
          currentPartTimeLeft,
          timerRunning,
          timerVisible,
          currentPart,
          selectedModule,
          partTimes,
          showModuleSelection,
          completedModules,
          showModuleScores,
          showPartTransition,
        });
        console.log('State saved successfully');
      } catch (saveError) {
        console.warn('State saving failed, continuing with submission:', saveError);
        // Continue with submission even if state saving fails
      }
      
      console.log('Clearing test state...');
      // Clear saved state after successful submission
      try {
        await clearTestState();
        console.log('Test state cleared successfully');
      } catch (clearError) {
        console.warn('Failed to clear test state:', clearError);
        // Continue even if clearing fails
      }
      
      console.log('Calculating results...');
      // Calculate results
      let correctAnswers = 0;
      let totalQuestions = questions.length;
      
      questions.forEach(question => {
        const userAnswer = userAnswers[question.id];
        if (userAnswer) {
          if (question.question_type === QuestionType.TextInput) {
            // For text input questions, check if the answer matches any correct answer (split by ';')
            if (
              question.correct_answer?.split(';')
                .map(a => a.trim().toLowerCase())
                .some(correctAnswer => userAnswer.trim().toLowerCase() === correctAnswer)
            ) {
              correctAnswers++;
            }
          } else {
            const selectedOption = question.options?.find(option => option.id === userAnswer);
            if (selectedOption && selectedOption.is_correct) {
              correctAnswers++;
            }
          }
        }
      });
      
      console.log('Calculating module scores...');
      // Calculate module scores
      const moduleScores = calculateModuleScores();
      
      // Calculate overall scaled score (if available)
      let overallScaledScore;
      if (moduleScores.length > 0) {
        // Sum the scaled scores of the two modules
        overallScaledScore = moduleScores.reduce((sum, module) => sum + (module.scaledScore || 0), 0);
      }
      
      console.log('Saving results to database...');
      // Save results to database
      await saveResults(correctAnswers, totalQuestions, moduleScores, overallScaledScore);
      
      console.log('Navigating to results page...');
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
      console.log('Navigation completed');
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
      // Don't automatically submit - just show a notification
      toast({
        title: "Time's up!",
        description: "You can continue working on the test, but the timer has expired.",
        duration: 5000,
      });
    }
  };

  const handleOpenReviewPage = () => {
    setShowReviewPage(true);
  };

  // Add a loading state check
  const isLoading = !currentTest || questions.length === 0 || !stateLoaded;
  
  // Initialize module timer when test loads
  useEffect(() => {
    if (currentTest && questions.length > 0) {
      const firstModuleType = questions[0]?.module_type || 'reading_writing';
      const firstModule = currentTest.modules?.find((m: any) => m.type === firstModuleType);
      const initialTime = (firstModule?.time || 0) * 60; // Convert minutes to seconds
      
      setCurrentModuleTimeLeft(initialTime);
      setCurrentModuleStartTime(new Date());
    }
  }, [currentTest, questions]);

  // Add new function to handle module selection
  const handleModuleSelection = (moduleType: string, partNumber: number = 1) => {
    setSelectedModule(moduleType);
    setShowModuleSelection(false);
    setShowModuleScores(false); // Ensure we go to test questions, not module results
    
    // Set the current part
    setCurrentPart(prev => ({ ...prev, [moduleType]: partNumber as 1 | 2 }));
    
    // Find the last saved question for this module/part
    const key = `${moduleType}-part-${partNumber}`;
    const lastSavedQuestionIndex = lastSavedQuestions[key];
    
    const partQuestions = moduleParts[moduleType]?.[partNumber - 1] || [];
    if (partQuestions.length > 0) {
      const partStartIndex = questions.findIndex(q => q.id === partQuestions[0].id);
      const partEndIndex = partStartIndex + partQuestions.length - 1;
      
      if (lastSavedQuestionIndex !== undefined && 
          lastSavedQuestionIndex >= partStartIndex && 
          lastSavedQuestionIndex <= partEndIndex) {
        // Use the last saved question for this module/part
        setCurrentQuestionIndex(lastSavedQuestionIndex);
        console.log(`Resuming ${moduleType} Part ${partNumber} from saved question:`, lastSavedQuestionIndex);
      } else {
        // Start from the first question of the part
        setCurrentQuestionIndex(partStartIndex);
        console.log(`Starting ${moduleType} Part ${partNumber} from first question:`, partStartIndex);
      }
    } else {
      // Fallback to first question of the module
      const firstQuestionIndex = questions.findIndex(q => q.module_type === moduleType);
      if (firstQuestionIndex !== -1) {
        setCurrentQuestionIndex(firstQuestionIndex);
      }
    }
    
    setCurrentPartTimeLeft(partTimes[moduleType] || 0);
    setTimerRunning(true);
  };

  // Add function to handle module completion
  const handleModuleCompletion = () => {
    if (!selectedModule) return;
    
    // Calculate scores for the completed module
    const moduleScores = calculateModuleScores();
    setCurrentModuleScores(moduleScores);
    setShowModuleScores(true);
    
    // Only mark module as completed if both parts have at least one attempted answer
    const part1Questions = moduleParts[selectedModule]?.[0] || [];
    const part2Questions = moduleParts[selectedModule]?.[1] || [];
    const attemptedInPart = (qs: QuestionData[]) => qs.some(q => !!userAnswers[q.id]);
    const hasAttemptedPart1 = attemptedInPart(part1Questions);
    const hasAttemptedPart2 = attemptedInPart(part2Questions);
    
    if (hasAttemptedPart1 && hasAttemptedPart2) {
      setCompletedModules(prev => new Set([...prev, selectedModule]));
    }
  };

  // Add function to proceed to next module
  const handleProceedToNextModule = () => {
    console.log('handleProceedToNextModule called');
    console.log('completedModules:', completedModules);
    console.log('currentTest.modules:', currentTest?.modules);
    console.log('completedModules.size:', completedModules.size);
    console.log('currentTest?.modules?.length:', currentTest?.modules?.length);
    
    setShowModuleScores(false);
    
    // Find the next uncompleted module
    const nextModule = currentTest.modules?.find((m: any) => !completedModules.has(m.type));
    console.log('nextModule:', nextModule);
    
    if (nextModule) {
      console.log('Proceeding to next module:', nextModule.type);
      handleModuleSelection(nextModule.type, 1); // Always start with Part 1
    } else {
      // All modules completed, show final results
      console.log('All modules completed, calling handleSubmitTest');
      handleSubmitTest();
    }
  };

  // Modify the TestContainer props to conditionally show submit button
  const showSubmitButton = completedModules.size === (currentTest?.modules?.length || 0);

  const handleProceedToPart2 = () => {
    const moduleType = selectedModule || getCurrentModuleType();
    setCurrentPart(prev => ({ ...prev, [moduleType]: 2 }));
    
    // Find the last saved question for Part 2 of this module
    const key = `${moduleType}-part-2`;
    const lastSavedQuestionIndex = lastSavedQuestions[key];
    
    const part2Questions = moduleParts[moduleType]?.[1] || [];
    if (part2Questions.length > 0) {
      const partStartIndex = questions.findIndex(q => q.id === part2Questions[0].id);
      const partEndIndex = partStartIndex + part2Questions.length - 1;
      
      if (lastSavedQuestionIndex !== undefined && 
          lastSavedQuestionIndex >= partStartIndex && 
          lastSavedQuestionIndex <= partEndIndex) {
        // Use the last saved question for Part 2
        setCurrentQuestionIndex(lastSavedQuestionIndex);
        console.log(`Resuming ${moduleType} Part 2 from saved question:`, lastSavedQuestionIndex);
      } else {
        // Start from the first question of Part 2
        setCurrentQuestionIndex(partStartIndex);
        console.log(`Starting ${moduleType} Part 2 from first question:`, partStartIndex);
      }
    }
    setCurrentPartTimeLeft(partTimes[moduleType] || 0);
    setTimerRunning(true);
    setShowPartTransition(false);
  };

  // Timer countdown logic for currentPartTimeLeft
  useEffect(() => {
    if (!timerRunning || currentPartTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setCurrentPartTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timerRunning, currentPartTimeLeft]);

  // Optimized test loading effect
  useEffect(() => {
    if (!user) {
      console.log('No user found, returning');
      return;
    }


    if (testDataLoading) {
      console.log('Test data is loading...');
      return;
    }

    if (testDataError) {
      console.error('Error loading test data:', testDataError);
      toast({
        title: "Error",
        description: "Failed to load test. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (!testData) {
      console.log('No test data available yet');
      return;
    }

    console.log('Setting up test with optimized data');
    console.log('Raw modules data:', testData.test.modules);
    
    // Parse modules first before using them
    let modules = testData.test.modules;
    
    // Parse modules if it's a string
    if (typeof modules === 'string') {
      try {
        modules = JSON.parse(modules);
      } catch (error) {
        console.error('Error parsing modules:', error);
        modules = [];
      }
    }
    
    // Ensure modules is an array
    if (!Array.isArray(modules)) {
      console.warn('Modules is not an array:', modules);
      modules = [];
    }
    
    console.log('Parsed modules:', modules);
    
    // Ensure modules are properly parsed when setting currentTest
    const currentTestWithParsedModules = {
      ...testData.test,
      modules: modules // Use the parsed modules variable
    };
    setCurrentTest(currentTestWithParsedModules);
    setQuestions(testData.questions);
    setScaledScoring(testData.scaledScoring);
    
    console.log('Questions set:', testData.questions.length);
    console.log('Scaled scoring set:', testData.scaledScoring.length);
    
    // Split each module's questions into two parts
    const grouped: { [moduleType: string]: QuestionData[] } = { reading_writing: [], math: [] };
    testData.questions.forEach(q => {
      if (q.module_type === 'math') grouped.math.push(q);
      else grouped.reading_writing.push(q);
    });
    const parts: { [moduleType: string]: [QuestionData[], QuestionData[]] } = {};
    Object.entries(grouped).forEach(([moduleType, qs]) => {
      const half = Math.ceil(qs.length / 2);
      parts[moduleType] = [qs.slice(0, half), qs.slice(half)];
    });
    setModuleParts(parts);
    
    console.log('Module parts set:', Object.keys(parts));
    
    // Only set default values if no state was loaded from persistence
    if (!stateLoaded) {
      setCurrentPart({ reading_writing: 1, math: 1 });
      console.log('Current part set to defaults');
    } else {
      console.log('State was loaded, ensuring proper module selection');
    }
    
    // Set per-part time (half the module time, rounded down)
    const partTimes: { [moduleType: string]: number } = {};
    
    if (modules.length > 0) {
      modules.forEach((m: any) => {
        partTimes[m.type] = Math.floor((m.time || 0) * 60 / 2); // seconds
      });
    }
    
    // Only set partTimes if no state was loaded from persistence
    if (!stateLoaded) {
      setPartTimes(partTimes);
      console.log('Part times set:', partTimes);
    }
    
    // Initialize the module timer for the first question (only if no state was loaded)
    if (testData.questions.length > 0 && !stateLoaded) {
      const firstModuleType = testData.questions[0]?.module_type || 'reading_writing';
      const firstModule = modules?.find((m: any) => m.type === firstModuleType);
      const initialTime = (firstModule?.time || 0) * 60; // Convert minutes to seconds
      setCurrentModuleTimeLeft(initialTime);
      setCurrentModuleStartTime(new Date());
      console.log('Module timer initialized:', initialTime);
    }
    
    console.log('Test loading completed successfully');
    
    // Ensure stateLoaded is set to true after successful loading
    if (!stateLoaded) {
      setStateLoaded(true);
      console.log('State loaded set to true');
    }
    
  }, [user, testData, testDataLoading, testDataError, stateLoaded, toast]);

  const [showSaveExitDialog, setShowSaveExitDialog] = useState(false);

  // Auto-save functionality - save every 5 minutes
  useEffect(() => {
    if (!user || !permalink || !stateLoaded) return;

    const autoSaveInterval = setInterval(async () => {
      try {
        console.log('Auto-saving test state...');
        setIsAutoSaving(true);
        const currentModuleType = selectedModule || getCurrentModuleType();
        const currentPartNumber = currentPart[currentModuleType] || 1;
        const key = `${currentModuleType}-part-${currentPartNumber}`;
        const updatedLastSavedQuestions = {
          ...lastSavedQuestions,
          [key]: currentQuestionIndex
        };
        setLastSavedQuestions(updatedLastSavedQuestions);

        await saveTestState({
          currentQuestionIndex,
          userAnswers,
          flaggedQuestions,
          crossedOutOptions,
          testStartTime,
          currentModuleStartTime,
          currentModuleTimeLeft,
          currentPartTimeLeft,
          timerRunning,
          timerVisible,
          currentPart,
          selectedModule,
          partTimes,
          showModuleSelection,
          completedModules,
          showModuleScores,
          showPartTransition,
          lastSavedQuestions: updatedLastSavedQuestions,
        });
        console.log('Auto-save completed successfully');
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Don't show toast for auto-save failures to avoid interrupting the user
      } finally {
        setIsAutoSaving(false);
      }
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    return () => clearInterval(autoSaveInterval);
  }, [user, permalink, stateLoaded, currentQuestionIndex, userAnswers, flaggedQuestions, crossedOutOptions, testStartTime, currentModuleStartTime, currentModuleTimeLeft, currentPartTimeLeft, timerRunning, timerVisible, currentPart, selectedModule, partTimes, showModuleSelection, completedModules, showModuleScores, showPartTransition, lastSavedQuestions, saveTestState]);

  // Save state when answers change (debounced)
  useEffect(() => {
    if (!user || !permalink || !stateLoaded) return;

    const saveTimeout = setTimeout(async () => {
      try {
        console.log('Saving state due to answer changes...');
        setIsAutoSaving(true);
        const currentModuleType = selectedModule || getCurrentModuleType();
        const currentPartNumber = currentPart[currentModuleType] || 1;
        const key = `${currentModuleType}-part-${currentPartNumber}`;
        const updatedLastSavedQuestions = {
          ...lastSavedQuestions,
          [key]: currentQuestionIndex
        };
        setLastSavedQuestions(updatedLastSavedQuestions);

        await saveTestState({
          currentQuestionIndex,
          userAnswers,
          flaggedQuestions,
          crossedOutOptions,
          testStartTime,
          currentModuleStartTime,
          currentModuleTimeLeft,
          currentPartTimeLeft,
          timerRunning,
          timerVisible,
          currentPart,
          selectedModule,
          partTimes,
          showModuleSelection,
          completedModules,
          showModuleScores,
          showPartTransition,
          lastSavedQuestions: updatedLastSavedQuestions,
        });
        console.log('Answer change save completed successfully');
      } catch (error) {
        console.error('Answer change save failed:', error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 2000); // Save 2 seconds after last change

    return () => clearTimeout(saveTimeout);
  }, [userAnswers, currentQuestionIndex, flaggedQuestions, crossedOutOptions]);

  // Save state when browser is about to close
  useEffect(() => {
    if (!user || !permalink || !stateLoaded) return;

    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      try {
        console.log('Browser closing, saving state...');
        const currentModuleType = selectedModule || getCurrentModuleType();
        const currentPartNumber = currentPart[currentModuleType] || 1;
        const key = `${currentModuleType}-part-${currentPartNumber}`;
        const updatedLastSavedQuestions = {
          ...lastSavedQuestions,
          [key]: currentQuestionIndex
        };

        // Use synchronous storage for beforeunload
        const stateToSave = {
          currentQuestionIndex,
          userAnswers,
          flaggedQuestions: Array.from(flaggedQuestions),
          crossedOutOptions,
          testStartTime: testStartTime.toISOString(),
          currentModuleStartTime: currentModuleStartTime.toISOString(),
          currentModuleTimeLeft,
          currentPartTimeLeft,
          timerRunning,
          timerVisible,
          currentPart,
          selectedModule,
          partTimes,
          showModuleSelection,
          completedModules: Array.from(completedModules),
          showModuleScores,
          showPartTransition,
          lastSavedQuestions: updatedLastSavedQuestions,
        };

        // Save to sessionStorage as backup
        sessionStorage.setItem(`test_state_${permalink}`, JSON.stringify(stateToSave));
        
        // Try to save to database (may not complete due to page unload)
        saveTestState({
          currentQuestionIndex,
          userAnswers,
          flaggedQuestions,
          crossedOutOptions,
          testStartTime,
          currentModuleStartTime,
          currentPartTimeLeft,
          timerRunning,
          timerVisible,
          currentPart,
          selectedModule,
          partTimes,
          showModuleSelection,
          completedModules,
          showModuleScores,
          showPartTransition,
          lastSavedQuestions: updatedLastSavedQuestions,
        }).catch(error => {
          console.error('Failed to save on beforeunload:', error);
        });
      } catch (error) {
        console.error('Error in beforeunload handler:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, permalink, stateLoaded, currentQuestionIndex, userAnswers, flaggedQuestions, crossedOutOptions, testStartTime, currentModuleStartTime, currentModuleTimeLeft, currentPartTimeLeft, timerRunning, timerVisible, currentPart, selectedModule, partTimes, showModuleSelection, completedModules, showModuleScores, showPartTransition, lastSavedQuestions, saveTestState]);

  // Add function to handle Save & Exit
  const handleSaveAndExit = async () => {
    setIsSaving(true);
    try {
      console.log('Saving test state before exit...');
      // Update the last saved question for the current module/part
      const currentModuleType = selectedModule || getCurrentModuleType();
      const currentPartNumber = currentPart[currentModuleType] || 1;
      const key = `${currentModuleType}-part-${currentPartNumber}`;
      const updatedLastSavedQuestions = {
        ...lastSavedQuestions,
        [key]: currentQuestionIndex
      };
      setLastSavedQuestions(updatedLastSavedQuestions);

      await saveTestState({
        currentQuestionIndex,
        userAnswers,
        flaggedQuestions,
        crossedOutOptions,
        testStartTime,
        currentModuleStartTime,
        currentModuleTimeLeft,
        currentPartTimeLeft,
        timerRunning,
        timerVisible,
        currentPart,
        selectedModule,
        partTimes,
        showModuleSelection,
        completedModules,
        showModuleScores,
        showPartTransition,
        lastSavedQuestions: updatedLastSavedQuestions,
      });
      console.log('Test state saved successfully');
      
      toast({
        title: "Test Saved",
        description: "Your progress has been saved. You can resume the test later.",
        duration: 3000,
      });
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving test state:', error);
      toast({
        title: "Error",
        description: "Failed to save your progress. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      setShowSaveExitDialog(false);
    }
  };

  const handleSaveExitClick = async () => {
    setShowSaveExitDialog(true);
  };

  // Show loading state for optimized test loading (do not block when we already restored state)
  if ((testDataLoading || !permalink) && !stateLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Loading test data...</p>
          {testDataError && (
            <p className="text-red-500 mt-2">Error: {String(testDataError)}</p>
          )}
        </div>
      </div>
    );
  }

  // Add the module selection screen to the render logic
  if (showModuleSelection) {
    // Generate part information for each module
    const getPartInfo = (moduleType: string) => {
      const module = currentTest?.modules?.find((m: any) => m.type === moduleType);
      const parts = moduleParts[moduleType];
      const partTimes = module ? Math.floor((module.time || 0) / 2) : 0; // Half the module time in minutes
      
      if (!parts || parts.length < 1) {
        return [{
          partNumber: 1,
          questionCount: 0,
          timeMinutes: module?.time || 0,
          moduleType,
          moduleName: module?.name || moduleType
        }];
      }
      
      return parts.map((partQuestions, index) => ({
        partNumber: index + 1,
        questionCount: partQuestions.length,
        timeMinutes: partTimes,
        moduleType,
        moduleName: module?.name || moduleType
      }));
    };

    // Check if there's saved progress
    const hasSavedProgress = Object.keys(userAnswers).length > 0;
    
    // Find the module/part with the most recent progress
    let savedModuleType = selectedModule;
    let savedPart = savedModuleType ? currentPart[savedModuleType] : null;
    
    // If we have saved progress but no selected module, find the module with the most answers
    if (hasSavedProgress && !savedModuleType) {
      let maxAnswers = 0;
      currentTest?.modules?.forEach((module: TestModule) => {
        const moduleQuestions = questions.filter(q => q.module_type === module.type);
        const answeredQuestions = moduleQuestions.filter(q => userAnswers[q.id]);
        if (answeredQuestions.length > maxAnswers) {
          maxAnswers = answeredQuestions.length;
          savedModuleType = module.type;
          // Find which part has the most answers
          const parts = moduleParts[module.type];
          if (parts) {
            const part1Answers = parts[0]?.filter(q => userAnswers[q.id]).length || 0;
            const part2Answers = parts[1]?.filter(q => userAnswers[q.id]).length || 0;
            savedPart = part1Answers >= part2Answers ? 1 : 2;
          }
        }
      });
    }
    
    // Get the module name for display
    const getModuleDisplayName = (moduleType: string) => {
      const module = currentTest?.modules?.find((m: any) => m.type === moduleType);
      return module?.name || moduleType;
    };

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
          {hasSavedProgress && (
            <Alert className="mb-6">
              <AlertDescription>
                <strong>Saved Progress Detected!</strong> You have saved progress from a previous session. 
                {savedModuleType && savedPart && (
                  <span> You were working on <strong>{getModuleDisplayName(savedModuleType)} Part {savedPart}</strong>. </span>
                )}
                Your answers and progress are preserved. You can continue with the same module/part or start a different one.
              </AlertDescription>
              {savedModuleType && savedPart && (
                <div className="mt-3">
                  <Button 
                    onClick={() => {
                      // For continuing previous session, use the last saved question for this module/part
                      setSelectedModule(savedModuleType);
                      setShowModuleSelection(false);
                      setCurrentPart(prev => ({ ...prev, [savedModuleType]: savedPart as 1 | 2 }));
                      
                      // Find the last saved question for this module/part
                      const key = `${savedModuleType}-part-${savedPart}`;
                      const lastSavedQuestionIndex = lastSavedQuestions[key];
                      
                      const partQuestions = moduleParts[savedModuleType]?.[savedPart - 1] || [];
                      if (partQuestions.length > 0) {
                        const partStartIndex = questions.findIndex(q => q.id === partQuestions[0].id);
                        const partEndIndex = partStartIndex + partQuestions.length - 1;
                        
                        if (lastSavedQuestionIndex !== undefined && 
                            lastSavedQuestionIndex >= partStartIndex && 
                            lastSavedQuestionIndex <= partEndIndex) {
                          // Use the last saved question
                          setCurrentQuestionIndex(lastSavedQuestionIndex);
                          console.log('Continuing from last saved question:', lastSavedQuestionIndex);
                        } else {
                          // Start from the first question of the part
                          setCurrentQuestionIndex(partStartIndex);
                          console.log('Starting from first question of part:', partStartIndex);
                        }
                      }
                      
                      setCurrentPartTimeLeft(partTimes[savedModuleType] || 0);
                      setTimerRunning(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Continue Previous Session
                  </Button>
                </div>
              )}
            </Alert>
          )}
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Select Module Part to Start</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {currentTest?.modules?.map((module: TestModule) => {
                  const partInfo = getPartInfo(module.type);
                  const isModuleCompleted = completedModules.has(module.type);
                  
                  // Check if there are any answered questions in this module
                  const moduleQuestions = questions.filter(q => q.module_type === module.type);
                  const answeredQuestionsInModule = moduleQuestions.filter(q => userAnswers[q.id]);
                  const hasProgressInModule = answeredQuestionsInModule.length > 0;
                  
                  return (
                    <div key={module.type} className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
                        {module.name} Module
                        {isModuleCompleted && <span className="ml-2 text-green-600">✓ Completed</span>}
                        {hasProgressInModule && !isModuleCompleted && (
                          <span className="ml-2 text-blue-600">💾 Has Saved Progress</span>
                        )}
                      </h3>
                      <div className="grid gap-3">
                        {partInfo.map((part) => {
                          const partQuestions = moduleParts[module.type]?.[part.partNumber - 1] || [];
                          const answeredQuestions = partQuestions.filter(q => userAnswers[q.id]).length;
                          const totalQuestions = partQuestions.length;
                          const isSavedPart = answeredQuestions > 0;
                          
                          return (
                            <Button
                              key={`${module.type}-part-${part.partNumber}`}
                              onClick={() => handleModuleSelection(module.type, part.partNumber)}
                              className={`w-full py-4 text-left justify-start whitespace-normal break-words ${
                                isSavedPart 
                                  ? 'bg-green-600 hover:bg-green-700 focus:bg-green-800' 
                                  : 'bg-blue-600 hover:bg-blue-700 focus:bg-blue-800'
                              }`}
                              disabled={isModuleCompleted}
                              variant={isModuleCompleted ? "outline" : "default"}
                            >
                              <div className="text-white w-full">
                                <div className="font-medium">
                                  {part.moduleName} Part {part.partNumber}: {part.questionCount} questions in {part.timeMinutes} minutes
                                  {isSavedPart && answeredQuestions > 0 && (
                                    <span className="text-sm opacity-90"> (💾 {answeredQuestions} of {totalQuestions} answered)</span>
                                  )}
                                </div>
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
    const currentModuleType = selectedModule || getCurrentModuleType();
    const currentModuleQuestions = questions.filter(q => q.module_type === currentModuleType);
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Module Results</CardTitle>
            </CardHeader>
            <CardContent>
              {currentModuleScores.map((module) => {
                // Only show the current module's results
                if (module.moduleId === selectedModule) {
                  return (
                    <div key={module.moduleId} className="mb-6">
                      <h3 className="text-xl font-semibold mb-2">{module.moduleName}</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border">
                          <h4 className="text-lg font-medium mb-2">Raw Score</h4>
                          <div className="text-3xl font-bold">
                            {module.correctAnswers} / {module.totalQuestions}
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
                  );
                }
                return null;
              })}
              
              {/* Add Answer Review Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <QuestionReview 
                  questions={currentModuleQuestions}
                  userAnswers={userAnswers}
                  moduleType={currentModuleType}
                />
              </div>
              
              <div className="mt-6">
                <Button onClick={handleProceedToNextModule} className="w-full">
                  {completedModules.size < (currentTest?.modules?.length || 0) 
                    ? "Proceed to Next Module" 
                    : "View Final Results"}
                </Button>
                <Button onClick={handleSaveAndExit} className="w-full mt-3" variant="outline">
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // In the render logic, show the part transition prompt
  if (showPartTransition) {
    const moduleType = selectedModule || getCurrentModuleType();
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Proceed to Part 2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-lg text-center">
              You have completed Part 1 of the {moduleType === 'reading_writing' ? 'Reading & Writing' : 'Math'} module.<br />
              Click below to begin Part 2.
            </p>
            <Button className="w-full" onClick={handleProceedToPart2}>
              Start Part 2
            </Button>
            <Button className="w-full mt-3" variant="outline" onClick={handleSaveAndExit}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // When rendering TestContainer, only pass the current part's questions
  const partQuestions = getCurrentPartQuestions();
  const partStartIndex = questions.findIndex(q => q.id === partQuestions[0]?.id);
  const partRelativeIndex = currentQuestionIndex - partStartIndex;
  
  // Filter userAnswers to only include answers for the current part
  const partQuestionIds = partQuestions.map(q => q.id);
  const filteredUserAnswers = Object.fromEntries(
    Object.entries(userAnswers).filter(([questionId]) => partQuestionIds.includes(questionId))
  );
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showLogout={false} onSaveAndExit={handleSaveExitClick} isSaving={isSaving} />
      
      <main className="flex-1 container max-w-4xl mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold">{currentTest?.title || 'Practice Test'}</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-1 rounded ${timerRunning ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setTimerRunning(true)}
                disabled={timerRunning}
              >
                ▶️ Start
              </button>
              <button
                className={`px-3 py-1 rounded ${!timerRunning ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setTimerRunning(false)}
                disabled={!timerRunning}
              >
                ⏸ Pause
              </button>
              <button
                className={`px-3 py-1 rounded ${timerVisible ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setTimerVisible(!timerVisible)}
              >
                {timerVisible ? '👁️ Hide Timer' : '👁️ Show Timer'}
              </button>
            </div>
            {timerVisible && (
              <div className="flex items-center gap-2">
                <Timer 
                  initialTime={currentPartTimeLeft} 
                  onTimeUp={handleTimeUp} 
                  running={timerRunning}
                  autoSubmit={false}
                />
                {currentPartTimeLeft <= 0 && (
                  <span className="text-sm text-red-600 font-medium">(Time expired)</span>
                )}
              </div>
            )}
            {isAutoSaving && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full"></div>
                <span>Auto-saving...</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Display current module info */}
        {currentTest && questions.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded text-blue-900">
            <div className="text-lg font-semibold text-center">
              {(() => {
                const moduleType = selectedModule || getCurrentModuleType();
                const moduleName = currentTest.modules?.find((m: any) => m.type === moduleType)?.name || 'Module';
                const part = currentPart[moduleType] || 1;
                return `${moduleName} - Part ${part}`;
              })()}
            </div>
            <div className="text-sm text-center mb-2">
              {(() => {
                const moduleType = selectedModule || getCurrentModuleType();
                const part = currentPart[moduleType] || 1;
                const questionsInPart = moduleParts[moduleType]?.[part - 1]?.length || 0;
                const totalTime = partTimes[moduleType] ? Math.floor(partTimes[moduleType] / 60) : 0;
                return `Questions: ${questionsInPart} | Time: ${totalTime} min`;
              })()}
            </div>
            <div className="flex justify-center gap-2">
              <Dialog open={showReference} onOpenChange={setShowReference}>
                <DialogTrigger asChild>
                  <Button variant="outline">Instructions</Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl w-full">
                  <DialogHeader>
                    <DialogTitle>Reference Directions</DialogTitle>
                  </DialogHeader>
                  <div className="w-full h-[70vh]">
                    <iframe
                      src="/docs/directions.pdf"
                      title="Reference Directions"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                    />
                  </div>
                  <DialogClose asChild>
                    <Button variant="secondary" className="mt-4 w-full">Close</Button>
                  </DialogClose>
                </DialogContent>
              </Dialog>
              
              {/* Show Reference button only for Math module */}
              {(() => {
                const moduleType = selectedModule || getCurrentModuleType();
                return moduleType === 'math' ? (
                  <Dialog open={showMathReference} onOpenChange={setShowMathReference}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Reference</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl w-full">
                      <DialogHeader>
                        <DialogTitle>Math Reference</DialogTitle>
                      </DialogHeader>
                      <div className="w-full h-[70vh]">
                        <iframe
                          src="/docs/reference.pdf"
                          title="Math Reference"
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                        />
                      </div>
                      <DialogClose asChild>
                        <Button variant="secondary" className="mt-4 w-full">Close</Button>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                ) : null;
              })()}
            </div>
          </div>
        )}
        
        {showReviewPage ? (
          <ReviewPage
            questions={partQuestions}
            userAnswers={filteredUserAnswers}
            flaggedQuestions={flaggedQuestions}
            onGoToQuestion={handleGoToQuestion}
            onSubmitTest={handleSubmitTest}
            onCancel={() => setShowReviewPage(false)}
          />
        ) : (
          <TestContainer
            questions={partQuestions}
            currentQuestionIndex={partRelativeIndex}
            userAnswers={filteredUserAnswers}
            onSelectOption={handleSelectOption}
            onPreviousQuestion={handlePreviousQuestion}
            onNextQuestion={handleNextQuestion}
            onConfirmSubmit={() => setShowConfirmSubmit(true)}
            onGoToQuestion={index => {
              const newIndex = partStartIndex + index;
              setCurrentQuestionIndex(newIndex);
            }}
            flaggedQuestions={flaggedQuestions}
            onToggleFlag={handleToggleFlag}
            crossedOutOptions={crossedOutOptions}
            onToggleCrossOut={handleToggleCrossOut}
            onOpenReviewPage={handleOpenReviewPage}
            onSaveStatusChange={setIsSaving}
            showSubmitButton={showSubmitButton}
            currentPart={currentPart[selectedModule || getCurrentModuleType()] || 1}
            crossOutMode={crossOutMode}
            setCrossOutMode={setCrossOutMode}
          />
        )}
      </main>
      
      <TestDialogs
        showConfirmSubmit={showConfirmSubmit}
        setShowConfirmSubmit={setShowConfirmSubmit}
        showTimeUpDialog={showTimeUpDialog}
        setShowTimeUpDialog={setShowTimeUpDialog}
        showSaveExitDialog={showSaveExitDialog}
        setShowSaveExitDialog={setShowSaveExitDialog}
        onSubmitTest={handleSubmitTest}
        onDiscardTest={async () => {
          await clearTestState();
          navigate('/dashboard');
        }}
        onSaveAndExit={handleSaveAndExit}
        isSaving={isSaving}
      />
      <Footer />
    </div>
  );
};

export default TestInterface;