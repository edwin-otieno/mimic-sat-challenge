import React, { useMemo } from "react";
import Question, { QuestionData, QuestionType } from "@/components/Question";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuestionReviewProps {
  questions: QuestionData[];
  userAnswers: Record<string, string>;
  moduleType?: string; // Optional: filter questions by module type
  testCategory?: 'SAT' | 'ACT'; // Test category for ACT alternating lettering
}

const QuestionReview: React.FC<QuestionReviewProps> = React.memo(({ questions, userAnswers, moduleType, testCategory }) => {
  console.log('🔍 QuestionReview received:', { 
    questionsLength: questions.length, 
    userAnswersKeys: Object.keys(userAnswers || {}).length,
    firstQuestionId: questions[0]?.id,
    firstAnswer: userAnswers?.[questions[0]?.id],
    sampleAnswerKeys: Object.keys(userAnswers || {}).slice(0, 10),
    sampleQuestionIds: questions.slice(0, 10).map(q => ({ id: q.id, order: q.question_order, number: q.question_number })),
    userAnswersType: typeof userAnswers,
    userAnswersIsNull: userAnswers === null,
    userAnswersIsUndefined: userAnswers === undefined
  });
  
  // Check if any question IDs match any answer keys
  if (userAnswers && questions.length > 0) {
    const questionIds = questions.map(q => q.id);
    const answerKeys = Object.keys(userAnswers);
    const matches = questionIds.filter(qId => answerKeys.includes(qId));
    console.log('🔍 Answer matching analysis:', {
      totalQuestions: questionIds.length,
      totalAnswerKeys: answerKeys.length,
      directMatches: matches.length,
      sampleMatches: matches.slice(0, 5),
      sampleNonMatchingQuestionIds: questionIds.filter(qId => !answerKeys.includes(qId)).slice(0, 5),
      sampleNonMatchingAnswerKeys: answerKeys.filter(aKey => !questionIds.includes(aKey)).slice(0, 5)
    });
  }
  
  // Group questions by module type - memoize to prevent recalculation
  const { moduleGroups } = useMemo(() => {
    let filteredQuestions = questions;
    
    // If moduleType is specified, filter questions by that module
    if (moduleType) {
      filteredQuestions = questions.filter(q => q.module_type === moduleType);
    }
    
    // Group questions by module type dynamically
    const moduleGroups: { [moduleType: string]: QuestionData[] } = {};
    filteredQuestions.forEach(q => {
      const moduleType = q.module_type || 'reading_writing';
      if (!moduleGroups[moduleType]) {
        moduleGroups[moduleType] = [];
      }
      moduleGroups[moduleType].push(q);
    });
    return { moduleGroups };
  }, [questions, moduleType]);

  // Function to get option letters based on test category and question number
  // For ACT tests: alternate between A/B/C/D (odd) and F/G/H/J (even) based on question number
  // For SAT tests: always use A/B/C/D/E
  const getOptionLetter = (question: QuestionData, optionIndex: number): string => {
    if (testCategory === 'ACT') {
      // Use question_number, question_order, or fallback to index
      const qNum = question.question_number ?? question.question_order ?? (questions.findIndex(q => q.id === question.id) + 1);
      // ACT alternates: odd = A/B/C/D, even = F/G/H/J
      const letters = qNum % 2 === 1 ? ['A', 'B', 'C', 'D'] : ['F', 'G', 'H', 'J'];
      return letters[optionIndex] || String.fromCharCode(65 + optionIndex);
    }
    // Default: A, B, C, D, E
    return String.fromCharCode(65 + optionIndex);
  };

  const renderQuestionList = useMemo(() => {
    return (questions: QuestionData[]) => {
      return (
        <div className="space-y-8">
          {questions.map((question, index) => {
            // Try multiple key formats to find the answer
            const userAnswerId = userAnswers?.[question.id] 
              || userAnswers?.[`question_${question.id}`]
              || (question.question_order && userAnswers?.[question.question_order.toString()])
              || (question.question_number && userAnswers?.[question.question_number.toString()]);
            
            // Log only for first few questions to avoid spam
            if (index < 3) {
              console.log(`Question ${index + 1} (ID: ${question.id}, order: ${question.question_order}, number: ${question.question_number}):`, {
                hasAnswer: !!userAnswerId,
                answerValue: userAnswerId,
                matchedKey: userAnswers?.[question.id] ? question.id : 
                           userAnswers?.[`question_${question.id}`] ? `question_${question.id}` :
                           (question.question_order && userAnswers?.[question.question_order.toString()]) ? question.question_order.toString() :
                           (question.question_number && userAnswers?.[question.question_number.toString()]) ? question.question_number.toString() : 'none'
              });
            }
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
              const correctOptionIndex = question.options?.findIndex(o => o.is_correct) ?? -1;
              
              if (userSelectedOption?.is_correct) {
                resultIndicator = (
                  <div className="text-green-600 mb-2">
                    Correct
                  </div>
                );
              } else {
                // Use the alternating lettering function for ACT tests
                const correctLetter = correctOptionIndex >= 0 
                  ? getOptionLetter(question, correctOptionIndex)
                  : '?';
                resultIndicator = (
                  <div className="text-red-500 mb-2">
                    Incorrect. The correct answer was: {correctLetter}
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
                  testCategory={testCategory}
                  sequentialQuestionNumber={question.question_number ?? question.question_order ?? (index + 1)}
                />
              </div>
            );
          })}
        </div>
      );
    };
  }, [userAnswers, testCategory, questions]);

  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-4">Review Your Answers</h3>
      
      {/* If moduleType is specified, show simplified view without tabs */}
      {moduleType ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {moduleType === 'reading_writing' ? 'Reading & Writing' : 
               moduleType === 'math' ? 'Math' :
               moduleType === 'english' ? 'English' :
               moduleType === 'reading' ? 'Reading' :
               moduleType === 'science' ? 'Science' :
               moduleType === 'writing' ? 'Writing' : moduleType} Questions ({Object.values(moduleGroups).flat().length} questions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderQuestionList(Object.values(moduleGroups).flat())}
          </CardContent>
        </Card>
      ) : (
        /* Show tabs for full test review */
        <Tabs defaultValue={Object.keys(moduleGroups)[0]} className="w-full">
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
                    {renderQuestionList(moduleQuestions)}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
});

QuestionReview.displayName = 'QuestionReview';

export default QuestionReview;
