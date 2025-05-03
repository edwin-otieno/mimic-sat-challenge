
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScaledScore } from "@/components/admin/tests/types";

interface ScoreCardProps {
  score: number;
  total: number;
  scaledScoring?: ScaledScore[];
}

const ScoreCard: React.FC<ScoreCardProps> = ({ score, total, scaledScoring }) => {
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
  );
};

export default ScoreCard;
