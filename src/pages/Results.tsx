
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { QuestionData } from "@/components/Question";
import { ScaledScore } from "@/components/admin/tests/types";
import ResultsHeader from "@/components/results/ResultsHeader";
import ScoreCard from "@/components/results/ScoreCard";
import SummaryCard from "@/components/results/SummaryCard";
import QuestionReview from "@/components/results/QuestionReview";

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
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
        <ResultsHeader />
        
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <ScoreCard score={score} total={total} scaledScoring={scaledScoring} />
          <SummaryCard 
            score={score} 
            total={total} 
            answeredCount={Object.keys(answers).length} 
          />
        </div>
        
        <QuestionReview questions={questions} userAnswers={answers} />
        
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
