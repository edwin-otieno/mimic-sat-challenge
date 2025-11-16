import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useTests } from '@/hooks/useTests';
import { useAuth } from '@/contexts/AuthContext';
import { fetchEssayGrade, upsertEssayGrade } from '@/services/testService';

const RESULTS_PER_PAGE = 15;

const StudentResults = () => {
  const { toast } = useToast();
  const { tests } = useTests();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [moduleResults, setModuleResults] = useState<any[]>([]);
  const [selectedTestCategory, setSelectedTestCategory] = useState<'SAT' | 'ACT' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const { isAdmin, isTeacher } = useAuth();
  const canGrade = isAdmin || isTeacher;
  const [essayText, setEssayText] = useState<string | null>(null);
  const [essayScore, setEssayScore] = useState<number | ''>('');
  const [essayComments, setEssayComments] = useState<string>('');
  const [essayLoading, setEssayLoading] = useState<boolean>(false);
  
  // Fetch all student results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        
        // Get students
        const { data: studentsData, error: studentsError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, school_id')
          .eq('role', 'student');
          
        if (studentsError) {
          throw studentsError;
        }
        
        setStudents(studentsData || []);
        
        // Get schools
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('id, name')
          .order('name', { ascending: true });
          
        if (schoolsError) {
          console.error('Error fetching schools:', schoolsError);
        } else {
          setSchools(schoolsData || []);
        }
        
        // Get test results based on filters (including in-progress tests)
        let query = supabase
          .from('test_results')
          .select('id, test_id, user_id, total_score, total_questions, scaled_score, created_at, time_taken, is_completed', { count: 'exact' });
          
        if (selectedStudent !== 'all') {
          query = query.eq('user_id', selectedStudent);
        }
        
        if (selectedTest !== 'all') {
          query = query.eq('test_id', selectedTest);
        }
        
        // Filter by school if selected
        if (selectedSchool !== 'all') {
          // First, get all student IDs for the selected school
          const { data: schoolStudents, error: schoolStudentsError } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'student')
            .eq('school_id', selectedSchool);
          
          if (schoolStudentsError) {
            console.error('Error fetching school students:', schoolStudentsError);
          } else if (schoolStudents && schoolStudents.length > 0) {
            const studentIds = schoolStudents.map(s => s.id);
            query = query.in('user_id', studentIds);
          } else {
            // No students in this school, return empty results
            query = query.eq('user_id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
          }
        }
        
        // Add pagination
        const from = (currentPage - 1) * RESULTS_PER_PAGE;
        const to = from + RESULTS_PER_PAGE - 1;
        query = query.range(from, to).order('created_at', { ascending: false });
        
        const { data, error, count } = await query;
        
        if (error) {
          throw error;
        }
        
        setTotalResults(count || 0);
        
        // Deduplicate results: For each user/test combination, keep only the most recent completed one,
        // or the in-progress one if no completed exists
        const deduplicatedData = data.reduce((acc: any[], current: any) => {
          const key = `${current.user_id}-${current.test_id}`;
          const existing = acc.find(r => `${r.user_id}-${r.test_id}` === key);
          
          if (!existing) {
            acc.push(current);
          } else {
            // Prefer completed over in-progress
            const currentIsCompleted = current.is_completed === true;
            const existingIsCompleted = existing.is_completed === true;
            
            if (currentIsCompleted && !existingIsCompleted) {
              // Replace in-progress with completed
              const index = acc.indexOf(existing);
              acc[index] = current;
            } else if (!currentIsCompleted && existingIsCompleted) {
              // Keep existing completed, ignore in-progress
              // Do nothing
            } else {
              // Both same status, keep the most recent
              const currentDate = new Date(current.created_at);
              const existingDate = new Date(existing.created_at);
              if (currentDate > existingDate) {
                const index = acc.indexOf(existing);
                acc[index] = current;
              }
            }
          }
          return acc;
        }, []);
        
        // Get user profiles for each result
        const formattedResults = await Promise.all(deduplicatedData.map(async result => {
          // Fetch the user profile separately
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', result.user_id)
            .single();
            
          if (profileError) {
            console.error('Error fetching profile:', profileError);
            return {
              ...result,
              studentName: 'Unknown User',
              studentEmail: 'N/A',
              testName: tests.find(test => test.id === result.test_id)?.title || result.test_id,
              completedAt: new Date(result.created_at).toLocaleString(),
              score: `${result.total_score}/${result.total_questions}`,
              percentage: Math.round((result.total_score / result.total_questions) * 100)
            };
          }
          
          return {
            ...result,
            studentName: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'No Name',
            studentEmail: profileData.email || 'No Email',
            testName: tests.find(test => test.id === result.test_id)?.title || result.test_id,
            completedAt: new Date(result.created_at).toLocaleString(),
            score: `${result.total_score}/${result.total_questions}`,
            percentage: result.total_questions > 0 ? Math.round((result.total_score / result.total_questions) * 100) : 0,
            is_completed: result.is_completed !== null && result.is_completed !== undefined ? result.is_completed : true // Default to true for backward compatibility, but preserve false values
          };
        }));
        
        setResults(formattedResults);
      } catch (error: any) {
        toast({ 
          title: "Error", 
          description: "Failed to load student results: " + error.message,
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [selectedTest, selectedStudent, selectedSchool, tests, toast, currentPage]);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTest, selectedStudent, selectedSchool]);
  
  // Debug: Log selectedResult changes
  useEffect(() => {
    if (selectedResult) {
      console.log('🔍 selectedResult updated:', {
        id: selectedResult.id,
        is_completed: selectedResult.is_completed,
        studentName: selectedResult.studentName,
        testName: selectedResult.testName
      });
    }
  }, [selectedResult]);
  
  // Calculate total pages
  const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
  
  // Fetch module results for a specific test result
  const fetchModuleResults = async (resultId: string) => {
    try {
      console.log('🔵 Fetching module results for test_result_id:', resultId);
      
      // First, let's check if there are ANY module results for this test_result_id
      const { data: allModuleResults, error: allError } = await supabase
        .from('module_results')
        .select('*')
        .eq('test_result_id', resultId);
      
      console.log('📊 All module results for test_result_id:', resultId, ':', allModuleResults);
      
      if (allError) {
        console.error('❌ Error fetching all module results:', allError);
      }
      
      // Also check for module results with similar test_result_ids (in case of mismatch)
      const { data: testResultData } = await supabase
        .from('test_results')
        .select('id, user_id, test_id, is_completed, created_at')
        .eq('id', resultId)
        .single();
      
      console.log('📋 Test result details:', testResultData);
      
      // Only fetch module results for the current test_result_id
      // Don't merge from other test attempts - only show modules that were actually completed in this attempt
      
      const { data, error } = await supabase
        .from('module_results')
        .select('*')
        .eq('test_result_id', resultId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('❌ Error fetching module results:', error);
        throw error;
      }
      
      // Also fetch essay grade if it exists and merge it into writing module
      const essayGrade = await fetchEssayGrade(resultId);
      let moduleResultsData = data || [];
      
      if (essayGrade && essayGrade.score !== null) {
        // Find or create writing module entry
        const writingModule = moduleResultsData.find(m => 
          m.module_id === 'writing' || m.module_id === 'essay' || 
          m.module_name?.toLowerCase().includes('essay') || 
          m.module_name?.toLowerCase().includes('writing')
        );
        
        if (writingModule) {
          // Update the scaled_score with essay grade
          writingModule.scaled_score = essayGrade.score;
        } else {
          // Add writing module entry if it doesn't exist
          moduleResultsData.push({
            id: `essay-${resultId}`,
            test_result_id: resultId,
            module_id: 'writing',
            module_name: 'Writing',
            score: 0,
            total: 0,
            scaled_score: essayGrade.score,
            created_at: essayGrade.created_at || new Date().toISOString()
          });
        }
      }
      
      // Deduplicate module results by module_id, keeping the most recent entry
      const deduplicatedResults = moduleResultsData.reduce((acc: any[], current: any) => {
        const existingIndex = acc.findIndex(m => m.module_id === current.module_id);
        if (existingIndex === -1) {
          // No existing entry for this module_id, add it
          acc.push(current);
        } else {
          // Entry exists, keep the one with the most recent created_at or from the current test_result_id
          const existing = acc[existingIndex];
          const currentIsFromCurrentResult = current.test_result_id === resultId;
          const existingIsFromCurrentResult = existing.test_result_id === resultId;
          
          // Prefer entry from current test_result_id
          if (currentIsFromCurrentResult && !existingIsFromCurrentResult) {
            acc[existingIndex] = current;
          } else if (!currentIsFromCurrentResult && existingIsFromCurrentResult) {
            // Keep existing
          } else {
            // Both from same result, keep the most recent
            const currentDate = new Date(current.created_at || 0);
            const existingDate = new Date(existing.created_at || 0);
            if (currentDate > existingDate) {
              acc[existingIndex] = current;
            }
          }
        }
        return acc;
      }, []);
      
      console.log('✅ Fetched module results (deduplicated):', deduplicatedResults);
      setModuleResults(deduplicatedResults);
      
      // Auto-fix: Check if all modules are completed but test is still marked as incomplete
      if (testResultData && !testResultData.is_completed && deduplicatedResults.length > 0) {
        // Get the test to know how many modules it should have
        const test = tests.find(t => t.id === testResultData.test_id);
        if (test && test.modules) {
          const expectedModules = test.modules.length;
          const completedModules = deduplicatedResults.length;
          
          console.log('🔍 Auto-fix check:', {
            expectedModules,
            completedModules,
            testResultId: resultId,
            is_completed: testResultData.is_completed
          });
          
          // If all expected modules are completed, mark the test as completed
          if (completedModules >= expectedModules) {
            console.log('✅ All modules completed, auto-marking test as completed...');
            
            // Calculate total score and scaled score
            const totalScore = deduplicatedResults.reduce((sum, mr) => sum + (mr.score || 0), 0);
            const totalQuestions = deduplicatedResults.reduce((sum, mr) => sum + (mr.total || 0), 0);
            
            // Calculate overall scaled score
            const testCategory = test.test_category || 'SAT';
            let overallScaledScore;
            if (testCategory === 'ACT') {
              const compositeModules = deduplicatedResults.filter((mr: any) => 
                ['english', 'math', 'reading'].includes(mr.module_id || '')
              );
              if (compositeModules.length > 0) {
                const sum = compositeModules.reduce((sum: number, mr: any) => sum + (mr.scaled_score || 0), 0);
                overallScaledScore = Math.round(sum / compositeModules.length);
              }
            } else {
              overallScaledScore = deduplicatedResults.reduce((sum: number, mr: any) => sum + (mr.scaled_score || 0), 0);
            }
            
            // Get current answers to preserve them
            const { data: currentTestResult } = await supabase
              .from('test_results')
              .select('answers')
              .eq('id', resultId)
              .single();
            
            // Update the test result, preserving the answers field
            const { error: updateError } = await supabase
              .from('test_results')
              .update({
                is_completed: true,
                total_score: totalScore,
                total_questions: totalQuestions,
                scaled_score: overallScaledScore || testResultData.scaled_score,
                answers: currentTestResult?.answers // Preserve existing answers
              })
              .eq('id', resultId);
            
            if (updateError) {
              console.error('❌ Error auto-marking test as completed:', updateError);
            } else {
              console.log('✅ Test auto-marked as completed successfully');
              // Update the selectedResult state to reflect the change
              if (selectedResult && selectedResult.id === resultId) {
                setSelectedResult({
                  ...selectedResult,
                  is_completed: true,
                  total_score: totalScore,
                  total_questions: totalQuestions,
                  scaled_score: overallScaledScore
                });
              }
              // Refresh the results list
              toast({
                title: "Test Updated",
                description: "Test has been marked as completed.",
                duration: 3000
              });
            }
          }
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error in fetchModuleResults:', error);
      toast({ 
        title: "Error", 
        description: "Failed to load module results: " + error.message,
        variant: "destructive" 
      });
      setModuleResults([]);
    }
  };
  
  const handleViewResult = async (result: any) => {
    console.log('🔍 handleViewResult - result.is_completed:', result.is_completed);
    setSelectedResult(result);
    fetchModuleResults(result.id);
    setShowResultDetails(true);
    // Load essay answers and existing grade if applicable
    loadEssayData(result);
    
    // Get test category from already loaded tests first (faster)
    const testFromCache = tests.find(t => t.id === result.test_id);
    if (testFromCache) {
      const category = (testFromCache.test_category || testFromCache.category || 'SAT') as 'SAT' | 'ACT';
      setSelectedTestCategory(category);
      console.log('Test category from cache:', category);
    } else {
      // Fetch test category if not in cache
      try {
        const { data: testData, error } = await supabase
          .from('tests')
          .select('test_category, category')
          .eq('id', result.test_id)
          .single();
        
        if (!error && testData) {
          const category = (testData.test_category || testData.category || 'SAT') as 'SAT' | 'ACT';
          setSelectedTestCategory(category);
          console.log('Test category from database:', category);
        } else {
          setSelectedTestCategory('SAT'); // Default to SAT
        }
      } catch (error) {
        console.error('Error fetching test category:', error);
        setSelectedTestCategory('SAT'); // Default to SAT
      }
    }
  };

  const loadEssayData = async (result: any) => {
    try {
      setEssayLoading(true);
      setEssayText(null);
      setEssayScore('');
      setEssayComments('');
      // Load answers field for essay text if present
      const { data: tr, error } = await supabase
        .from('test_results')
        .select('answers')
        .eq('id', result.id)
        .single();
      if (!error && tr?.answers) {
        console.log('📝 Loading essay data, answers field:', tr.answers);
        // Heuristic: essay answer stored under a question id for module_type 'writing'; we pick the longest text answer
        const entries = Object.entries(tr.answers as Record<string, string>);
        console.log('📝 Answer entries:', entries);
        
        if (entries.length > 0) {
          // Filter for entries that look like essays (long text, typically > 100 characters)
          const essayEntries = entries.filter(([_, value]) => 
            typeof value === 'string' && value.length > 100
          );
          
          if (essayEntries.length > 0) {
            // Use the longest essay-like entry
            const longest = essayEntries.sort((a: any, b: any) => (b[1]?.length || 0) - (a[1]?.length || 0))[0];
            console.log('📝 Found essay text (length:', longest[1]?.length, ')');
            setEssayText(longest[1]);
          } else {
            // Fallback: use the longest entry if no essay-like entries found
            const longest = entries.sort((a: any, b: any) => (b[1]?.length || 0) - (a[1]?.length || 0))[0];
            if (longest && typeof longest[1] === 'string' && longest[1].length > 0) {
              console.log('📝 Using longest entry as essay (length:', longest[1].length, ')');
              setEssayText(longest[1]);
            } else {
              console.log('⚠️ No essay text found in answers');
            }
          }
        } else {
          console.log('⚠️ Answers field is empty');
        }
      } else {
        console.log('⚠️ No answers field found or error:', error);
      }
      const existing = await fetchEssayGrade(result.id);
      if (existing) {
        setEssayScore(existing.score ?? '');
        setEssayComments(existing.comments || '');
      }
    } catch (e) {
      // ignore
    } finally {
      setEssayLoading(false);
    }
  };

  const saveEssayGrade = async () => {
    if (!selectedResult) return;
    try {
      setEssayLoading(true);
      const essayScoreValue = essayScore === '' ? null : Number(essayScore);
      
      // Save essay grade
      await upsertEssayGrade({
        test_result_id: selectedResult.id,
        score: essayScoreValue,
        comments: essayComments || null,
      });
      
      // Update module_results for writing/essay module if it exists
      if (essayScoreValue !== null) {
        // Find the writing module result
        const writingModule = moduleResults.find(m => 
          m.module_id === 'writing' || m.module_id === 'essay' || 
          m.module_name?.toLowerCase().includes('essay') || 
          m.module_name?.toLowerCase().includes('writing')
        );
        
        if (writingModule) {
          // Update existing writing module result
          const { error: updateError } = await supabase
            .from('module_results')
            .update({
              scaled_score: essayScoreValue,
            })
            .eq('id', writingModule.id);
          
          if (updateError) {
            console.error('Error updating writing module result:', updateError);
          } else {
            // Refresh module results to show updated score
            await fetchModuleResults(selectedResult.id);
          }
        } else {
          // Create a new module result for writing if it doesn't exist
          const { error: insertError } = await supabase
            .from('module_results')
            .insert({
              test_result_id: selectedResult.id,
              module_id: 'writing',
              module_name: 'Writing',
              score: 0,
              total: 0,
              scaled_score: essayScoreValue,
              created_at: new Date().toISOString()
            });
          
          if (insertError) {
            console.error('Error creating writing module result:', insertError);
          } else {
            // Refresh module results to show new entry
            await fetchModuleResults(selectedResult.id);
          }
        }
      }
      
      toast({ title: 'Grade saved', description: 'Essay grade has been saved.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save grade', variant: 'destructive' });
    } finally {
      setEssayLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Test Results</CardTitle>
          <CardDescription>View and analyze results from student practice tests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Student
              </label>
              <Select 
                value={selectedStudent} 
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Test
              </label>
              <Select 
                value={selectedTest} 
                onValueChange={setSelectedTest}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Test" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tests</SelectItem>
                  {tests.map(test => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by School
              </label>
              <Select 
                value={selectedSchool} 
                onValueChange={setSelectedSchool}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select School" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map(school => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Scaled Score</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map(result => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{result.studentName}</p>
                            <p className="text-sm text-gray-500">{result.studentEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>{result.testName}</TableCell>
                        <TableCell>
                          {result.is_completed === false ? (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">In-progress</span>
                          ) : (
                            result.completedAt
                          )}
                        </TableCell>
                        <TableCell>
                          {result.is_completed === false ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Partial</span>
                              {result.scaled_score !== null && (
                                <span className="text-lg font-semibold">{result.scaled_score}</span>
                              )}
                            </div>
                          ) : result.scaled_score !== null ? (
                            <div className="text-lg font-semibold">
                              {result.scaled_score}
                            </div>
                          ) : (
                            <div className="text-gray-500">N/A</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewResult(result)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * RESULTS_PER_PAGE) + 1} to {Math.min(currentPage * RESULTS_PER_PAGE, totalResults)} of {totalResults} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="text-gray-500">No results found matching your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Result Details Dialog */}
      <Dialog open={showResultDetails} onOpenChange={setShowResultDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Test Result Details</DialogTitle>
            <DialogDescription>
              {selectedResult && (
                <>
                  Student: {selectedResult.studentName} | Test: {selectedResult.testName} | 
                  Completed: {selectedResult.completedAt}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto pr-6 -mr-6">
            {selectedResult && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-base">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedResult.is_completed === false ? (
                        <div>
                          <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded inline-block mb-2">In-progress</div>
                          {selectedResult.scaled_score !== null && (
                            <div className="text-2xl font-bold mt-2">{selectedResult.scaled_score}</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Completed</div>
                          <div className="text-2xl font-bold">
                            {selectedResult.scaled_score !== null ? selectedResult.scaled_score : 'N/A'}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-base">Time Taken</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {selectedResult.time_taken ? (
                          <>
                            {Math.floor(selectedResult.time_taken / 60)}m {selectedResult.time_taken % 60}s
                          </>
                        ) : 'N/A'}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {moduleResults.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Module Scores</CardTitle>
                      {selectedResult.is_completed === false && (
                        <CardDescription className="text-yellow-600">
                          Showing scores for completed modules. Test is still in progress.
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue={moduleResults[0].id}>
                        <TabsList>
                          {moduleResults.map(module => (
                            <TabsTrigger key={module.id} value={module.id}>
                              {module.module_name}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        
                        {moduleResults.map(module => (
                          <TabsContent key={module.id} value={module.id}>
                            <div className="grid md:grid-cols-2 gap-4 p-4">
                              {module.scaled_score !== null ? (
                                <div className="bg-gray-50 p-4 rounded-md">
                                  <h4 className="font-medium mb-2">{module.module_name} Score</h4>
                                  <div className="text-2xl font-bold">
                                    {module.scaled_score}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    Scaled Score
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-gray-50 p-4 rounded-md">
                                  <h4 className="font-medium mb-2">{module.module_name} Score</h4>
                                  <div className="text-2xl font-bold">
                                    N/A
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    No scaled score available
                                  </div>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        ))}
                        
                        {selectedResult.is_completed === true && (
                          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-lg font-medium mb-2">
                              {selectedTestCategory === 'ACT' ? 'Composite Score' : 'Total Scaled Score'}
                            </h3>
                            <div className="text-3xl font-bold">
                              {selectedTestCategory === 'ACT' ? (() => {
                                // For ACT: Calculate Composite Score (average of English, Math, Reading)
                                const compositeModules = moduleResults.filter(module => 
                                  module.module_id && ['english', 'math', 'reading'].includes(module.module_id)
                                );
                                if (compositeModules.length > 0) {
                                  const sum = compositeModules.reduce((sum, module) => sum + (module.scaled_score || 0), 0);
                                  return Math.round(sum / compositeModules.length);
                                }
                                return 'N/A';
                              })() : (
                                moduleResults.reduce((sum, module) => 
                                  sum + (module.scaled_score || 0), 0
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </Tabs>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No module scores available yet. Module scores will appear as modules are completed.</p>
                  </div>
                )}

                {/* Essay grading section for ACT Essay - only show for ACT tests */}
                {canGrade && selectedTestCategory === 'ACT' && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>ACT Essay Grading</CardTitle>
                      <CardDescription>Review the student's essay and assign a score (0-12) with comments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {essayLoading ? (
                        <div className="text-gray-500">Loading essay...</div>
                      ) : essayText ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap">{essayText}</div>
                          <div className="grid md:grid-cols-3 gap-4 items-end">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-12)</label>
                              <input
                                type="number"
                                min={0}
                                max={12}
                                className="border rounded px-3 py-2 w-full"
                                value={essayScore}
                                onChange={(e) => setEssayScore(e.target.value === '' ? '' : Number(e.target.value))}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                              <textarea
                                className="border rounded px-3 py-2 w-full min-h-[100px]"
                                value={essayComments}
                                onChange={(e) => setEssayComments(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button onClick={saveEssayGrade} disabled={essayLoading}>Save Grade</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500">No essay found for this result.</div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-6 pt-4 border-t">
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentResults;
