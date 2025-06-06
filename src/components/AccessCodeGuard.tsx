import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AccessCodeGuardProps {
  children: React.ReactNode;
  accessCode: string;
}

const AccessCodeGuard: React.FC<AccessCodeGuardProps> = ({ children, accessCode }) => {
  const [enteredCode, setEnteredCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredCode === accessCode) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid access code. Please try again.');
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Enter Access Code</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter access code"
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value)}
                className="w-full"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <Button type="submit" className="w-full">
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessCodeGuard; 