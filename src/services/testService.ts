import { QuestionData } from "@/components/Question";
import { ScaledScore } from "@/components/admin/tests/types";
import { QuestionType, QuestionOption } from "@/components/admin/questions/types";
import { supabase } from "@/integrations/supabase/client";

const convertDbQuestionToQuestionData = (
  question: any, 
  options: any[]
): QuestionData => {
  return {
    id: question.id,
    text: question.text,
    explanation: question.explanation,
    module_type: question.module_type as "reading_writing" | "math",
    options: options
      .filter(option => option.question_id === question.id)
      .map(option => ({
        id: option.id,
        text: option.text,
        isCorrect: option.is_correct
      }))
  };
};

// Get test questions from database
export const getTestQuestionsFromDb = async (testId: string): Promise<{ 
  questions: QuestionData[], 
  scaledScoring?: ScaledScore[] 
}> => {
  try {
    // Get questions for the test
    const { data: questionsData, error: questionsError } = await supabase
      .from('test_questions')
      .select('*')
      .eq('test_id', testId);
      
    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      throw questionsError;
    }
    
    // Get options for all questions
    const questionIds = questionsData.map(q => q.id);
    const { data: optionsData, error: optionsError } = await supabase
      .from('test_question_options')
      .select('*')
      .in('question_id', questionIds);
      
    if (optionsError) {
      console.error('Error fetching question options:', optionsError);
      throw optionsError;
    }
    
    // Convert to QuestionData format
    const questions: QuestionData[] = questionsData.map(question => 
      convertDbQuestionToQuestionData(question, optionsData)
    );
    
    return { questions };
  } catch (error) {
    console.error('Error getting test questions from DB:', error);
    throw error;
  }
};

// Mock test data service (fallback)
export const getTestQuestions = (testId: string): { questions: QuestionData[], scaledScoring?: ScaledScore[] } => {
  // Try to get questions from DB first
  getTestQuestionsFromDb(testId)
    .then(result => {
      console.log('Got questions from DB:', result);
      if (result.questions.length > 0) {
        return result;
      }
    })
    .catch(error => {
      console.error('Failed to get questions from DB, using mock data:', error);
    });

  // This would typically come from an API
  const questions: QuestionData[] = [
    {
      id: "q1",
      text: "The author's primary purpose in the passage is to:",
      options: [
        { id: "q1-a", text: "argue against a popular scientific theory", isCorrect: false },
        { id: "q1-b", text: "explain the historical development of an idea", isCorrect: true },
        { id: "q1-c", text: "compare competing interpretations of evidence", isCorrect: false },
        { id: "q1-d", text: "challenge a conventional understanding", isCorrect: false },
      ],
      explanation: "The passage primarily tracks how the concept evolved over time, making B the correct answer.",
      module_type: "reading_writing"
    },
    {
      id: "q2",
      text: "According to the passage, which of the following is true about the experiment?",
      options: [
        { id: "q2-a", text: "It confirmed the researchers' initial hypothesis", isCorrect: false },
        { id: "q2-b", text: "It yielded unexpected results that challenged existing theories", isCorrect: true },
        { id: "q2-c", text: "It failed to produce statistically significant data", isCorrect: false },
        { id: "q2-d", text: "It was criticized for methodological flaws", isCorrect: false },
      ],
      explanation: "The passage mentions that the results surprised researchers and contradicted established theories.",
      module_type: "reading_writing"
    },
    {
      id: "q3",
      text: "In the equation 3x + 5 = 17, what is the value of x?",
      options: [
        { id: "q3-a", text: "4", isCorrect: true },
        { id: "q3-b", text: "6", isCorrect: false },
        { id: "q3-c", text: "7", isCorrect: false },
        { id: "q3-d", text: "12", isCorrect: false },
      ],
      explanation: "3x + 5 = 17 → 3x = 12 → x = 4",
      module_type: "math"
    },
    {
      id: "q4",
      text: "Which of the following best describes the function f(x) = x² - 3x + 2?",
      options: [
        { id: "q4-a", text: "Linear with y-intercept at (0, 2)", isCorrect: false },
        { id: "q4-b", text: "Quadratic with minimum value at x = 1.5", isCorrect: true },
        { id: "q4-c", text: "Quadratic with maximum value at x = 1.5", isCorrect: false },
        { id: "q4-d", text: "Exponential with horizontal asymptote at y = 2", isCorrect: false },
      ],
      explanation: "This is a quadratic function. The vertex form is f(x) = (x - 1.5)² - 0.25, which has a minimum at x = 1.5.",
      module_type: "math"
    },
    {
      id: "q5",
      text: "The main rhetorical strategy used in the third paragraph is:",
      options: [
        { id: "q5-a", text: "Comparison and contrast", isCorrect: true },
        { id: "q5-b", text: "Definition and example", isCorrect: false },
        { id: "q5-c", text: "Problem and solution", isCorrect: false },
        { id: "q5-d", text: "Cause and effect", isCorrect: false },
      ],
      explanation: "The paragraph primarily contrasts two different approaches or viewpoints.",
      module_type: "reading_writing"
    },
  ];
  
  // Add more questions for a complete test
  for (let i = 6; i <= 10; i++) {
    questions.push({
      id: `q${i}`,
      text: `Sample question ${i} for test ${testId}`,
      module_type: i % 2 === 0 ? "math" : "reading_writing",
      options: [
        { id: `q${i}-a`, text: "Option A", isCorrect: i % 4 === 0 },
        { id: `q${i}-b`, text: "Option B", isCorrect: i % 4 === 1 },
        { id: `q${i}-c`, text: "Option C", isCorrect: i % 4 === 2 },
        { id: `q${i}-d`, text: "Option D", isCorrect: i % 4 === 3 },
      ],
    });
  }

  // Mock scaled scoring data - in a real app, this would come from the test configuration
  const scaledScoring: ScaledScore[] = [
    { correct_answers: 0, scaled_score: 0 },
    { correct_answers: 3, scaled_score: 30 },
    { correct_answers: 5, scaled_score: 50 },
    { correct_answers: 7, scaled_score: 70 },
    { correct_answers: 10, scaled_score: 100 },
    // Module-specific scoring
    { module_id: `${testId}-reading_writing`, correct_answers: 0, scaled_score: 0 },
    { module_id: `${testId}-reading_writing`, correct_answers: 2, scaled_score: 50 },
    { module_id: `${testId}-reading_writing`, correct_answers: 5, scaled_score: 100 },
    { module_id: `${testId}-math`, correct_answers: 0, scaled_score: 0 },
    { module_id: `${testId}-math`, correct_answers: 2, scaled_score: 50 },
    { module_id: `${testId}-math`, correct_answers: 5, scaled_score: 100 }
  ];

  return { questions, scaledScoring };
};

