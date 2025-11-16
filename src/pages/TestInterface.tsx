import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTests, useOptimizedTest } from '@/hooks/useTests';
import { useTestAutoSave } from '@/hooks/useTestAutoSave';
import { useToast } from '@/hooks/use-toast';
import { getTestQuestions, getTestPassagesByModule } from '@/services/testService';
import { QuestionData } from '@/components/Question';
import { TestModule } from '@/components/admin/tests/types';
import { ScaledScore } from '@/components/admin/tests/types';
import { Passage } from '@/components/admin/passages/types';
import TestContainer from '@/components/test/TestContainer';
import PassageQuestion from '@/components/PassageQuestion';
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
import { cn } from "@/lib/utils";

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
  const [passages, setPassages] = useState<Record<string, Passage[]>>({});
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [currentQuestionInPassage, setCurrentQuestionInPassage] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [crossedOutOptions, setCrossedOutOptions] = useState<Record<string, string[]>>({});
  const [showReviewPage, setShowReviewPage] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [testStartTime, setTestStartTime] = useState<Date>(new Date());
  const { tests } = useTests();
  const [currentTest, setCurrentTest] = useState<any>(null);
  const [currentTestResultId, setCurrentTestResultId] = useState<string | null>(null);
  
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
  const [isAnswerMasking, setIsAnswerMasking] = useState(() => {
    // Persist for the session
    const saved = sessionStorage.getItem('isAnswerMasking');
    return saved === 'true';
  });
  const [unmaskedAnswers, setUnmaskedAnswers] = useState<Set<string>>(() => {
    // Persist for the session
    const saved = sessionStorage.getItem('unmaskedAnswers');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [isHighlighting, setIsHighlighting] = useState(() => {
    // Persist for the session
    const saved = sessionStorage.getItem('isHighlighting');
    return saved === 'true';
  });
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    // Persist for the session
    const saved = sessionStorage.getItem('selectedColor');
    return saved || 'yellow';
  });
  const [highlights, setHighlights] = useState<Array<{id: string, start: number, end: number, color: string}>>(() => {
    // Persist for the session
    const saved = sessionStorage.getItem('highlights');
    return saved ? JSON.parse(saved) : [];
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

  useEffect(() => {
    sessionStorage.setItem('isAnswerMasking', isAnswerMasking ? 'true' : 'false');
  }, [isAnswerMasking]);

  useEffect(() => {
    sessionStorage.setItem('unmaskedAnswers', JSON.stringify(Array.from(unmaskedAnswers)));
  }, [unmaskedAnswers]);

  useEffect(() => {
    sessionStorage.setItem('isHighlighting', isHighlighting ? 'true' : 'false');
  }, [isHighlighting]);

  useEffect(() => {
    sessionStorage.setItem('selectedColor', selectedColor);
  }, [selectedColor]);

  useEffect(() => {
    sessionStorage.setItem('highlights', JSON.stringify(highlights));
  }, [highlights]);

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

  // Initialize test result when test starts
  useEffect(() => {
    if (currentTest && user && !currentTestResultId && stateLoaded) {
      getOrCreateTestResult();
    }
  }, [currentTest, user, stateLoaded]);

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
      // Check if this is an ACT test
      const isACTTest = currentTest?.test_category === 'ACT' || 
        (currentTest?.modules && Array.isArray(currentTest.modules) && 
         currentTest.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type)));
      
      if (isACTTest) {
        // For ACT tests, complete module directly (no part transition)
        handleModuleCompletion();
      } else {
        // For SAT tests, prompt for Part 2
        setShowPartTransition(true);
      }
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

  // Helper function to convert global question index to passage indices
  const convertGlobalIndexToPassageIndices = (globalIndex: number, modulePassages: Passage[]) => {
    let questionCount = 0;
    for (let i = 0; i < modulePassages.length; i++) {
      const passage = modulePassages[i];
      const passageQuestionCount = passage.questions?.length || 0;
      if (globalIndex < questionCount + passageQuestionCount) {
        return {
          passageIndex: i,
          questionInPassage: globalIndex - questionCount
        };
      }
      questionCount += passageQuestionCount;
    }
    // Default to first passage, first question if index is out of bounds
    return { passageIndex: 0, questionInPassage: 0 };
  };

  // Passage navigation functions
  const handleNextPassageQuestion = () => {
    const passageData = getCurrentPassageData();
    if (!passageData) return;

    const newGlobalIndex = passageData.globalQuestionIndex + 1;
    
    if (currentQuestionInPassage < passageData.totalQuestions - 1) {
      setCurrentQuestionInPassage(prev => prev + 1);
      setCurrentQuestionIndex(newGlobalIndex);
    } else {
      // End of current passage, go to next passage or complete module
      const modulePassages = getCurrentModulePassages();
      if (currentPassageIndex < modulePassages.length - 1) {
        setCurrentPassageIndex(prev => prev + 1);
        setCurrentQuestionInPassage(0);
        setCurrentQuestionIndex(newGlobalIndex);
      } else {
        // End of all passages in module
        handleModuleCompletion();
      }
    }
  };

  const handlePreviousPassageQuestion = () => {
    const passageData = getCurrentPassageData();
    if (!passageData) return;

    const newGlobalIndex = passageData.globalQuestionIndex - 1;
    
    if (currentQuestionInPassage > 0) {
      setCurrentQuestionInPassage(prev => prev - 1);
      setCurrentQuestionIndex(newGlobalIndex);
    } else if (currentPassageIndex > 0) {
      // Go to previous passage
      const modulePassages = getCurrentModulePassages();
      const prevPassage = modulePassages[currentPassageIndex - 1];
      setCurrentPassageIndex(prev => prev - 1);
      setCurrentQuestionInPassage(prevPassage.questions?.length - 1 || 0);
      setCurrentQuestionIndex(newGlobalIndex);
    }
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
      
      // Map module types to display names
      const moduleNameMap: Record<string, string> = {
        'reading_writing': 'Reading & Writing',
        'math': 'Math',
        'english': 'English',
        'reading': 'Reading',
        'science': 'Science',
        'writing': 'Essay',
        'essay': 'Essay'
      };
      
      const moduleName = moduleNameMap[moduleType] || moduleType;
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

  // Initialize or get existing test result for in-progress test
  const getOrCreateTestResult = async () => {
    if (!user) return null;
    
    try {
      // Check if there's an existing in-progress test result
      const { data: existingResult } = await supabase
        .from('test_results')
        .select('id')
        .eq('user_id', user.id)
        .eq('test_id', currentTest?.id || permalink || '')
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (existingResult) {
        setCurrentTestResultId(existingResult.id);
        return existingResult.id;
      }
      
      // Create new test result for in-progress test
      const { data: newResult, error } = await supabase
        .from('test_results')
        .insert({
          user_id: user.id,
          test_id: currentTest?.id || permalink || '',
          total_score: 0,
          total_questions: 0,
          scaled_score: null,
          answers: userAnswers,
          time_taken: null,
          is_completed: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (newResult) {
        setCurrentTestResultId(newResult.id);
        return newResult.id;
      }
      
      return null;
    } catch (error) {
      console.error("Error getting or creating test result:", error);
      return null;
    }
  };

  // Save module results incrementally when a module is completed
  const saveModuleResults = async (moduleType: string) => {
    console.log('🔵 saveModuleResults called for module:', moduleType);
    if (!user) {
      console.error("❌ User not authenticated");
      return;
    }
    
    try {
      // Ensure test result exists before saving module results
      let testResultId = currentTestResultId;
      console.log('📋 Current testResultId:', testResultId);
      
      if (!testResultId) {
        console.log("⚠️ Test result not initialized, creating one...");
        testResultId = await getOrCreateTestResult();
        if (testResultId) {
          console.log('✅ Created test result:', testResultId);
          setCurrentTestResultId(testResultId);
        } else {
          console.error("❌ Failed to create test result");
          return;
        }
      }
      
      const moduleScores = calculateModuleScores();
      console.log('📊 All module scores:', moduleScores);
      const completedModule = moduleScores.find(m => m.moduleId === moduleType);
      
      if (!completedModule) {
        console.error("❌ Module not found in scores:", moduleType, "Available modules:", moduleScores.map(m => m.moduleId));
        return;
      }
      
      console.log('✅ Found completed module:', {
        moduleId: completedModule.moduleId,
        moduleName: completedModule.moduleName,
        correctAnswers: completedModule.correctAnswers,
        totalQuestions: completedModule.totalQuestions,
        scaledScore: completedModule.scaledScore
      });
      
      // Check if module result already exists
      console.log('🔍 Checking for existing module result with test_result_id:', testResultId, 'module_id:', moduleType);
      const { data: existingModule, error: checkError } = await supabase
        .from('module_results')
        .select('id')
        .eq('test_result_id', testResultId)
        .eq('module_id', moduleType)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is fine
        console.error('❌ Error checking for existing module:', checkError);
        throw checkError;
      }
      
      if (existingModule) {
        console.log('🔄 Updating existing module result:', existingModule.id);
        // Update existing module result
        const { data: updatedData, error } = await supabase
          .from('module_results')
          .update({
            module_name: completedModule.moduleName,
            score: completedModule.correctAnswers,
            total: completedModule.totalQuestions,
            scaled_score: completedModule.scaledScore,
          })
          .eq('id', existingModule.id)
          .select();
        
        if (error) {
          console.error('❌ Error updating module result:', error);
          throw error;
        }
        console.log('✅ Module results updated successfully:', updatedData);
      } else {
        console.log('➕ Inserting new module result');
        const insertData = {
          test_result_id: testResultId,
          module_id: completedModule.moduleId,
          module_name: completedModule.moduleName,
          score: completedModule.correctAnswers,
          total: completedModule.totalQuestions,
          scaled_score: completedModule.scaledScore,
          created_at: new Date().toISOString()
        };
        console.log('📝 Insert data:', insertData);
        
        // Insert new module result
        const { data: insertedData, error } = await supabase
          .from('module_results')
          .insert(insertData)
          .select();
        
        if (error) {
          console.error('❌ Error inserting module result:', error);
          console.error('❌ Error details:', JSON.stringify(error, null, 2));
          throw error;
        }
        console.log('✅ Module results saved successfully:', insertedData);
      }
      
      // Check if all modules are completed and mark test as completed if so
      if (testResultId && currentTest?.modules) {
        const { data: allModuleResults } = await supabase
          .from('module_results')
          .select('module_id')
          .eq('test_result_id', testResultId);
        
        const completedModuleIds = new Set(allModuleResults?.map(mr => mr.module_id) || []);
        const totalModules = currentTest.modules.length;
        const allModulesCompleted = completedModuleIds.size >= totalModules;
        
        console.log('🔍 Checking test completion:', {
          completedModules: completedModuleIds.size,
          totalModules,
          allModulesCompleted,
          completedModuleIds: Array.from(completedModuleIds),
          expectedModules: currentTest.modules.map((m: any) => m.type)
        });
        
        if (allModulesCompleted) {
          console.log('✅ All modules completed, marking test as completed...');
          // Check current status first
          const { data: currentStatus } = await supabase
            .from('test_results')
            .select('is_completed, total_score, scaled_score')
            .eq('id', testResultId)
            .single();
          
          if (currentStatus && !currentStatus.is_completed) {
            // Calculate total score from module results
            const { data: moduleResultsForScore } = await supabase
              .from('module_results')
              .select('module_id, score, total, scaled_score')
              .eq('test_result_id', testResultId);
            
            const totalScore = moduleResultsForScore?.reduce((sum, mr) => sum + (mr.score || 0), 0) || 0;
            const totalQuestions = moduleResultsForScore?.reduce((sum, mr) => sum + (mr.total || 0), 0) || 0;
            
            // Calculate overall scaled score
            const testCategory = currentTest?.test_category || 'SAT';
            let overallScaledScore;
            if (testCategory === 'ACT') {
              const compositeModules = (moduleResultsForScore || []).filter((mr: any) => 
                ['english', 'math', 'reading'].includes(mr.module_id || '')
              );
              if (compositeModules.length > 0) {
                const sum = compositeModules.reduce((sum, mr) => sum + (mr.scaled_score || 0), 0);
                overallScaledScore = Math.round(sum / compositeModules.length);
              }
            } else {
              overallScaledScore = moduleResultsForScore?.reduce((sum, mr) => sum + (mr.scaled_score || 0), 0) || 0;
            }
            
            // Get current answers to preserve them (including essay text)
            const { data: currentTestResult } = await supabase
              .from('test_results')
              .select('answers')
              .eq('id', testResultId)
              .single();
            
            const { error: updateError } = await supabase
              .from('test_results')
              .update({
                is_completed: true,
                total_score: totalScore,
                total_questions: totalQuestions,
                scaled_score: overallScaledScore || currentStatus.scaled_score,
                answers: currentTestResult?.answers || userAnswers // Preserve existing answers or use current userAnswers
              })
              .eq('id', testResultId);
            
            if (updateError) {
              console.error('❌ Error marking test as completed:', updateError);
            } else {
              console.log('✅ Test marked as completed successfully');
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error saving module results:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      toast({
        title: "Error",
        description: `Failed to save module results: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  // Save results to database (final save when test is completed)
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
      
      let testResultId = currentTestResultId;
      
      // If we don't have a testResultId, try to find an existing in-progress test result
      if (!testResultId) {
        console.log('No currentTestResultId, searching for existing in-progress test result...');
        const { data: existingResult } = await supabase
          .from('test_results')
          .select('id')
          .eq('user_id', user.id)
          .eq('test_id', currentTest?.id || permalink || '')
          .eq('is_completed', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (existingResult) {
          testResultId = existingResult.id;
          console.log('Found existing in-progress test result:', testResultId);
        }
      }
      
      // If we have an existing test result, update it; otherwise create new
      if (testResultId) {
        console.log('Updating existing test result:', testResultId);
        console.log('Update data:', {
          total_score: correctAnswers,
          total_questions: totalQuestions,
          scaled_score: scaledScore,
          time_taken: timeTaken,
          is_completed: true
        });
        const { data: updatedData, error: updateError } = await supabase
          .from('test_results')
          .update({
            total_score: correctAnswers,
            total_questions: totalQuestions,
            scaled_score: scaledScore,
            answers: userAnswers,
            time_taken: timeTaken,
            is_completed: true
          })
          .eq('id', testResultId)
          .select();
        
        if (updateError) {
          console.error('Error updating test result:', updateError);
          throw updateError;
        }
        console.log('Test result updated successfully:', updatedData);
        
        // Verify the update
        const { data: verifyData } = await supabase
          .from('test_results')
          .select('is_completed')
          .eq('id', testResultId)
          .single();
        console.log('Verification - is_completed after update:', verifyData?.is_completed);
      } else {
        console.log('No existing test result found, creating new one...');
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
            is_completed: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (testError) throw testError;
        testResultId = testResult.id;
        console.log('New test result created:', testResultId);
      }
      
      // Save module results (upsert to handle incremental saves)
      if (testResultId) {
        const moduleResultsPromises = moduleScores.map(async (module) => {
          // Check if module result exists
          const { data: existing } = await supabase
            .from('module_results')
            .select('id')
            .eq('test_result_id', testResultId)
            .eq('module_id', module.moduleId)
            .single();
          
          if (existing) {
            // Update existing
            return supabase
              .from('module_results')
              .update({
                module_name: module.moduleName,
                score: module.correctAnswers,
                total: module.totalQuestions,
                scaled_score: module.scaledScore,
              })
              .eq('id', existing.id);
          } else {
            // Insert new
            return supabase
              .from('module_results')
              .insert({
                test_result_id: testResultId,
                module_id: module.moduleId,
                module_name: module.moduleName,
                score: module.correctAnswers,
                total: module.totalQuestions,
                scaled_score: module.scaledScore,
                created_at: new Date().toISOString()
              });
          }
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
        const testCategory = testData?.test?.test_category || currentTest?.test_category || 'SAT';
        
        if (testCategory === 'ACT') {
          // For ACT: Composite Score = average of English, Math, and Reading
          const compositeModules = moduleScores.filter(module => 
            ['english', 'math', 'reading'].includes(module.moduleId)
          );
          
          if (compositeModules.length > 0) {
            const sum = compositeModules.reduce((sum, module) => sum + (module.scaledScore || 0), 0);
            overallScaledScore = Math.round(sum / compositeModules.length);
          }
        } else {
          // For SAT: Sum the scaled scores of the modules
          overallScaledScore = moduleScores.reduce((sum, module) => sum + (module.scaledScore || 0), 0);
        }
      }
      
      console.log('Saving results to database...');
      // Save results to database
      await saveResults(correctAnswers, totalQuestions, moduleScores, overallScaledScore);
      
      console.log('Navigating to results page...');
      // Navigate to results page with score data
      const testCategory = testData?.test?.test_category || currentTest?.test_category || 'SAT';
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
          overallScaledScore: overallScaledScore,
          testCategory: testCategory
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
    
    // Reset passage indices when switching modules (for ACT tests with passages)
    setCurrentPassageIndex(0);
    setCurrentQuestionInPassage(0);
    
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
  const handleModuleCompletion = async () => {
    console.log('🟢 handleModuleCompletion called, selectedModule:', selectedModule);
    if (!selectedModule) {
      console.log('❌ No selectedModule, returning');
      return;
    }
    
    // Calculate scores for the completed module
    const moduleScores = calculateModuleScores();
    console.log('📊 Calculated module scores:', moduleScores);
    setCurrentModuleScores(moduleScores);
    setShowModuleScores(true);
    
    // Only mark module as completed if both parts have at least one attempted answer
    const part1Questions = moduleParts[selectedModule]?.[0] || [];
    const part2Questions = moduleParts[selectedModule]?.[1] || [];
    const attemptedInPart = (qs: QuestionData[]) => qs.some(q => !!userAnswers[q.id]);
    const hasAttemptedPart1 = attemptedInPart(part1Questions);
    const hasAttemptedPart2 = attemptedInPart(part2Questions);
    
    console.log(`🔍 Module ${selectedModule} completion check:`, {
      hasAttemptedPart1,
      hasAttemptedPart2,
      part1QuestionsCount: part1Questions.length,
      part2QuestionsCount: part2Questions.length,
      part1QuestionIds: part1Questions.map(q => q.id),
      part2QuestionIds: part2Questions.map(q => q.id),
      userAnswersKeys: Object.keys(userAnswers),
      testCategory: currentTest?.test_category
    });
    
    // Always save module results when handleModuleCompletion is called
    // This function is only called when the user has completed/finished the module
    // So we should save the results regardless of answer conditions
    const isACTTest = currentTest?.test_category === 'ACT';
    const hasPart2 = part2Questions.length > 0;
    const hasAnyAnswers = hasAttemptedPart1 || hasAttemptedPart2;
    
    console.log(`💾 Module completion details:`, {
      isACTTest,
      hasPart2,
      hasAttemptedPart1,
      hasAttemptedPart2,
      hasAnyAnswers
    });
    
    // Always save if handleModuleCompletion was called (user completed the module)
    // Only skip if there are literally no answers at all
    if (hasAnyAnswers || moduleScores.some(m => m.moduleId === selectedModule && m.correctAnswers >= 0)) {
      setCompletedModules(prev => new Set([...prev, selectedModule]));
      
      // Save module results incrementally
      console.log(`💾 Saving module results for ${selectedModule}...`);
      await saveModuleResults(selectedModule);
    } else {
      console.log(`⚠️ Module ${selectedModule} not saved: no answers found at all`);
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

  // Load passages for a test
  const loadPassages = async (testId: string) => {
    try {
      const passagesData = await getTestPassagesByModule(testId);
      setPassages(passagesData);
      console.log('Passages loaded:', passagesData);
      console.log('Passages by module:', Object.keys(passagesData).map(module => ({
        module,
        count: passagesData[module]?.length || 0,
        passages: passagesData[module]?.map(p => ({ id: p.id, title: p.title, order: p.passage_order, questionCount: p.questions?.length || 0 })) || []
      })));
    } catch (error) {
      console.error('Error loading passages:', error);
    }
  };

  // Check if current module has passages
  const getCurrentModulePassages = () => {
    const moduleType = selectedModule || getCurrentModuleType();
    const modulePassages = passages[moduleType] || [];
    console.log(`[getCurrentModulePassages] Module: ${moduleType}, Passages found: ${modulePassages.length}`, modulePassages.map(p => ({ id: p.id, title: p.title, order: p.passage_order })));
    return modulePassages;
  };

  // Track last restored module to avoid restoring multiple times
  const lastRestoredModuleRef = useRef<string | null>(null);
  const hasRestoredForCurrentStateRef = useRef<boolean>(false);

  // Reset or restore passage indices when selected module changes or state is loaded
  useEffect(() => {
    if (!selectedModule) return;
    
    const modulePassages = passages[selectedModule] || [];
    const isPassageModule = modulePassages.length > 0;
    const moduleChanged = lastRestoredModuleRef.current !== selectedModule;
    
    // Restore passage indices when:
    // 1. State is loaded AND (module changed OR we haven't restored for this state yet)
    // 2. This is a passage module
    if (stateLoaded && isPassageModule && (moduleChanged || !hasRestoredForCurrentStateRef.current)) {
      const indices = convertGlobalIndexToPassageIndices(currentQuestionIndex, modulePassages);
      console.log(`[useEffect] Module: ${selectedModule}, Restoring passage indices from global index ${currentQuestionIndex} to passage ${indices.passageIndex}, question ${indices.questionInPassage}`);
      setCurrentPassageIndex(indices.passageIndex);
      setCurrentQuestionInPassage(indices.questionInPassage);
      lastRestoredModuleRef.current = selectedModule;
      hasRestoredForCurrentStateRef.current = true;
    } else if (moduleChanged) {
      // Module changed but state not loaded yet, or not a passage module - reset to defaults
      console.log(`[useEffect] Module changed to: ${selectedModule}, Resetting passage indices. Passages available: ${modulePassages.length}, State loaded: ${stateLoaded}`);
      setCurrentPassageIndex(0);
      setCurrentQuestionInPassage(0);
      lastRestoredModuleRef.current = selectedModule;
      hasRestoredForCurrentStateRef.current = false;
    }
  }, [selectedModule, passages, stateLoaded]);
  
  // Also restore when currentQuestionIndex changes after state is loaded (for initial restore)
  useEffect(() => {
    if (!selectedModule || !stateLoaded) return;
    
    const modulePassages = passages[selectedModule] || [];
    const isPassageModule = modulePassages.length > 0;
    
    // Only restore if we haven't restored yet for this state
    if (isPassageModule && !hasRestoredForCurrentStateRef.current) {
      const indices = convertGlobalIndexToPassageIndices(currentQuestionIndex, modulePassages);
      console.log(`[useEffect] Restoring passage indices from currentQuestionIndex change: ${currentQuestionIndex} to passage ${indices.passageIndex}, question ${indices.questionInPassage}`);
      setCurrentPassageIndex(indices.passageIndex);
      setCurrentQuestionInPassage(indices.questionInPassage);
      hasRestoredForCurrentStateRef.current = true;
    }
  }, [currentQuestionIndex, selectedModule, passages, stateLoaded]);

  // Get all questions from all passages in current module with sequential numbering
  const getAllModulePassageQuestions = () => {
    const modulePassages = getCurrentModulePassages();
    const allQuestions: QuestionData[] = [];
    let sequentialQuestionNumber = 1;
    
    modulePassages.forEach(passage => {
      if (passage.questions && passage.questions.length > 0) {
        passage.questions.forEach(question => {
          // Assign sequential question number across all passages
          allQuestions.push({
            ...question,
            question_number: sequentialQuestionNumber
          });
          sequentialQuestionNumber++;
        });
      }
    });
    return allQuestions;
  };

  // Get current passage and question
  const getCurrentPassageData = () => {
    const modulePassages = getCurrentModulePassages();
    if (modulePassages.length === 0) return null;
    
    const passage = modulePassages[currentPassageIndex];
    if (!passage || !passage.questions) return null;
    
    // Calculate global question index across all passages
    let globalQuestionIndex = 0;
    for (let i = 0; i < currentPassageIndex; i++) {
      if (modulePassages[i]?.questions) {
        globalQuestionIndex += modulePassages[i].questions.length;
      }
    }
    globalQuestionIndex += currentQuestionInPassage;
    
    return {
      passage,
      currentQuestion: passage.questions[currentQuestionInPassage],
      totalQuestions: passage.questions.length,
      globalQuestionIndex,
      totalQuestionsInModule: getAllModulePassageQuestions().length
    };
  };

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
    console.log('Test category from testData:', testData.test.test_category);
    console.log('Full test data:', testData.test);
    
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
    
    // Load passages for ACT tests
    if (testData.test.test_category === 'ACT') {
      loadPassages(testData.test.id);
    }
    
    // Group questions by module type dynamically
    const grouped: { [moduleType: string]: QuestionData[] } = {};
    testData.questions.forEach(q => {
      const moduleType = q.module_type || 'reading_writing';
      if (!grouped[moduleType]) {
        grouped[moduleType] = [];
      }
      grouped[moduleType].push(q);
    });
    
    // Split each module's questions into two parts (only for SAT tests)
    const parts: { [moduleType: string]: [QuestionData[], QuestionData[]] } = {};
    const testCategory = testData.test.test_category || 'SAT';
    
    Object.entries(grouped).forEach(([moduleType, qs]) => {
      if (testCategory === 'ACT') {
        // For ACT tests, keep each module as a single part
        parts[moduleType] = [qs, []];
      } else {
        // For SAT tests, split into two parts
        const half = Math.ceil(qs.length / 2);
        parts[moduleType] = [qs.slice(0, half), qs.slice(half)];
      }
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
    
    // Set per-part time (half the module time for SAT, full time for ACT)
    const partTimes: { [moduleType: string]: number } = {};
    
    if (modules.length > 0) {
      modules.forEach((m: any) => {
        if (testCategory === 'ACT') {
          // For ACT tests, use full module time
          partTimes[m.type] = (m.time || 0) * 60; // seconds
        } else {
          // For SAT tests, split time in half
          partTimes[m.type] = Math.floor((m.time || 0) * 60 / 2); // seconds
        }
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
      
      // Check if this is an ACT test
      const isACTTest = currentTest?.test_category === 'ACT' || 
        (currentTest?.modules && Array.isArray(currentTest.modules) && 
         currentTest.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type)));
      
      if (isACTTest) {
        // For ACT tests, show only one part per module
        const partQuestions = parts?.[0] || [];
        return [{
          partNumber: 1,
          questionCount: partQuestions.length,
          timeMinutes: module?.time || 0, // Full module time for ACT
          moduleType,
          moduleName: module?.name || moduleType
        }];
      } else {
        // For SAT tests, show two parts per module
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
      }
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

    // Determine test category for conditional styling
    // Use testData if available, fallback to currentTest
    const testCategory = testData?.test?.test_category || currentTest?.test_category || 'SAT';
    const isACTTest = testCategory === 'ACT' || 
      (testData?.test?.modules && Array.isArray(testData.test.modules) && 
       testData.test.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type))) ||
      (currentTest?.modules && Array.isArray(currentTest.modules) && 
       currentTest.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type)));

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main 
          className={cn("flex-1 container mx-auto py-4 sm:py-8 px-4", !isACTTest && "max-w-4xl")}
          style={isACTTest ? { maxWidth: '70rem' } : undefined}
        >
          {hasSavedProgress && (
            <Alert className="mb-6">
              <AlertDescription>
                <strong>Saved Progress Detected!</strong> You have saved progress from a previous session. 
                {savedModuleType && savedPart && (
                  <span> You were working on <strong>
                    {getModuleDisplayName(savedModuleType)}
                    {(() => {
                      // Check if this is an ACT test
                      const isACTTest = currentTest?.test_category === 'ACT' || 
                        (currentTest?.modules && Array.isArray(currentTest.modules) && 
                         currentTest.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type)));
                      return isACTTest ? '' : ` Part ${savedPart}`;
                    })()}
                  </strong>. </span>
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
                                  {part.moduleName}{(() => {
                                    // Check if this is an ACT test
                                    const isACTTest = currentTest?.test_category === 'ACT' || 
                                      (currentTest?.modules && Array.isArray(currentTest.modules) && 
                                       currentTest.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type)));
                                    return isACTTest ? '' : ` Part ${part.partNumber}`;
                                  })()}: {part.questionCount} questions in {part.timeMinutes} minutes
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
    
    // Determine test category for conditional styling
    const testCategoryForScores = testData?.test?.test_category || currentTest?.test_category || 'SAT';
    const isACTTestForScores = testCategoryForScores === 'ACT' || 
      (testData?.test?.modules && Array.isArray(testData.test.modules) && 
       testData.test.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type))) ||
      (currentTest?.modules && Array.isArray(currentTest.modules) && 
       currentTest.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type)));
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main 
          className={cn("flex-1 container mx-auto py-4 sm:py-8 px-4", !isACTTestForScores && "max-w-4xl")}
          style={isACTTestForScores ? { maxWidth: '70rem' } : undefined}
        >
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border">
                          <h4 className="text-base sm:text-lg font-medium mb-2">Raw Score</h4>
                          <div className="text-2xl sm:text-3xl font-bold">
                            {module.correctAnswers} / {module.totalQuestions}
                          </div>
                        </div>
                        {module.scaledScore !== undefined && (
                          <div className="bg-white rounded-lg p-4 border">
                            <h4 className="text-base sm:text-lg font-medium mb-2">Scaled Score</h4>
                            <div className="text-2xl sm:text-3xl font-bold">
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
                  testCategory={testCategoryForScores as 'SAT' | 'ACT'}
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
  
  // Determine test category for conditional styling
  const testCategory = testData?.test?.test_category || currentTest?.test_category || 'SAT';
  const isACTTest = testCategory === 'ACT' || 
    (testData?.test?.modules && Array.isArray(testData.test.modules) && 
     testData.test.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type))) ||
    (currentTest?.modules && Array.isArray(currentTest.modules) && 
     currentTest.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type)));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showLogout={false} onSaveAndExit={handleSaveExitClick} isSaving={isSaving} />
      
      <main 
        className={cn("flex-1 container mx-auto py-6 px-4", !isACTTest && "max-w-4xl")}
        style={isACTTest ? { maxWidth: '70rem' } : undefined}
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 border-b pb-4">
          <h2 className="text-xl sm:text-2xl font-bold">{currentTest?.title || 'Practice Test'}</h2>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
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
                
                // Check if this is an ACT test
                const isACTTest = currentTest?.test_category === 'ACT' || 
                  (currentTest?.modules && Array.isArray(currentTest.modules) && 
                   currentTest.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type)));
                
                return isACTTest ? moduleName : `${moduleName} - Part ${part}`;
              })()}
            </div>
            <div className="text-sm text-center mb-2">
              {(() => {
                const moduleType = selectedModule || getCurrentModuleType();
                const part = currentPart[moduleType] || 1;
                
                // Check if this is an ACT test
                const isACTTest = currentTest?.test_category === 'ACT' || 
                  (currentTest?.modules && Array.isArray(currentTest.modules) && 
                   currentTest.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type)));
                
                // For ACT tests with passages, count questions from passages
                // For ACT Math and Writing/Essay (which don't use passages), count from moduleParts
                let questionsInPart = 0;
                if (isACTTest) {
                  if (moduleType === 'math' || moduleType === 'writing') {
                    // Math and Writing modules don't use passages, use moduleParts
                    questionsInPart = moduleParts[moduleType]?.[0]?.length || 0;
                  } else {
                    // Other ACT modules use passages
                  const allModuleQuestions = getAllModulePassageQuestions();
                  questionsInPart = allModuleQuestions.length || 0;
                  }
                } else {
                  questionsInPart = moduleParts[moduleType]?.[part - 1]?.length || 0;
                }
                
                // For ACT tests, use full module time (not divided by part)
                // For SAT tests, use partTimes which is already divided by 2
                let totalTime = 0;
                if (isACTTest) {
                  const module = currentTest?.modules?.find((m: any) => m.type === moduleType);
                  totalTime = module?.time || 0; // Already in minutes
                } else {
                  totalTime = partTimes[moduleType] ? Math.floor(partTimes[moduleType] / 60) : 0;
                }
                
                return `Questions: ${questionsInPart} | Time: ${totalTime} min`;
              })()}
            </div>
            <div className="flex justify-center gap-2">
              <Dialog open={showReference} onOpenChange={setShowReference}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    {(() => {
                      const moduleType = selectedModule || getCurrentModuleType();
                      return moduleType === 'writing' ? 'Planning Your Essay' : 'Instructions';
                    })()}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl w-full">
                  <DialogHeader>
                    <DialogTitle>
                      {(() => {
                        const moduleType = selectedModule || getCurrentModuleType();
                        return moduleType === 'writing' ? 'Planning Your Essay' : 'Reference Directions';
                      })()}
                    </DialogTitle>
                  </DialogHeader>
                  {(() => {
                    // Check if this is an ACT test
                    const isACTTest = currentTest?.test_category === 'ACT' || 
                      (currentTest?.modules && Array.isArray(currentTest.modules) && 
                       currentTest.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type)));
                    
                    // Get current module type
                    const moduleType = selectedModule || getCurrentModuleType();
                    
                    if (isACTTest && moduleType === 'writing') {
                      // Show essay planning instructions for ACT Writing
                      return (
                        <>
                          <div className="w-full max-h-[70vh] overflow-y-auto p-4">
                            <div className="prose max-w-none">
                              <p className="mb-4">
                                You may wish to consider the following as you think critically about the task:
                              </p>
                              <div className="mb-4">
                                <p className="font-semibold mb-2">Strengths and weaknesses of different perspectives on the issue</p>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                  <li>What insights do they offer, and what do they fail to consider?</li>
                                  <li>Why might they be persuasive to others, or why might they fail to persuade?</li>
                                </ul>
                              </div>
                              <div className="mb-4">
                                <p className="font-semibold mb-2">Your own knowledge, experience, and values</p>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                  <li>What is your perspective on this issue, and what are its strengths and weaknesses?</li>
                                  <li>How will you support your perspective in your essay?</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                          <DialogClose asChild>
                            <Button variant="secondary" className="mt-4 w-full">Close</Button>
                          </DialogClose>
                        </>
                      );
                    } else if (isACTTest && moduleType === 'math') {
                      // Show Math-specific instructions for ACT Math
                      return (
                        <>
                          <div className="w-full max-h-[70vh] overflow-y-auto p-4">
                            <div className="prose max-w-none">
                              <p className="mb-4">
                                <strong>DIRECTIONS:</strong> Solve each problem, choose the correct answer, and then fill in the corresponding oval on your answer document.
                              </p>
                              <p className="mb-4">
                                Do not linger over problems that take too much time. Solve as many as you can; then return to the others in the time you have left for this test.
                              </p>
                              <p className="mb-4">
                                You are permitted to use a calculator on this test. You may use your calculator for any problems you choose, but some of the problems may best be done without using a calculator.
                              </p>
                              <p className="mb-4">
                                <strong>Note:</strong> Unless otherwise stated, all of the following should be assumed.
                              </p>
                              <ol className="list-decimal list-inside mb-4 space-y-2">
                                <li>Illustrative figures are not necessarily drawn to scale.</li>
                                <li>Geometric figures lie in a plane.</li>
                                <li>The word "line" indicates a straight line.</li>
                                <li>The word "average" indicates arithmetic mean.</li>
                              </ol>
                            </div>
                          </div>
                          <DialogClose asChild>
                            <Button variant="secondary" className="mt-4 w-full">Close</Button>
                          </DialogClose>
                        </>
                      );
                    } else if (isACTTest && moduleType === 'reading') {
                      // Show Reading-specific instructions for ACT Reading
                      return (
                        <>
                          <div className="w-full max-h-[70vh] overflow-y-auto p-4">
                            <div className="prose max-w-none">
                              <p className="mb-4">
                                <strong>DIRECTIONS:</strong> There are several passages in this test. Each passage is accompanied by several questions. After reading a passage, choose the best answer to each question and fill in the corresponding oval on your answer document. You may refer to the passages as often as necessary.
                              </p>
                            </div>
                          </div>
                          <DialogClose asChild>
                            <Button variant="secondary" className="mt-4 w-full">Close</Button>
                          </DialogClose>
                        </>
                      );
                    } else if (isACTTest && moduleType === 'science') {
                      // Show Science-specific instructions for ACT Science
                      return (
                        <>
                          <div className="w-full max-h-[70vh] overflow-y-auto p-4">
                            <div className="prose max-w-none">
                              <p className="mb-4">
                                <strong>DIRECTIONS:</strong> There are several passages in this test.
                              </p>
                              <p className="mb-4">
                                Each passage is followed by several questions. After reading a passage, choose the best answer to each question and fill in the corresponding oval on your answer document. You may refer to the passages as often as necessary.
                              </p>
                              <p className="mb-4">
                                You are not permitted to use a calculator on this test.
                              </p>
                            </div>
                          </div>
                          <DialogClose asChild>
                            <Button variant="secondary" className="mt-4 w-full">Close</Button>
                          </DialogClose>
                        </>
                      );
                    } else if (isACTTest) {
                      // Show text instructions for other ACT tests
                      return (
                        <>
                          <div className="w-full max-h-[70vh] overflow-y-auto p-4">
                            <div className="prose max-w-none">
                              <p className="mb-4">
                                <strong>DIRECTIONS:</strong> In the passages that follow, certain words and phrases are underlined and numbered. In the right-hand column, you will find alternatives for the underlined part. You are to choose the best answer to each question. If you think the original version is best, choose "No Change."
                              </p>
                              <p className="mb-4">
                                You will also find questions about a section of the passage, or about the passage as a whole. These questions do not refer to an underlined portion of the passage, but rather are identified by a number or numbers in a box.
                              </p>
                              <p className="mb-4">
                                For each question, choose the alternative you consider best and fill in the corresponding oval on your answer document. Read each passage through once before you begin to answer the questions that accompany it. For many of the questions, you must read several sentences beyond the question to determine the answer. Be sure that you have read far enough ahead each time you choose an alternative.
                              </p>
                            </div>
                          </div>
                          <DialogClose asChild>
                            <Button variant="secondary" className="mt-4 w-full">Close</Button>
                          </DialogClose>
                        </>
                      );
                    } else {
                      // Show PDF for SAT tests
                      return (
                        <>
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
                        </>
                      );
                    }
                  })()}
                </DialogContent>
              </Dialog>
              
              {/* Show Reference button only for Math module (not ACT Math) */}
              {(() => {
                const moduleType = selectedModule || getCurrentModuleType();
                const isACTTest = currentTest?.test_category === 'ACT' || 
                  (currentTest?.modules && Array.isArray(currentTest.modules) && 
                   currentTest.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type)));
                // Show Reference button only for Math module, but not for ACT Math
                return moduleType === 'math' && !isACTTest ? (
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
        ) : (() => {
          // Determine if we should show passage-based questions
          const testCategory = currentTest?.test_category || 'SAT';
          const isACTTest = testCategory === 'ACT' || 
            (currentTest?.modules && Array.isArray(currentTest.modules) && 
             currentTest.modules.some((m: any) => ['english', 'reading', 'science', 'writing'].includes(m.type)));
          
          const passageData = getCurrentPassageData();
          
          if (isACTTest && passageData) {
            // Show passage-based questions for ACT tests
            // Get ALL questions from ALL passages in the module for QuestionNavigator
            const allModuleQuestions = getAllModulePassageQuestions();
            console.log('[TestInterface] All module questions:', allModuleQuestions.length, allModuleQuestions.map(q => ({ id: q.id, question_number: q.question_number })));
            
            return (
              <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 250px)', minHeight: '1000px' }}>
                <PassageQuestion
                  passage={passageData.passage}
                  currentQuestionIndex={passageData.globalQuestionIndex}
                  totalQuestions={passageData.totalQuestionsInModule}
                  userAnswers={userAnswers}
                  onAnswerChange={handleSelectOption}
                  onPreviousQuestion={handlePreviousPassageQuestion}
                  onNextQuestion={handleNextPassageQuestion}
                  onToggleFlag={handleToggleFlag}
                  onToggleCrossOut={handleToggleCrossOut}
                  onToggleUnmask={(questionId, optionId) => {
                    setUnmaskedAnswers(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(optionId)) {
                        newSet.delete(optionId);
                      } else {
                        newSet.add(optionId);
                      }
                      return newSet;
                    });
                  }}
                  flaggedQuestions={flaggedQuestions}
                  crossedOutOptions={crossedOutOptions}
                  unmaskedAnswers={unmaskedAnswers}
                  setUnmaskedAnswers={setUnmaskedAnswers}
                  crossOutMode={crossOutMode}
                  setCrossOutMode={setCrossOutMode}
                  isAnswerMasking={isAnswerMasking}
                  setIsAnswerMasking={setIsAnswerMasking}
                  isHighlighting={isHighlighting}
                  selectedColor={selectedColor}
                  highlights={highlights}
                  onHighlightsChange={setHighlights}
                  onToggleHighlighting={() => setIsHighlighting(!isHighlighting)}
                  onColorChange={setSelectedColor}
                  testCategory={testCategory}
                  allQuestions={allModuleQuestions}
                  onGoToQuestion={(globalIndex) => {
                    // Convert global question index to passage and question indices
                    const modulePassages = getCurrentModulePassages();
                    const indices = convertGlobalIndexToPassageIndices(globalIndex, modulePassages);
                    setCurrentPassageIndex(indices.passageIndex);
                    setCurrentQuestionInPassage(indices.questionInPassage);
                    setCurrentQuestionIndex(globalIndex);
                  }}
                />
              </div>
            );
          } else {
            // Show regular questions for SAT tests or ACT tests without passages
            return (
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
                isAnswerMasking={isAnswerMasking}
                setIsAnswerMasking={setIsAnswerMasking}
                unmaskedAnswers={unmaskedAnswers}
                setUnmaskedAnswers={setUnmaskedAnswers}
                testCategory={testCategory}
              />
            );
          }
        })()}
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