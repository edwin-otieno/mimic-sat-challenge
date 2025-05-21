import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScaledScore } from './types';

interface ScaledScoreTableProps {
  scores: ScaledScore[];
  onChange: (scores: ScaledScore[]) => void;
  questionCount: number;
  moduleId?: string;
}

const ScaledScoreTable: React.FC<ScaledScoreTableProps> = ({ 
  scores, 
  onChange,
  questionCount,
  moduleId
}) => {
  const addScoreRow = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    
    // Find the next correct answer count that doesn't have a score for this specific module
    let nextCorrectAnswers = 0;
    if (scores.length > 0) {
      const existingCounts = scores
        .filter(s => s.module_id === moduleId)
        .map(s => s.correct_answers);
      for (let i = 0; i <= questionCount; i++) {
        if (!existingCounts.includes(i)) {
          nextCorrectAnswers = i;
          break;
        }
      }
    }
    
    const newScore: ScaledScore = {
      correct_answers: nextCorrectAnswers,
      scaled_score: 0,
      module_id: moduleId
    };
    
    onChange([...scores, newScore].sort((a, b) => a.correct_answers - b.correct_answers));
  };

  const removeScoreRow = (index: number, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    const newScores = [...scores];
    newScores.splice(index, 1);
    onChange(newScores);
  };

  const updateScoreValue = (index: number, field: keyof ScaledScore, value: number) => {
    const newScores = [...scores];
    newScores[index] = {
      ...newScores[index],
      [field]: value,
      module_id: moduleId // Ensure module_id is set
    };
    onChange(newScores);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Scaled Scoring</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addScoreRow}
          type="button" // Explicitly set type to button
          disabled={scores.length >= 100} // Maximum is now 100 rows
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Score Mapping
        </Button>
      </div>

      {scores.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Correct Answers</TableHead>
              <TableHead>Scaled Score</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scores
              .filter(score => score.module_id === moduleId)
              .map((score, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max={questionCount > 100 ? 100 : questionCount}
                      value={score.correct_answers}
                      onChange={(e) => updateScoreValue(index, 'correct_answers', parseInt(e.target.value) || 0)}
                      className="w-24"
                      onClick={(e) => e.stopPropagation()} // Prevent bubbling
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={score.scaled_score}
                      onChange={(e) => updateScoreValue(index, 'scaled_score', parseInt(e.target.value) || 0)}
                      className="w-24"
                      onClick={(e) => e.stopPropagation()} // Prevent bubbling
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => removeScoreRow(index, e)}
                      type="button" // Explicitly set type to button
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-4 bg-gray-50 rounded-md">
          <p className="text-gray-500">No scaled scoring defined. Add score mappings to customize the module scoring.</p>
        </div>
      )}
    </div>
  );
};

export default ScaledScoreTable;
