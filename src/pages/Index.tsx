
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If user is logged in, redirect to dashboard
  if (user) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showLogout={false} />
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-3xl w-full space-y-8 text-center">
          <div>
            <h1 className="text-5xl font-bold text-primary mb-6">SAT Practice</h1>
            <p className="text-xl text-gray-600 mb-8">
              Master the SAT with our comprehensive practice tests and personalized feedback
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              size="lg" 
              className="text-lg py-6 px-8"
              onClick={() => navigate("/auth")}
            >
              Get Started
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg py-6 px-8"
              onClick={() => navigate("/auth")}
            >
              Learn More
            </Button>
          </div>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Realistic Tests</h3>
              <p className="text-gray-600">
                Practice with questions that mirror the format and difficulty of the actual SAT
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Track Progress</h3>
              <p className="text-gray-600">
                Monitor your improvement over time with detailed performance analytics
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Targeted Practice</h3>
              <p className="text-gray-600">
                Focus on specific sections and topics to strengthen your weak areas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
