import React, { useState } from "react";
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
  layout?: 'horizontal' | 'vertical'; // New prop for layout direction
}

type FilterType = 'all' | 'unanswered' | 'answered' | 'flagged';

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  currentIndex,
  userAnswers,
  flaggedQuestions,
  onQuestionClick,
  layout = 'horizontal',
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  // Group questions by module type dynamically
  const moduleGroups: { [moduleType: string]: QuestionData[] } = {};
  questions.forEach(q => {
    const moduleType = q.module_type || 'reading_writing';
    if (!moduleGroups[moduleType]) {
      moduleGroups[moduleType] = [];
    }
    moduleGroups[moduleType].push(q);
  });

  // Find the current module type
  const currentQuestion = questions[currentIndex];
  const currentModuleType = currentQuestion?.module_type || "reading_writing";

  // Create a map of question IDs to their global indices
  const questionIdToGlobalIndex = new Map(
    questions.map((q, index) => [q.id, index])
  );

  const renderQuestionButtons = (moduleQuestions: QuestionData[], moduleType: string) => {
    const isVertical = layout === 'vertical';
    
    return (
      <div className={cn(
        isVertical ? "flex flex-col gap-2" : "flex flex-wrap gap-2"
      )}>
        {moduleQuestions.map((question, moduleIndex) => {
          const globalIndex = questionIdToGlobalIndex.get(question.id) ?? 0;
          const isAnswered = !!userAnswers[question.id];
          const isFlagged = flaggedQuestions.has(question.id);
          const isCurrent = globalIndex === currentIndex;
          
          return (
            <button
              key={question.id}
              className={cn(
                "flex items-center justify-center rounded-md border text-sm font-medium transition-colors",
                isVertical ? "w-12 h-12" : "w-10 h-10",
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

  // Legend component for vertical layout
  const Legend = () => {
    if (layout !== 'vertical') return null;
    
    const handleFilterClick = (filter: FilterType) => {
      setActiveFilter(filter === activeFilter ? 'all' : filter);
    };
    
    return (
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border space-y-2">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Filter</h4>
        <button
          onClick={() => handleFilterClick('all')}
          className={cn(
            "w-full flex items-center gap-2 text-xs p-2 rounded-md transition-colors hover:bg-gray-100",
            activeFilter === 'all' && "bg-blue-100 hover:bg-blue-100"
          )}
        >
          <div className="w-6 h-6 rounded-md border bg-gray-50 flex items-center justify-center flex-shrink-0"></div>
          <span className="flex-1 text-left">All</span>
        </button>
        <button
          onClick={() => handleFilterClick('unanswered')}
          className={cn(
            "w-full flex items-center gap-2 text-xs p-2 rounded-md transition-colors hover:bg-gray-100",
            activeFilter === 'unanswered' && "bg-blue-100 hover:bg-blue-100"
          )}
        >
          <div className="w-6 h-6 rounded-md border bg-gray-50 flex items-center justify-center flex-shrink-0"></div>
          <span className="flex-1 text-left">Unanswered</span>
        </button>
        <button
          onClick={() => handleFilterClick('answered')}
          className={cn(
            "w-full flex items-center gap-2 text-xs p-2 rounded-md transition-colors hover:bg-gray-100",
            activeFilter === 'answered' && "bg-blue-100 hover:bg-blue-100"
          )}
        >
          <div className="w-6 h-6 rounded-md border bg-green-100 border-green-300 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-green-600" />
          </div>
          <span className="flex-1 text-left">Answered</span>
        </button>
        <button
          onClick={() => handleFilterClick('flagged')}
          className={cn(
            "w-full flex items-center gap-2 text-xs p-2 rounded-md transition-colors hover:bg-gray-100",
            activeFilter === 'flagged' && "bg-blue-100 hover:bg-blue-100"
          )}
        >
          <div className="w-6 h-6 rounded-md border bg-amber-100 border-amber-300 flex items-center justify-center flex-shrink-0">
            <Flag className="w-3 h-3 text-amber-600" />
          </div>
          <span className="flex-1 text-left">Flagged</span>
        </button>
      </div>
    );
  };

  const isVertical = layout === 'vertical';
  
  // For vertical layout, show all questions in a single column without tabs
  if (isVertical) {
    // Filter questions based on active filter
    const filteredQuestions = questions.filter((question, index) => {
      const isAnswered = !!userAnswers[question.id];
      const isFlagged = flaggedQuestions.has(question.id);
      
      switch (activeFilter) {
        case 'unanswered':
          return !isAnswered;
        case 'answered':
          return isAnswered;
        case 'flagged':
          return isFlagged;
        default:
          return true; // 'all'
      }
    });
    
    // Create a map of filtered question IDs to original indices
    const filteredIdToOriginalIndex = new Map(
      filteredQuestions.map(filteredQ => {
        const originalIndex = questions.findIndex(q => q.id === filteredQ.id);
        return [filteredQ.id, originalIndex];
      })
    );
    
    return (
      <div className={cn(
        "h-full flex flex-col"
      )}>
        <h3 className="text-sm font-semibold mb-3">Questions</h3>
        <Legend />
        <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
          {filteredQuestions.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              No questions found for this filter
            </div>
          ) : (
            filteredQuestions.map((question) => {
              const originalIndex = filteredIdToOriginalIndex.get(question.id) ?? 0;
              const isAnswered = !!userAnswers[question.id];
              const isFlagged = flaggedQuestions.has(question.id);
              const isCurrent = originalIndex === currentIndex;
              
              return (
                <button
                  key={question.id}
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-md border text-sm font-medium transition-colors",
                    isCurrent && "ring-2 ring-primary ring-offset-2",
                    isAnswered ? "bg-green-100 border-green-300" : "bg-gray-50",
                    isFlagged && "bg-amber-100 border-amber-300"
                  )}
                  onClick={() => onQuestionClick(originalIndex)}
                >
                  <span className="relative">
                    {question.question_number || originalIndex + 1}
                    {isAnswered && (
                      <Check className="absolute -top-1 -right-2 w-3 h-3 text-green-600" />
                    )}
                    {isFlagged && (
                      <Flag className="absolute -bottom-1 -right-2 w-3 h-3 text-amber-600" />
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }
  
  // Horizontal layout (original)
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-sm font-medium mb-3">Question Navigator</h3>
      
      <Tabs value={currentModuleType} className="w-full">
        <TabsList className="mb-4">
          {Object.entries(moduleGroups).map(([moduleType, moduleQuestions]) => {
            const getModuleDisplayName = (type: string) => {
              switch (type) {
                case "reading_writing": return "Reading & Writing";
                case "math": return "Math";
                case "english": return "English";
                case "reading": return "Reading";
                case "science": return "Science";
                case "writing": return "Writing";
                default: return type;
              }
            };
            return (
              <TabsTrigger key={moduleType} value={moduleType}>
                {getModuleDisplayName(moduleType)} ({moduleQuestions.length} questions)
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        {Object.entries(moduleGroups).map(([moduleType, moduleQuestions]) => {
          const getModuleDisplayName = (type: string) => {
            switch (type) {
              case "reading_writing": return "Reading & Writing";
              case "math": return "Math";
              case "english": return "English";
              case "reading": return "Reading";
              case "science": return "Science";
              case "writing": return "Writing";
              default: return type;
            }
          };
          return (
            <TabsContent key={moduleType} value={moduleType}>
              <Card>
                <CardHeader>
                  <CardTitle>{getModuleDisplayName(moduleType)} Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderQuestionButtons(moduleQuestions, moduleType)}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default QuestionNavigator;
