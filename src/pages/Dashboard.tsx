import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useTests } from "@/hooks/useTests";
import { Test } from "@/components/admin/tests/types";
import Footer from "@/components/Footer";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { tests } = useTests();
  const [availableTests, setAvailableTests] = useState<Test[]>([]);
  
  useEffect(() => {
    // Filter active tests from the tests available in the system
    const activeTests = tests.filter(test => test.is_active);
    setAvailableTests(activeTests);
  }, [tests]);

  const startTest = (testId: string) => {
    const test = availableTests.find(t => t.id === testId);
    if (test?.permalink) {
      navigate(`/test/${test.permalink}`);
    } else {
      navigate(`/test/${testId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-6xl mx-auto py-8 px-4">
        <section className="mb-10 animate-fade-in">
          <h2 className="text-3xl font-bold mb-2">Welcome Back{profile?.first_name ? `, ${profile.first_name}` : ""}</h2>
          <p className="text-gray-600" style={{ fontSize: '20px' }}>
            Continue your SAT preparation with these practice tests
          </p>
        </section>
        
        <section className="space-y-8">
          <h3 className="text-xl font-semibold mb-4">Tests Directions & Resources</h3>
          <p className="text-gray-600" style={{ marginBottom: '30px', fontSize: '20px' }}>
            Please read the following directions and resources before starting the tests. <a href="/docs/directions.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#C52A30' }}>Test Directions (Opens in new tab)</a> and <a href="https://www.desmos.com/testing/digital-act/graphing" target="_blank" rel="noopener noreferrer" style={{ color: '#C52A30' }}>Calculator - For Math Section (Opens in new tab)</a>
          </p>
        </section>
        <section className="space-y-8">
          <h3 className="text-xl font-semibold mb-4">Available Tests</h3>
          
          {availableTests.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableTests.map((test) => (
                <Card key={test.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>{test.title}</CardTitle>
                    <CardDescription>{test.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700">Modules</span>
                        <span>{test.modules?.length || 2}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700">Type</span>
                        <span>{test.modules?.map(m => m.type.split('_')[0]).join(', ')}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700">Status</span>
                        <span>{test.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => startTest(test.id)}
                    >
                      Start Test
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
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
