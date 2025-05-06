
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

const TestInterface = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [scaledScoring, setScaledScoring] = useState<ScaledScore[]>([]);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
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

  const handleSubmitTest = () => {
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
    
    // Navigate to results page with score data
    navigate("/results", {
      state: {
        score: correctAnswers,
        total: totalQuestions,
        answers: userAnswers,
        questions: questions,
        scaledScoring: scaledScoring
      }
    });
  };

  const handleTimeUp = () => {
    setShowTimeUpDialog(true);
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
          <Timer initialTime={testDuration} onTimeUp={handleTimeUp} />
        </div>
        
        <TestContainer
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          userAnswers={userAnswers}
          onSelectOption={handleSelectOption}
          onPreviousQuestion={handlePreviousQuestion}
          onNextQuestion={handleNextQuestion}
          onConfirmSubmit={() => setShowConfirmSubmit(true)}
        />
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
