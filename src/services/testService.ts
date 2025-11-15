import { QuestionData } from "@/components/Question";
import { ScaledScore } from "@/components/admin/tests/types";
import { QuestionType, QuestionOption } from "@/components/admin/questions/types";
import { Passage, PassageQuestion, PassagePayload, PassageQuestionPayload } from "@/components/admin/passages/types";
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
    module_type: question.module_type as "reading_writing" | "math" | "english" | "reading" | "science" | "writing",
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
    
    // Map database 'category' field to 'test_category' for consistency with frontend
    // Also parse modules and scaled_scoring if they're strings
    const mappedData = (data || []).map(test => {
      let modules = test.modules;
      if (typeof modules === 'string') {
        try {
          modules = JSON.parse(modules);
        } catch (error) {
          console.error('Error parsing modules:', error);
          modules = [];
        }
      }
      
      let scaledScoring = test.scaled_scoring;
      if (typeof scaledScoring === 'string') {
        try {
          scaledScoring = JSON.parse(scaledScoring);
        } catch (error) {
          console.error('Error parsing scaled_scoring:', error);
          scaledScoring = [];
        }
      }
      
      return {
        ...test,
        test_category: test.category || 'SAT', // Map category to test_category
        modules: modules,
        scaled_scoring: scaledScoring || []
      };
    });
    
    return mappedData;
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
    
    const { test_category, ...testWithoutCategory } = test;
    const { data, error } = await supabase
      .from('tests')
      .insert([{
        ...testWithoutCategory,
        category: test.test_category || 'SAT', // Map test_category to category for database
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
    // Map category back to test_category for consistency with frontend
    return {
      ...data,
      test_category: data.category || 'SAT'
    };
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
  const { test_category, ...testWithoutCategory } = test;
  const preparedTest = {
    ...testWithoutCategory,
    // Map test_category to category for database
    category: test.test_category || 'SAT',
    // Ensure modules and scaled_scoring are properly stringified
    modules: test.modules ? JSON.stringify(test.modules) : null,
    scaled_scoring: test.scaled_scoring ? JSON.stringify(test.scaled_scoring) : null,
    // Add user_id for Row Level Security
    user_id: user.id,
  };

  console.log('=== UPDATE TEST DEBUG ===');
  console.log('Original test data:', JSON.stringify(test, null, 2));
  console.log('Prepared test data for database:', JSON.stringify(preparedTest, null, 2));
  console.log('Test category mapping:', { original: test.test_category, mapped: preparedTest.category });

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
  console.log('Database returned category:', updatedTest.category);
  
  // Clear cache for this test to ensure fresh data
  clearTestCache(test.id);
  if (updatedTest.permalink) {
    clearTestCache(updatedTest.permalink);
  }
  
  // Map category back to test_category for consistency with frontend
  const mappedResult = {
    ...updatedTest,
    test_category: updatedTest.category || 'SAT'
  };
  
  console.log('Mapped result for frontend:', JSON.stringify(mappedResult, null, 2));
  console.log('=== END UPDATE TEST DEBUG ===');
  
  return mappedResult;
};

// Utility function to validate UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Delete a test from the database
export const deleteTestInDb = async (testId) => {
  // Get the test first to clear cache by permalink too
  const { data: test } = await supabase
    .from('tests')
    .select('id, permalink')
    .eq('id', testId)
    .single();
  
  const { error } = await supabase
    .from('tests')
    .delete()
    .eq('id', testId);
  
  if (error) throw error;
  
  // Clear cache for this test
  clearTestCache(testId);
  if (test?.permalink) {
    clearTestCache(test.permalink);
  }
  
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

// Simple in-memory cache for test data
const testCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Optimized function to load test and questions in parallel
export const getTestWithQuestionsOptimized = async (testIdentifier: string): Promise<{ 
  test: any,
  questions: QuestionData[], 
  scaledScoring?: ScaledScore[] 
}> => {
  try {
    console.log('Getting test and questions optimized for identifier:', testIdentifier);
    
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(testIdentifier);
    
    // Check cache first - both by identifier (could be UUID or permalink)
    const cached = testCache.get(testIdentifier);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Loading test from cache:', testIdentifier);
      return cached.data;
    }
    
    // First load the test row by id or permalink
    const testQuery = supabase
      .from('tests')
      .select('*')
      .limit(1);
    
    const testResult = isUuid
      ? await testQuery.eq('id', testIdentifier).single()
      : await testQuery.eq('permalink', testIdentifier).single();
    
    if (testResult.error || !testResult.data) {
      console.error('Test not found:', testResult.error);
      throw new Error('Test not found');
    }
    
    const testId = testResult.data.id;
    const testPermalink = testResult.data.permalink;
    
    // Check cache again using canonical test id
    const cachedById = testCache.get(testId);
    if (cachedById && Date.now() - cachedById.timestamp < CACHE_DURATION) {
      console.log('Loading test from cache by id:', testId);
      return cachedById.data;
    }
    
    // Also check cache by permalink if it exists and differs from identifier
    if (testPermalink && testPermalink !== testIdentifier) {
      const cachedByPermalink = testCache.get(testPermalink);
      if (cachedByPermalink && Date.now() - cachedByPermalink.timestamp < CACHE_DURATION) {
        console.log('Loading test from cache by permalink:', testPermalink);
        return cachedByPermalink.data;
      }
    }
    
    // Load questions for this test id
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
    
    console.log('Found questions:', questionsData.length);
    
    // Get options for all questions in a single query
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
      convertDbQuestionToQuestionData(question, optionsData || [])
    );
    
    console.log('Converted questions:', questions.length);
    
    // Parse modules and scaled_scoring if they're stored as JSON strings
    let parsedModules = testResult.data.modules;
    if (typeof parsedModules === 'string') {
      try {
        parsedModules = JSON.parse(parsedModules);
      } catch (error) {
        console.error('Error parsing modules:', error);
        parsedModules = [];
      }
    }
    
    let parsedScaledScoring = testResult.data.scaled_scoring;
    if (typeof parsedScaledScoring === 'string') {
      try {
        parsedScaledScoring = JSON.parse(parsedScaledScoring);
      } catch (error) {
        console.error('Error parsing scaled_scoring:', error);
        parsedScaledScoring = [];
      }
    }
    
    const result = { 
      test: {
        ...testResult.data,
        test_category: testResult.data.category || testResult.data.test_category || 'SAT', // Map category to test_category
        modules: parsedModules,
        scaled_scoring: parsedScaledScoring
      },
      questions,
      scaledScoring: parsedScaledScoring || []
    };
    
    // Cache the result
    testCache.set(testId, { data: result, timestamp: Date.now() });
    
    // Also cache by permalink if it exists
    if (testResult.data.permalink) {
      testCache.set(testResult.data.permalink, { data: result, timestamp: Date.now() });
    }
    
    return result;
  } catch (error) {
    console.error('Error getting test with questions optimized:', error);
    throw error;
  }
};

// Clear cache function for testing or when needed
export const clearTestCache = (testId?: string) => {
  if (testId) {
    // Clear cache for a specific test (by ID or permalink)
    testCache.delete(testId);
    console.log('Test cache cleared for:', testId);
  } else {
    // Clear all cache
    testCache.clear();
    console.log('Test cache cleared');
  }
};

// ---- Essay grading service ----
export interface EssayGrade {
  id?: string;
  test_result_id: string;
  grader_id?: string;
  score: number | null;
  comments?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const fetchEssayGrade = async (testResultId: string): Promise<EssayGrade | null> => {
  const { data, error } = await supabase
    .from('essay_grades')
    .select('*')
    .eq('test_result_id', testResultId)
    .maybeSingle();
  if (error) throw error;
  return data as EssayGrade | null;
};

export const upsertEssayGrade = async (grade: EssayGrade): Promise<EssayGrade> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('User must be authenticated to save essay grades');
  }
  
  // First, check if a grade already exists for this test_result_id
  const existing = await fetchEssayGrade(grade.test_result_id);
  
  const payload: any = {
    test_result_id: grade.test_result_id,
    grader_id: user.id, // Always use the authenticated user's ID
    score: grade.score,
    comments: grade.comments,
    updated_at: new Date().toISOString(),
  };
  
  let data, error;
  
  if (existing) {
    // Update existing grade
    ({ data, error } = await supabase
      .from('essay_grades')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    // Insert new grade
    ({ data, error } = await supabase
      .from('essay_grades')
      .insert(payload)
      .select()
      .single());
  }
    
  if (error) {
    console.error('Error saving essay grade:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(error.message || 'Failed to save essay grade');
  }
  
  return data as EssayGrade;
};

// ===== PASSAGE MANAGEMENT FUNCTIONS =====

// Get all passages for a test
export const getTestPassages = async (testId: string): Promise<Passage[]> => {
  try {
    const { data: passages, error: passagesError } = await supabase
      .from('passages')
      .select(`
        *,
        test_questions!inner(
          id,
          text,
          explanation,
          image_url,
          question_type,
          correct_answer,
          question_number,
          question_order,
          sentence_references,
          options:test_question_options(
            id,
            text,
            is_correct
          )
        )
      `)
      .eq('test_id', testId)
      .order('passage_order', { ascending: true });

    if (passagesError) {
      console.error('Error fetching passages:', passagesError);
      throw passagesError;
    }

    // Transform the data to match our Passage interface
    return passages.map(passage => ({
      id: passage.id,
      test_id: passage.test_id,
      module_type: passage.module_type,
      title: passage.title,
      content: passage.content,
      passage_order: passage.passage_order,
      created_at: passage.created_at,
      updated_at: passage.updated_at,
      questions: passage.test_questions
        .map((q: any) => ({
          id: q.id,
          test_id: q.test_id || testId,
          passage_id: passage.id,
          question_number: q.question_number,
          text: q.text,
          explanation: q.explanation,
          imageUrl: q.image_url,
          module_type: passage.module_type,
          question_type: q.question_type,
          correct_answer: q.correct_answer,
          question_order: q.question_order,
          sentence_references: q.sentence_references ? (typeof q.sentence_references === 'string' ? JSON.parse(q.sentence_references) : q.sentence_references) : [],
          options: q.options?.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            is_correct: opt.is_correct
          })) || []
        }))
        .sort((a: any, b: any) => {
          // Sort by question_number first, then question_order if question_number is not available
          const aNum = a.question_number != null ? Number(a.question_number) : null;
          const bNum = b.question_number != null ? Number(b.question_number) : null;
          
          if (aNum !== null && bNum !== null) {
            return aNum - bNum;
          }
          if (aNum !== null) return -1;
          if (bNum !== null) return 1;
          // Fallback to question_order if question_number is not available
          const aOrder = Number(a.question_order) || 0;
          const bOrder = Number(b.question_order) || 0;
          return aOrder - bOrder;
        })
    }));
  } catch (error) {
    console.error('Error in getTestPassages:', error);
    throw error;
  }
};

