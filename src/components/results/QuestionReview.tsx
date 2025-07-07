import React, { useMemo } from "react";
import Question, { QuestionData, QuestionType } from "@/components/Question";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuestionReviewProps {
  questions: QuestionData[];
  userAnswers: Record<string, string>;
}

const QuestionReview: React.FC<QuestionReviewProps> = React.memo(({ questions, userAnswers }) => {
  // Group questions by module type - memoize to prevent recalculation
  const { readingWritingQuestions, mathQuestions } = useMemo(() => {
    const readingWriting = questions.filter(q => q.module_type === "reading_writing");
    const math = questions.filter(q => q.module_type === "math");
    return { readingWritingQuestions: readingWriting, mathQuestions: math };
  }, [questions]);

  const renderQuestionList = useMemo(() => {
    return (questions: QuestionData[]) => {
      return (
        <div className="space-y-8">
          {questions.map((question, index) => {
            const userAnswerId = userAnswers[question.id];
            let resultIndicator;
            
            if (!userAnswerId) {
              let correctAnswerDisplay = null;
              if (question.question_type === QuestionType.TextInput && question.correct_answer) {
                correctAnswerDisplay = (
                  <>
                    <br />
                    <span className="font-medium">The correct answer{question.correct_answer.split(';').length === 1 ? ' is' : 's are'}:</span>
                    <ul className="list-disc list-inside mt-1">
                      {question.correct_answer.split(';').map((ans, index) => (
                        <li key={index}>{ans.trim()}</li>
                      ))}
                    </ul>
                  </>
                );
              } else if (question.question_type === QuestionType.MultipleChoice && question.options) {
                const correctOptions = question.options.filter(o => o.is_correct);
                correctAnswerDisplay = (
                  <>
                    <br />
                    <span className="font-medium">The correct answer{correctOptions.length === 1 ? ' is' : 's are'}:</span>
                    <ul className="list-disc list-inside mt-1">
                      {correctOptions.length > 0 ? (
                        correctOptions.map((o, i) => (
                          <li key={i}>{o.text}</li>
                        ))
                      ) : (
                        <li>No correct answer set</li>
                      )}
                    </ul>
                  </>
                );
              }
              resultIndicator = (
                <div className="text-yellow-500 mb-2">
                  Not answered.{correctAnswerDisplay}
                </div>
              );
            } else if (question.question_type === QuestionType.TextInput) {
              const isCorrect = question.correct_answer
                ?.split(';')
                .map(a => a.trim().toLowerCase())
                .some(correctAnswer => userAnswerId.trim().toLowerCase() === correctAnswer);
              
              resultIndicator = (
                <div className={`mb-2 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                  {isCorrect ? 'Correct' : 'Incorrect'}
                </div>
              );
            } else {
              const userSelectedOption = question.options?.find(option => option.id === userAnswerId);
              const correctOption = question.options?.find(option => option.is_correct);
              
              if (userSelectedOption?.is_correct) {
                resultIndicator = (
                  <div className="text-green-600 mb-2">
                    Correct
                  </div>
                );
              } else {
                resultIndicator = (
                  <div className="text-red-500 mb-2">
                    Incorrect. The correct answer was: {
                      question.options?.findIndex(o => o.is_correct) === 0 ? "A" :
                      question.options?.findIndex(o => o.is_correct) === 1 ? "B" :
                      question.options?.findIndex(o => o.is_correct) === 2 ? "C" :
                      "D"
                    }
                  </div>
                );
              }
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
                  textAnswer={userAnswerId}
                  onAnswerChange={() => {}} // Read-only
                  showExplanation={true}
                />
              </div>
            );
          })}
        </div>
      );
    };
  }, [userAnswers]);

  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-4">Review Your Answers</h3>
      
      <Tabs defaultValue="reading_writing" className="w-full">
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
              {renderQuestionList(readingWritingQuestions)}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="math">
          <Card>
            <CardHeader>
              <CardTitle>Math Questions</CardTitle>
            </CardHeader>
            <CardContent>
              {renderQuestionList(mathQuestions)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

QuestionReview.displayName = 'QuestionReview';

export default QuestionReview;
