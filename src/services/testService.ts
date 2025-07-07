import { QuestionData } from "@/components/Question";
import { ScaledScore } from "@/components/admin/tests/types";
import { QuestionType, QuestionOption } from "@/components/admin/questions/types";
import { supabase } from '@/integrations/supabase/client';
import { Test } from '@/types/Test';

// Polyfill for generating UUID if not natively supported
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const convertDbQuestionToQuestionData = (
  question: any, 
  options: any[]
): QuestionData => {
  return {
    id: question.id,
    text: question.text,
    explanation: question.explanation,
    module_type: question.module_type as "reading_writing" | "math",
    imageUrl: question.image_url,
    question_type: question.question_type,
    correct_answer: question.correct_answer,
    options: options
      .filter(option => option.question_id === question.id)
      .map(option => ({
        id: option.id,
        text: option.text,
        is_correct: option.is_correct
      }))
  };
};

// Get test questions from database
export const getTestQuestionsFromDb = async (testId: string): Promise<{ 
  questions: QuestionData[], 
  scaledScoring?: ScaledScore[] 
}> => {
  try {
    console.log('Fetching questions for test ID:', testId);
    
    // Get questions for the test
    const { data: questionsData, error: questionsError } = await supabase
      .from('test_questions')
      .select('*')
      .eq('test_id', testId)
      .order('question_order', { ascending: true });
      
    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      throw questionsError;
    }

    if (!questionsData || questionsData.length === 0) {
      console.error('No questions found for test ID:', testId);
      return { questions: [] };
    }
    
    console.log('Found questions:', questionsData);
    
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
    
    console.log('Found options:', optionsData);
    
    // Convert to QuestionData format
    const questions: QuestionData[] = questionsData.map(question => 
      convertDbQuestionToQuestionData(question, optionsData || [])
    );
    
    console.log('Converted questions:', questions);
    
    return { questions };
  } catch (error) {
    console.error('Error getting test questions from DB:', error);
    throw error;
  }
};

// Get test questions from database
export const getTestQuestions = async (testId: string): Promise<{ 
  questions: QuestionData[], 
  scaledScoring?: ScaledScore[] 
}> => {
  try {
    console.log('Getting test questions for test ID:', testId);
    
    // First verify the test exists
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();
      
    if (testError || !test) {
      console.error('Test not found:', testError);
      throw new Error('Test not found');
    }
    
    // Get questions for the test
    const { data: questionsData, error: questionsError } = await supabase
      .from('test_questions')
      .select('*')
      .eq('test_id', testId)
      .order('question_order', { ascending: true });
      
    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      throw questionsError;
    }

    if (!questionsData || questionsData.length === 0) {
      console.error('No questions found for test ID:', testId);
      throw new Error('No questions found for this test');
    }
    
    console.log('Found questions:', questionsData);
    
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
    
    console.log('Found options:', optionsData);
    
    // Convert to QuestionData format
    const questions: QuestionData[] = questionsData.map(question => 
      convertDbQuestionToQuestionData(question, optionsData || [])
    );
    
    console.log('Converted questions:', questions);
    
    return { 
      questions,
      scaledScoring: test.scaled_scoring ? JSON.parse(test.scaled_scoring) : []
    };
  } catch (error) {
    console.error('Error getting test questions:', error);
    throw error;
  }
};

