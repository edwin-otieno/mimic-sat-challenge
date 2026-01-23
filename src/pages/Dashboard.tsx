import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useTests } from "@/hooks/useTests";
import { Test } from "@/components/admin/tests/types";
import Footer from "@/components/Footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchEssayGrade } from "@/services/testService";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { tests, checkTestInProgress } = useTests();
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  const [testProgressStatus, setTestProgressStatus] = useState<Record<string, boolean>>({});
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'SAT' | 'ACT'>('ALL');
  const [testModuleScores, setTestModuleScores] = useState<Record<string, Array<{module_id: string, module_name: string, score: number, total: number, scaled_score: number | null}>>>({});

  // Initialize selectedCategory from URL on mount and when URL changes
  useEffect(() => {
    const cat = (searchParams.get('category') || 'ALL').toUpperCase();
    if (cat === 'SAT' || cat === 'ACT' || cat === 'ALL') {
      setSelectedCategory(cat as 'ALL' | 'SAT' | 'ACT');
    }
  }, [searchParams]);
  
  useEffect(() => {
    // Filter active tests by category and sort alphabetically by title
    const activeTests = tests
      .filter(test => test.is_active)
      .filter(test => selectedCategory === 'ALL' || test.test_category === selectedCategory)
      .sort((a, b) => a.title.localeCompare(b.title));
    setAvailableTests(activeTests);
  }, [tests, selectedCategory]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkAllTestProgress = async () => {
      if (!user || availableTests.length === 0) {
        setLoadingProgress(false);
        return;
      }

      const progressStatus: Record<string, boolean> = {};
      const moduleScoresMap: Record<string, Array<{module_id: string, module_name: string, score: number, total: number, scaled_score: number | null}>> = {};
      
      // First pass: check all test progress (cached function will dedupe)
      for (const test of availableTests) {
        const testId = test.permalink || test.id;
        try {
          const inProgress = await checkTestInProgress(testId);
          progressStatus[testId] = inProgress;
        } catch (error) {
          console.error(`Error checking progress for test ${testId}:`, error);
          progressStatus[testId] = false;
        }
      }
      
      // Get all tests that are in progress
      const testsInProgress = availableTests.filter(test => {
        const testId = test.permalink || test.id;
        return progressStatus[testId];
      });
      
      // OPTIMIZED: Batch fetch all test results and module results (fixes N+1 problem)
      if (testsInProgress.length > 0) {
        try {
          const testIds = testsInProgress.map(t => t.id);
          
          // Fetch all test_results in one query
          const { data: allTestResults } = await supabase
            .from('test_results')
            .select('id, test_id')
            .eq('user_id', user.id)
            .in('test_id', testIds)
            .order('created_at', { ascending: false });
          
          if (allTestResults && allTestResults.length > 0) {
            // Get the most recent test_result per test_id
            const latestTestResults = allTestResults.reduce((acc, result) => {
              if (!acc[result.test_id]) {
                acc[result.test_id] = result;
              }
              return acc;
            }, {} as Record<string, any>);
            
            const testResultIds = Object.values(latestTestResults).map((r: any) => r.id);
            
            // Fetch ALL module results in one query
            const { data: allModuleResults } = await supabase
              .from('module_results')
              .select('module_id, module_name, score, total, scaled_score, test_result_id')
              .in('test_result_id', testResultIds);
            
            // Fetch ALL essay grades in one query
            const { data: allEssayGrades } = await supabase
              .from('essay_grades')
              .select('test_result_id, score')
              .in('test_result_id', testResultIds);
            
            // Group module results by test_result_id
            const moduleResultsByTestResultId = (allModuleResults || []).reduce((acc, module) => {
              if (!acc[module.test_result_id]) {
                acc[module.test_result_id] = [];
              }
              acc[module.test_result_id].push(module);
              return acc;
            }, {} as Record<string, any[]>);
            
            // Create essay grades map
            const essayGradesByTestResultId = (allEssayGrades || []).reduce((acc, grade) => {
              acc[grade.test_result_id] = grade;
              return acc;
            }, {} as Record<string, any>);
            
            // Map results to tests
            testsInProgress.forEach(test => {
              const testResult = latestTestResults[test.id];
              if (testResult) {
                let moduleResultsData = moduleResultsByTestResultId[testResult.id] || [];
                const essayGrade = essayGradesByTestResultId[testResult.id];
                
                if (essayGrade && essayGrade.score !== null) {
                  const writingIndex = moduleResultsData.findIndex(m => 
                    m.module_id === 'writing' || m.module_id === 'essay' ||
                    m.module_name?.toLowerCase().includes('essay') || m.module_name?.toLowerCase().includes('writing')
                  );
                  
                  if (writingIndex >= 0) {
                    moduleResultsData[writingIndex] = {
                      ...moduleResultsData[writingIndex],
                      scaled_score: essayGrade.score
                    };
                  } else {
                    moduleResultsData = [
                      ...moduleResultsData,
                      {
                        module_id: 'writing',
                        module_name: 'Writing',
                        score: 1,
                        total: 1,
                        scaled_score: essayGrade.score
                      }
                    ];
                  }
                }
                
                if (moduleResultsData.length > 0) {
                  const testId = test.permalink || test.id;
                  moduleScoresMap[testId] = moduleResultsData;
                }
              }
            });
          }
        } catch (error) {
          console.error('Error batch fetching module scores:', error);
        }
      }
      
      setTestProgressStatus(progressStatus);
      setTestModuleScores(moduleScoresMap);
      setLoadingProgress(false);
    };

    // Debounce to prevent rapid re-checks when dependencies change
    timeoutId = setTimeout(() => {
      checkAllTestProgress();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [user, availableTests, checkTestInProgress]);

  const startTest = (testId: string) => {
    const test = availableTests.find(t => t.id === testId);
    if (test?.permalink) {
      navigate(`/test/${test.permalink}`);
    } else {
      navigate(`/test/${testId}`);
    }
  };

  const getTestButtonText = (test: Test) => {
    const testId = test.permalink || test.id;
    const inProgress = testProgressStatus[testId];
    
    if (loadingProgress) {
      return "Loading...";
    }
    
    return inProgress ? "Resume Test" : "Start Test";
  };

  const getTestButtonVariant = (test: Test) => {
    const testId = test.permalink || test.id;
    const inProgress = testProgressStatus[testId];
    
    if (loadingProgress) {
      return "outline" as const;
    }
    
    return inProgress ? "default" as const : "default" as const;
  };

  const renderTestCard = (test: Test) => {
    const testId = test.permalink || test.id;
    const inProgress = testProgressStatus[testId];
    const completedScores = testModuleScores[testId] || [];
    const isACT = test.test_category === 'ACT';
    
    return (
      <Card key={test.id} className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle>{test.title}</CardTitle>
              <CardDescription>{test.description}</CardDescription>
            </div>
            <div className="ml-4">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                test.test_category === 'ACT' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {test.test_category || 'SAT'}
              </span>
            </div>
          </div>
          {inProgress && (
            <div className="text-sm text-blue-600 font-medium">
              ⏸️ Test in progress
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-xs sm:text-sm gap-2 sm:gap-4 mb-3">
            <div className="flex flex-col">
              <span className="font-semibold text-gray-700">{isACT ? 'Sections' : 'Modules'}</span>
              <span className="break-words">{test.test_category === 'ACT' ? 5 : ((test.modules?.length || 2) * 2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-700">Type</span>
              <span className="break-words text-xs">{test.modules?.map(m => m.type.split('_')[0]).join(', ')}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-700">Status</span>
              <span>{test.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
          
          {/* Show completed section/module scores */}
          {completedScores.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-700 mb-2">Completed {isACT ? 'Sections' : 'Modules'}:</div>
              <div className="space-y-1">
                {completedScores.map((module) => (
                  <div key={module.module_id} className="text-xs text-gray-600">
                    <span className="font-medium">Correct Questions:</span> {module.score}/{module.total}
                    {module.scaled_score !== null && module.scaled_score !== undefined && (
                      <span className="ml-2 text-blue-600">({module.module_name} Score: {module.scaled_score})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={() => startTest(test.id)}
            variant={getTestButtonVariant(test)}
            disabled={loadingProgress}
          >
            {getTestButtonText(test)}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  const satTests = availableTests.filter(t => t.test_category !== 'ACT');
  const actTests = availableTests.filter(t => t.test_category === 'ACT');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-6xl mx-auto py-8 px-4">
        <section className="mb-10 animate-fade-in">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome Back{profile?.first_name ? `, ${profile.first_name}` : ""}</h2>
          <p className="text-gray-600 text-base sm:text-lg md:text-xl">
            Continue your test preparation with these practice tests
          </p>
        </section>
        
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h3 className="text-lg sm:text-xl font-semibold">Available Tests</h3>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium whitespace-nowrap">Filter by category:</label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  const v = value as 'ALL' | 'SAT' | 'ACT';
                  setSelectedCategory(v);
                  // Sync to URL
                  const next = new URLSearchParams(searchParams);
                  if (v === 'ALL') {
                    next.delete('category');
                  } else {
                    next.set('category', v);
                  }
                  setSearchParams(next, { replace: true });
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Tests</SelectItem>
                  <SelectItem value="SAT">SAT</SelectItem>
                  <SelectItem value="ACT">ACT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {availableTests.length > 0 ? (
            <>
              {/* ACT Section */}
              {selectedCategory !== 'SAT' && actTests.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2" style={{ fontSize: '2rem' }}>ACT Tests</h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {actTests.map((test) => renderTestCard(test))}
                  </div>
                </div>
              )}
              {/* SAT Section - starts on a new row */}
              {selectedCategory !== 'ACT' && satTests.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2" style={{ fontSize: '2rem' }}>SAT Tests</h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {satTests.map((test) => renderTestCard(test))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed">
              <p className="text-gray-500">No tests available at the moment. Please check back later.</p>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
