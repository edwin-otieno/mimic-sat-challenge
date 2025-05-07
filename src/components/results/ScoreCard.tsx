import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScaledScore } from "@/components/admin/tests/types";

interface ScoreCardProps {
  score: number;
  total: number;
  scaledScoring?: ScaledScore[];
  scaledScore?: number | null;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ score, total, scaledScoring, scaledScore: providedScaledScore }) => {
  const percentage = Math.round((score / total) * 100);
  
  // Calculate scaled score if available and not already provided
  const getScaledScore = () => {
    // If a scaled score is already provided, use that
    if (providedScaledScore !== undefined && providedScaledScore !== null) {
      return providedScaledScore;
    }
    
    // Otherwise calculate from scaling table if available
    if (!scaledScoring || scaledScoring.length === 0) {
      return null;
    }
    
    // Find scaled scoring entries without module_id (for overall score)
    const overallScoring = scaledScoring.filter(s => !s.module_id);
    if (overallScoring.length === 0) return null;
    
    // Find the scaled score that corresponds to the number of correct answers
    // If there isn't an exact match, use the closest lower score
    const exactMatch = overallScoring.find(s => s.correct_answers === score);
    if (exactMatch) {
      return exactMatch.scaled_score;
    }
    
    // Sort by correct_answers in descending order and find the first that's less than the score
    const sortedScoring = [...overallScoring].sort((a, b) => b.correct_answers - a.correct_answers);
    const closestLower = sortedScoring.find(s => s.correct_answers < score);
    
    return closestLower ? closestLower.scaled_score : sortedScoring[sortedScoring.length - 1].scaled_score;
  };
  
  const scaledScoreValue = getScaledScore();
  
  const getScoreMessage = () => {
    if (percentage >= 80) return "Excellent work!";
    if (percentage >= 60) return "Good job!";
    return "Keep practicing!";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <p className="text-5xl font-bold mb-2">{score}/{total}</p>
          <Progress value={percentage} className="h-3 mb-2" />
          <p className="text-xl font-medium text-gray-700">{percentage}%</p>
          {scaledScoreValue !== null && (
            <div className="mt-2 p-2 bg-primary/10 rounded-md">
              <p className="font-medium">Scaled Score: {scaledScoreValue}</p>
            </div>
          )}
          <p className="mt-4 text-primary font-medium">{getScoreMessage()}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreCard;