// Get a single passage with its questions
export const getPassage = async (passageId: string): Promise<Passage> => {
  try {
    const { data: passage, error: passageError } = await supabase
      .from('passages')
      .select(`
        *,
        test_questions!inner(
          id,
          text,
          explanation,
          image_url,
          question_type,
          correct_answer,
          question_number,
          question_order,
          sentence_references,
          options:test_question_options(
            id,
            text,
            is_correct
          )
        )
      `)
      .eq('id', passageId)
      .single();

    if (passageError) {
      console.error('Error fetching passage:', passageError);
      throw passageError;
    }

    return {
      id: passage.id,
      test_id: passage.test_id,
      module_type: passage.module_type,
      title: passage.title,
      content: passage.content,
      passage_order: passage.passage_order,
      created_at: passage.created_at,
      updated_at: passage.updated_at,
      questions: passage.test_questions
        .map((q: any) => ({
          id: q.id,
          test_id: q.test_id || passage.test_id,
          passage_id: passage.id,
          question_number: q.question_number,
          text: q.text,
          explanation: q.explanation,
          imageUrl: q.image_url,
          module_type: passage.module_type,
          question_type: q.question_type,
          correct_answer: q.correct_answer,
          question_order: q.question_order,
          sentence_references: q.sentence_references ? (typeof q.sentence_references === 'string' ? JSON.parse(q.sentence_references) : q.sentence_references) : [],
          options: q.options?.map((opt: any) => ({
            id: opt.id,
            text: opt.text,
            is_correct: opt.is_correct
          })) || []
        }))
        .sort((a: any, b: any) => {
          // Sort by question_number first, then question_order if question_number is not available
          const aNum = a.question_number != null ? Number(a.question_number) : null;
          const bNum = b.question_number != null ? Number(b.question_number) : null;
          
          if (aNum !== null && bNum !== null) {
            return aNum - bNum;
          }
          if (aNum !== null) return -1;
          if (bNum !== null) return 1;
          // Fallback to question_order if question_number is not available
          const aOrder = Number(a.question_order) || 0;
          const bOrder = Number(b.question_order) || 0;
          return aOrder - bOrder;
        })
    };
  } catch (error) {
    console.error('Error in getPassage:', error);
    throw error;
  }
};

