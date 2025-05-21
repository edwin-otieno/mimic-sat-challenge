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

const RESULTS_PER_PAGE = 15;

const StudentResults = () => {
  const { toast } = useToast();
  const { tests } = useTests();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [moduleResults, setModuleResults] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  
  // Fetch all student results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        
        // Get students
        const { data: studentsData, error: studentsError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('role', 'student');
          
        if (studentsError) {
          throw studentsError;
        }
        
        setStudents(studentsData);
        
        // Get test results based on filters
        let query = supabase
          .from('test_results')
          .select('id, test_id, user_id, total_score, total_questions, scaled_score, created_at, time_taken', { count: 'exact' });
          
        if (selectedStudent !== 'all') {
          query = query.eq('user_id', selectedStudent);
        }
        
        if (selectedTest !== 'all') {
          query = query.eq('test_id', selectedTest);
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
        
        // Get user profiles for each result
        const formattedResults = await Promise.all(data.map(async result => {
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
            percentage: Math.round((result.total_score / result.total_questions) * 100)
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
  }, [selectedTest, selectedStudent, tests, toast, currentPage]);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTest, selectedStudent]);
  
  // Calculate total pages
  const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
  
  // Fetch module results for a specific test result
  const fetchModuleResults = async (resultId: string) => {
    try {
      const { data, error } = await supabase
        .from('module_results')
        .select('*')
        .eq('test_result_id', resultId);
        
      if (error) {
        throw error;
      }
      
      setModuleResults(data);
      
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: "Failed to load module results: " + error.message,
        variant: "destructive" 
      });
      setModuleResults([]);
    }
  };
  
  const handleViewResult = (result: any) => {
    setSelectedResult(result);
    fetchModuleResults(result.id);
    setShowResultDetails(true);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Test Results</CardTitle>
          <CardDescription>View and analyze results from student practice tests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                        <TableCell>{result.completedAt}</TableCell>
                        <TableCell>
                          {result.scaled_score !== null ? (
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
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
                      <CardTitle className="text-base">Scaled Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {selectedResult.scaled_score !== null ? selectedResult.scaled_score : 'N/A'}
                      </div>
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
                        
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                          <h3 className="text-lg font-medium mb-2">Total Scaled Score</h3>
                          <div className="text-3xl font-bold">
                            {moduleResults.reduce((sum, module) => 
                              sum + (module.scaled_score || 0), 0
                            )}
                          </div>
                        </div>
                      </Tabs>
                    </CardContent>
                  </Card>
                ) :
                  <div className="text-center py-4">
                    <p className="text-gray-500">No module scores available</p>
                  </div>
                }
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
