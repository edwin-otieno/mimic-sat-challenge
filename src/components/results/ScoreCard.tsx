import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScaledScore } from "@/components/admin/tests/types";

interface ScoreCardProps {
  score: number;
  total: number;
  scaledScoring?: ScaledScore[];
  scaledScore?: number | null;
  testCategory?: 'SAT' | 'ACT';
}

const ScoreCard: React.FC<ScoreCardProps> = ({ score, total, scaledScoring, scaledScore: providedScaledScore, testCategory = 'SAT' }) => {
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
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          {scaledScoreValue !== null ? (
            <>
              <p className="text-5xl font-bold mb-2">{scaledScoreValue}</p>
              <p className="text-sm text-gray-500 mb-4">
                {testCategory === 'ACT' ? 'Composite Score' : 'Scaled Score'}
              </p>
            </>
          ) : (
            <>
              <p className="text-5xl font-bold mb-2">N/A</p>
              <p className="text-sm text-gray-500">
                {testCategory === 'ACT' ? 'No composite score available' : 'No scaled score available'}
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreCard;