// Save a passage with its questions
export const savePassage = async (passageData: PassagePayload): Promise<Passage> => {
  try {
    // First, save the passage
    const { data: savedPassage, error: passageError } = await supabase
      .from('passages')
      .upsert({
        id: passageData.id || undefined,
        test_id: passageData.test_id,
        module_type: passageData.module_type,
        title: passageData.title || null,
        content: passageData.content,
        passage_order: passageData.passage_order
      })
      .select()
      .single();

    if (passageError) {
      console.error('Error saving passage:', passageError);
      throw passageError;
    }

    // Then, save the questions
    for (const questionData of passageData.questions) {
      // Save the question
      const { data: savedQuestion, error: questionError } = await supabase
        .from('test_questions')
        .upsert({
          id: questionData.id || undefined,
          test_id: passageData.test_id,
          passage_id: savedPassage.id,
          text: questionData.text,
          explanation: questionData.explanation || null,
          module_type: passageData.module_type,
          question_type: questionData.question_type,
          image_url: questionData.image_url || null,
          correct_answer: questionData.correct_answer || null,
          question_number: questionData.question_number,
          question_order: questionData.question_number, // Use question_number as order for passage questions
          sentence_references: questionData.sentence_references && questionData.sentence_references.length > 0 
            ? JSON.stringify(questionData.sentence_references) 
            : null
        })
        .select()
        .single();

      if (questionError) {
        console.error('Error saving question:', questionError);
        throw questionError;
      }

      // Save the options if it's a multiple choice question
      if (questionData.question_type === QuestionType.MultipleChoice && questionData.options) {
        // Delete existing options first
        await supabase
          .from('test_question_options')
          .delete()
          .eq('question_id', savedQuestion.id);

        // Insert new options
        const optionsToInsert = questionData.options.map(option => ({
          id: option.id || generateUUID(),
          question_id: savedQuestion.id,
          text: option.text,
          is_correct: option.is_correct
        }));

        const { error: optionsError } = await supabase
          .from('test_question_options')
          .insert(optionsToInsert);

        if (optionsError) {
          console.error('Error saving options:', optionsError);
          throw optionsError;
        }
      }
    }

    // Return the complete passage with questions
    return await getPassage(savedPassage.id);
  } catch (error) {
    console.error('Error in savePassage:', error);
    throw error;
  }
};

