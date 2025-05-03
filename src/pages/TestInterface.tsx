
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Timer from "@/components/Timer";
import Question, { QuestionData } from "@/components/Question";
import ProgressBar from "@/components/ProgressBar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ScaledScore } from "@/components/admin/tests/types";

// Mock test data
const getTestQuestions = (testId: string): { questions: QuestionData[], scaledScoring?: ScaledScore[] } => {
  // This would typically come from an API
  const questions: QuestionData[] = [
    {
      id: "q1",
      text: "The author's primary purpose in the passage is to:",
      options: [
        { id: "q1-a", text: "argue against a popular scientific theory", isCorrect: false },
        { id: "q1-b", text: "explain the historical development of an idea", isCorrect: true },
        { id: "q1-c", text: "compare competing interpretations of evidence", isCorrect: false },
        { id: "q1-d", text: "challenge a conventional understanding", isCorrect: false },
      ],
      explanation: "The passage primarily tracks how the concept evolved over time, making B the correct answer."
    },
    {
      id: "q2",
      text: "According to the passage, which of the following is true about the experiment?",
      options: [
        { id: "q2-a", text: "It confirmed the researchers' initial hypothesis", isCorrect: false },
        { id: "q2-b", text: "It yielded unexpected results that challenged existing theories", isCorrect: true },
        { id: "q2-c", text: "It failed to produce statistically significant data", isCorrect: false },
        { id: "q2-d", text: "It was criticized for methodological flaws", isCorrect: false },
      ],
      explanation: "The passage mentions that the results surprised researchers and contradicted established theories."
    },
    {
      id: "q3",
      text: "In the equation 3x + 5 = 17, what is the value of x?",
      options: [
        { id: "q3-a", text: "4", isCorrect: true },
        { id: "q3-b", text: "6", isCorrect: false },
        { id: "q3-c", text: "7", isCorrect: false },
        { id: "q3-d", text: "12", isCorrect: false },
      ],
      explanation: "3x + 5 = 17 → 3x = 12 → x = 4"
    },
    {
      id: "q4",
      text: "Which of the following best describes the function f(x) = x² - 3x + 2?",
      options: [
        { id: "q4-a", text: "Linear with y-intercept at (0, 2)", isCorrect: false },
        { id: "q4-b", text: "Quadratic with minimum value at x = 1.5", isCorrect: true },
        { id: "q4-c", text: "Quadratic with maximum value at x = 1.5", isCorrect: false },
        { id: "q4-d", text: "Exponential with horizontal asymptote at y = 2", isCorrect: false },
      ],
      explanation: "This is a quadratic function. The vertex form is f(x) = (x - 1.5)² - 0.25, which has a minimum at x = 1.5."
    },
    {
      id: "q5",
      text: "The main rhetorical strategy used in the third paragraph is:",
      options: [
        { id: "q5-a", text: "Comparison and contrast", isCorrect: true },
        { id: "q5-b", text: "Definition and example", isCorrect: false },
        { id: "q5-c", text: "Problem and solution", isCorrect: false },
        { id: "q5-d", text: "Cause and effect", isCorrect: false },
      ],
      explanation: "The paragraph primarily contrasts two different approaches or viewpoints."
    },
  ];
  
  // Add more questions for a complete test
  for (let i = 6; i <= 10; i++) {
    questions.push({
      id: `q${i}`,
      text: `Sample question ${i} for test ${testId}`,
      options: [
        { id: `q${i}-a`, text: "Option A", isCorrect: i % 4 === 0 },
        { id: `q${i}-b`, text: "Option B", isCorrect: i % 4 === 1 },
        { id: `q${i}-c`, text: "Option C", isCorrect: i % 4 === 2 },
        { id: `q${i}-d`, text: "Option D", isCorrect: i % 4 === 3 },
      ],
    });
  }

  // Mock scaled scoring data - in a real app, this would come from the test configuration
  const scaledScoring: ScaledScore[] = [
    { correct_answers: 0, scaled_score: 0 },
    { correct_answers: 3, scaled_score: 30 },
    { correct_answers: 5, scaled_score: 50 },
    { correct_answers: 7, scaled_score: 70 },
    { correct_answers: 10, scaled_score: 100 }
  ];

  return { questions, scaledScoring };
};

const TestInterface = () => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [scaledScoring, setScaledScoring] = useState<ScaledScore[]>([]);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  
  useEffect(() => {
    if (testId) {
      // In a real app, this would be an API call
      const { questions, scaledScoring } = getTestQuestions(testId);
      setQuestions(questions);
      setScaledScoring(scaledScoring || []);
    }
  }, [testId]);

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

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = currentQuestion ? userAnswers[currentQuestion.id] : null;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

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
        
        <div className="mb-6">
          <ProgressBar current={currentQuestionIndex + 1} total={questions.length} />
        </div>
        
        {currentQuestion && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <Question
              question={currentQuestion}
              selectedOption={selectedAnswer}
              onSelectOption={handleSelectOption}
            />
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          {isLastQuestion ? (
            <Button onClick={() => setShowConfirmSubmit(true)}>
              Submit Test
            </Button>
          ) : (
            <Button onClick={handleNextQuestion}>
              Next Question
            </Button>
          )}
        </div>
      </main>
      
      {/* Confirm Submit Dialog */}
      <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Test?</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your test? You won't be able to change your answers after submission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmSubmit(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitTest}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Time Up Dialog */}
      <Dialog open={showTimeUpDialog} onOpenChange={setShowTimeUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Time's Up!</DialogTitle>
            <DialogDescription>
              Your time has expired. Your test will be submitted with your current answers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleSubmitTest}>
              View Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestInterface;
