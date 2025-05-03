
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Question, { QuestionData } from "@/components/Question";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScaledScore } from "@/components/admin/tests/types";

interface ResultsState {
  score: number;
  total: number;
  answers: Record<string, string>;
  questions: QuestionData[];
  scaledScoring?: ScaledScore[];
}

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ResultsState;
  
  if (!state) {
    // If no results data, redirect to dashboard
    React.useEffect(() => {
      navigate("/dashboard");
    }, [navigate]);
    
    return null;
  }
  
  const { score, total, answers, questions, scaledScoring } = state;
  const percentage = Math.round((score / total) * 100);
  
  // Calculate scaled score if available
  const getScaledScore = () => {
    if (!scaledScoring || scaledScoring.length === 0) {
      return null;
    }
    
    // Find the scaled score that corresponds to the number of correct answers
    // If there isn't an exact match, use the closest lower score
    const exactMatch = scaledScoring.find(s => s.correct_answers === score);
    if (exactMatch) {
      return exactMatch.scaled_score;
    }
    
    // Sort by correct_answers in descending order and find the first that's less than the score
    const sortedScoring = [...scaledScoring].sort((a, b) => b.correct_answers - a.correct_answers);
    const closestLower = sortedScoring.find(s => s.correct_answers < score);
    
    return closestLower ? closestLower.scaled_score : null;
  };
  
  const scaledScore = getScaledScore();
  
  const getScoreMessage = () => {
    if (percentage >= 80) return "Excellent work!";
    if (percentage >= 60) return "Good job!";
    return "Keep practicing!";
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-3xl font-bold mb-2">Test Results</h2>
          <p className="text-gray-600">
            Review your answers and see where you can improve
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <Card>
            <CardHeader>
              <CardTitle>Your Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-5xl font-bold mb-2">{score}/{total}</p>
                <Progress value={percentage} className="h-3 mb-2" />
                <p className="text-xl font-medium text-gray-700">{percentage}%</p>
                {scaledScore !== null && (
                  <div className="mt-2 p-2 bg-primary/10 rounded-md">
                    <p className="font-medium">Scaled Score: {scaledScore}</p>
                  </div>
                )}
                <p className="mt-4 text-primary font-medium">{getScoreMessage()}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-700 mb-1">Correct Answers</p>
                  <p className="text-lg font-semibold">{score} questions</p>
                </div>
                <div>
                  <p className="text-gray-700 mb-1">Incorrect Answers</p>
                  <p className="text-lg font-semibold">{total - score} questions</p>
                </div>
                <div>
                  <p className="text-gray-700 mb-1">Questions Answered</p>
                  <p className="text-lg font-semibold">
                    {Object.keys(answers).length} of {total}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">Review Your Answers</h3>
          
          <div className="space-y-8">
            {questions.map((question, index) => {
              const userAnswerId = answers[question.id];
              const userSelectedOption = question.options.find(option => option.id === userAnswerId);
              const correctOption = question.options.find(option => option.isCorrect);
              
              let resultIndicator;
              if (!userAnswerId) {
                resultIndicator = (
                  <div className="text-yellow-500 mb-2">
                    Not answered
                  </div>
                );
              } else if (userSelectedOption?.isCorrect) {
                resultIndicator = (
                  <div className="text-green-600 mb-2">
                    Correct
                  </div>
                );
              } else {
                resultIndicator = (
                  <div className="text-red-500 mb-2">
                    Incorrect. The correct answer was: {
                      question.options.findIndex(o => o.isCorrect) === 0 ? "A" :
                      question.options.findIndex(o => o.isCorrect) === 1 ? "B" :
                      question.options.findIndex(o => o.isCorrect) === 2 ? "C" :
                      "D"
                    }
                  </div>
                );
              }
              
              return (
                <div key={question.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Question {index + 1}</h4>
                    {resultIndicator}
                  </div>
                  
                  <Question
                    question={question}
                    selectedOption={userAnswerId}
                    onSelectOption={() => {}} // Read-only
                    showExplanation={true}
                  />
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="flex justify-center mt-10">
          <Button onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Results;