// Save a question to the database
export const saveQuestion = async (question: any) => {
  try {
    // First, insert the question
    const { data: savedQuestion, error: questionError } = await supabase
      .from('test_questions')
      .upsert({
        id: question.id || undefined, // If ID is present, it's an update
        test_id: question.test_id,
        text: question.text,
        explanation: question.explanation || null,
        module_type: question.module_type || 'reading_writing',
        question_type: question.question_type || 'multiple_choice',
        image_url: question.image_url || null
      })
      .select()
      .single();
      
    if (questionError) {
      console.error('Error saving question:', questionError);
      throw questionError;
    }
    
    // Then, handle options
    if (question.options && question.options.length > 0) {
      // First get existing options for this question
      const { data: existingOptions } = await supabase
        .from('test_question_options')
        .select('id')
        .eq('question_id', savedQuestion.id);
      
      const existingOptionIds = new Set(existingOptions?.map(o => o.id) || []);
      const newOptionIds = new Set(question.options.map(o => o.id).filter(Boolean));
      
      // Find options to delete (exist in DB but not in new options)
      const optionsToDelete = existingOptionIds.size > 0 
        ? [...existingOptionIds].filter(id => !newOptionIds.has(id))
        : [];
      
      if (optionsToDelete.length > 0) {
        await supabase
          .from('test_question_options')
          .delete()
          .in('id', optionsToDelete);
      }
      
      // Upsert options - ensure each option has the required text field
      const optionsToUpsert = question.options.map(option => ({
        id: option.id || undefined,
        question_id: savedQuestion.id,
        text: option.text || "", // Ensure text is always provided
        is_correct: option.is_correct || false
      }));
      
      const { error: optionsError } = await supabase
        .from('test_question_options')
        .upsert(optionsToUpsert);
        
      if (optionsError) {
        console.error('Error saving question options:', optionsError);
        throw optionsError;
      }
    }
    
    return savedQuestion;
  } catch (error) {
    console.error('Error in saveQuestion:', error);
    throw error;
  }
};

// Delete a question from the database
export const deleteQuestion = async (questionId: string) => {
  try {
    // Options will be automatically deleted due to cascading delete
    const { error } = await supabase
      .from('test_questions')
      .delete()
      .eq('id', questionId);
      
    if (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteQuestion:', error);
    throw error;
  }
};
