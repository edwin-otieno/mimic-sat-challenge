
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardProps {
  score: number;
  total: number;
  answeredCount: number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ score, total, answeredCount }) => {
  return (
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
              {answeredCount} of {total}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
