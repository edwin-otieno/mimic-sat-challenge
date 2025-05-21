import React from "react";
import { QuestionData } from "@/components/Question";
import { cn } from "@/lib/utils";
import { Check, Flag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuestionNavigatorProps {
  questions: QuestionData[];
  currentIndex: number;
  userAnswers: Record<string, string>;
  flaggedQuestions: Set<string>;
  onQuestionClick: (index: number) => void;
}

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  currentIndex,
  userAnswers,
  flaggedQuestions,
  onQuestionClick,
}) => {
  // Group questions by module type
  const readingWritingQuestions = questions.filter(q => q.module_type === "reading_writing");
  const mathQuestions = questions.filter(q => q.module_type === "math");

  // Find the current module type
  const currentQuestion = questions[currentIndex];
  const currentModuleType = currentQuestion?.module_type || "reading_writing";

  // Create a map of question IDs to their global indices
  const questionIdToGlobalIndex = new Map(
    questions.map((q, index) => [q.id, index])
  );

  const renderQuestionButtons = (moduleQuestions: QuestionData[], moduleType: string) => {
    return (
      <div className="flex flex-wrap gap-2">
        {moduleQuestions.map((question, moduleIndex) => {
          const globalIndex = questionIdToGlobalIndex.get(question.id) ?? 0;
          const isAnswered = !!userAnswers[question.id];
          const isFlagged = flaggedQuestions.has(question.id);
          const isCurrent = globalIndex === currentIndex;
          
          return (
            <button
              key={question.id}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-md border text-sm font-medium transition-colors",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                isAnswered ? "bg-green-100 border-green-300" : "bg-gray-50",
                isFlagged && "bg-amber-100 border-amber-300"
              )}
              onClick={() => onQuestionClick(globalIndex)}
            >
              <span className="relative">
                {moduleIndex + 1}
                {isAnswered && (
                  <Check className="absolute -top-1 -right-2 w-3 h-3 text-green-600" />
                )}
                {isFlagged && (
                  <Flag className="absolute -bottom-1 -right-2 w-3 h-3 text-amber-600" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-sm font-medium mb-3">Question Navigator</h3>
      
      <Tabs defaultValue={currentModuleType} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="reading_writing">
            Reading & Writing ({readingWritingQuestions.length} questions)
          </TabsTrigger>
          <TabsTrigger value="math">
            Math ({mathQuestions.length} questions)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="reading_writing">
          <Card>
            <CardHeader>
              <CardTitle>Reading & Writing Questions</CardTitle>
            </CardHeader>
            <CardContent>
              {renderQuestionButtons(readingWritingQuestions, "reading_writing")}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="math">
          <Card>
            <CardHeader>
              <CardTitle>Math Questions</CardTitle>
            </CardHeader>
            <CardContent>
              {renderQuestionButtons(mathQuestions, "math")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuestionNavigator;