// Save a question to the database
export const saveQuestion = async (question: any) => {
  try {
    // First, insert the question
    const { data: savedQuestion, error: questionError } = await supabase
      .from('test_questions')
      .upsert({
        id: question.id || undefined,
        test_id: question.test_id,
        text: question.text,
        explanation: question.explanation || null,
        module_type: question.module_type || 'reading_writing',
        question_type: question.question_type || 'multiple_choice',
        image_url: question.image_url || null,
        correct_answer: question.correct_answer || null,
        question_order: question.id 
          ? question.question_order // Keep existing order for updates
          : (await supabase
              .from('test_questions')
              .select('question_order')
              .eq('test_id', question.test_id)
              .order('question_order', { ascending: false })
              .limit(1)
              .single()
            ).data?.question_order + 1 || 0 // Get max order + 1 for new questions
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
        id: option.id || generateUUID(), // Generate UUID for new options
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

// --- TEST CRUD LOGIC ---

// Get all tests from the database
export const getTests = async () => {
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100); // Add a reasonable limit
      
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getTests:', error);
    throw error;
  }
};

// Create a new test in the database
export const createTestInDb = async (test: Test): Promise<Test> => {
  try {
    console.log('Creating test in database:', test);
    
    // Generate permalink from title
    const permalink = test.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length to 50 chars
    
    console.log('Generated permalink:', permalink);
    
    const { data, error } = await supabase
      .from('tests')
      .insert([{
        ...test,
        permalink,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
      
    if (error) {
      console.error('Error creating test:', error);
      throw error;
    }
    
    console.log('Test created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in createTestInDb:', error);
    throw error;
  }
};

// Update an existing test in the database
export const updateTestInDb = async (test) => {
  // Get the current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Authentication Error:', authError);
    throw new Error('User must be authenticated to update tests');
  }

  // Validate test ID
  if (!test.id) {
    throw new Error('Test ID is required for updates');
  }

  console.log('Attempting to update test with ID:', test.id);

  // First, check if the test exists
  const { data: existingTest, error: findError } = await supabase
    .from('tests')
    .select('*')
    .eq('id', test.id)
    .single();

  if (findError) {
    console.error('Error finding test:', findError);
    console.error('Test ID that failed:', test.id);
    throw new Error('Test not found');
  }

  if (!existingTest) {
    console.error('No test found with ID:', test.id);
    throw new Error('Test not found');
  }

  // Prepare the test object for Supabase
  const preparedTest = {
    ...test,
    // Ensure modules and scaled_scoring are properly stringified
    modules: test.modules ? JSON.stringify(test.modules) : null,
    scaled_scoring: test.scaled_scoring ? JSON.stringify(test.scaled_scoring) : null,
    // Add user_id for Row Level Security
    user_id: user.id,
  };

  console.log('Updating test with data:', JSON.stringify(preparedTest, null, 2));

  // Update the existing test
  const { data: updatedTest, error: updateError } = await supabase
    .from('tests')
    .update(preparedTest)
    .eq('id', test.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating test:', updateError);
    console.error('Update error details:', {
      code: updateError.code,
      message: updateError.message,
      details: updateError.details
    });
    // Provide more specific error message based on the error code
    if (updateError.code === '23505') {
      throw new Error('A test with this ID already exists');
    } else if (updateError.code === '22P02') {
      throw new Error('Invalid data format');
    } else if (updateError.code === '42501') {
      throw new Error('Permission denied. You may not have the right to update this test.');
    } else {
      throw new Error(`Failed to update test: ${updateError.message}`);
    }
  }

  if (!updatedTest) {
    console.error('No test returned after update');
    throw new Error('Failed to update test: No data returned');
  }

  console.log('Successfully updated test:', JSON.stringify(updatedTest, null, 2));
  return updatedTest;
};

// Utility function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Delete a test from the database
export const deleteTestInDb = async (testId) => {
  const { error } = await supabase
    .from('tests')
    .delete()
    .eq('id', testId);
  if (error) throw error;
  return true;
};

// Migrate existing tests to use UUID
export const migrateTestsToUUID = async () => {
  // Fetch all existing tests
  const { data: tests, error: fetchError } = await supabase
    .from('tests')
    .select('*');

  if (fetchError) {
    console.error('Error fetching tests:', fetchError);
    throw fetchError;
  }

  // Migrate each test
  const migrationPromises = tests.map(async (test) => {
    // Generate a new UUID if the current ID is not valid
    const validUUID = isValidUUID(test.id) ? test.id : generateUUID();

    // Update the test with the new UUID
    const { error: updateError } = await supabase
      .from('tests')
      .update({ 
        id: validUUID,
        // Ensure other fields are properly formatted
        modules: test.modules ? JSON.stringify(test.modules) : null,
        scaled_scoring: test.scaled_scoring ? JSON.stringify(test.scaled_scoring) : null,
      })
      .eq('id', test.id);

    if (updateError) {
      console.error(`Error migrating test ${test.id}:`, updateError);
    }

    return updateError;
  });

  // Wait for all migrations to complete
  const migrationResults = await Promise.allSettled(migrationPromises);

  // Log migration summary
  const successCount = migrationResults.filter(
    result => result.status === 'fulfilled'
  ).length;
  const failureCount = migrationResults.filter(
    result => result.status === 'rejected'
  ).length;

  console.log(`Migration complete. Successful: ${successCount}, Failed: ${failureCount}`);

  return {
    successCount,
    failureCount,
    totalTests: tests.length
  };
};