// Delete a passage and all its questions
export const deletePassage = async (passageId: string): Promise<void> => {
  try {
    // Delete the passage (this will cascade delete the questions due to foreign key constraint)
    const { error } = await supabase
      .from('passages')
      .delete()
      .eq('id', passageId);

    if (error) {
      console.error('Error deleting passage:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deletePassage:', error);
    throw error;
  }
};

// Get passages grouped by module type for a test
export const getTestPassagesByModule = async (testId: string): Promise<Record<string, Passage[]>> => {
  try {
    const passages = await getTestPassages(testId);
    
    // Group passages by module_type
    const groupedPassages: Record<string, Passage[]> = {};
    passages.forEach(passage => {
      if (!groupedPassages[passage.module_type]) {
        groupedPassages[passage.module_type] = [];
      }
      groupedPassages[passage.module_type].push(passage);
    });

    // Sort passages within each module by passage_order
    Object.keys(groupedPassages).forEach(moduleType => {
      groupedPassages[moduleType].sort((a, b) => {
        const aOrder = a.passage_order ?? 0;
        const bOrder = b.passage_order ?? 0;
        return aOrder - bOrder;
      });
    });

    return groupedPassages;
  } catch (error) {
    console.error('Error in getTestPassagesByModule:', error);
    throw error;
  }
};
