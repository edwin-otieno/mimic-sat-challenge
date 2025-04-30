
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";

interface TestData {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  questionCount: number;
  difficulty: "Easy" | "Medium" | "Hard";
}

const Dashboard = () => {
  const navigate = useNavigate();
  
  const availableTests: TestData[] = [
    {
      id: "practice-1",
      title: "Practice Test 1",
      description: "General SAT practice with reading, writing, and math sections.",
      duration: 65,
      questionCount: 20,
      difficulty: "Medium",
    },
    {
      id: "reading-1",
      title: "Reading Section",
      description: "Focus on reading comprehension questions.",
      duration: 25,
      questionCount: 10,
      difficulty: "Medium",
    },
    {
      id: "math-1",
      title: "Math Section",
      description: "Non-calculator math problems covering algebra and problem-solving.",
      duration: 20,
      questionCount: 10,
      difficulty: "Hard",
    },
  ];

  const startTest = (testId: string) => {
    navigate(`/test/${testId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-6xl mx-auto py-8 px-4">
        <section className="mb-10 animate-fade-in">
          <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
          <p className="text-gray-600">
            Continue your SAT preparation with these practice tests
          </p>
        </section>
        
        <section className="space-y-8">
          <h3 className="text-xl font-semibold mb-4">Available Tests</h3>
          
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
                      <span className="font-semibold text-gray-700">Duration</span>
                      <span>{test.duration} min</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-700">Questions</span>
                      <span>{test.questionCount}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-700">Difficulty</span>
                      <span>{test.difficulty}</span>
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
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
