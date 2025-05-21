import React, { useState } from 'react';
import Header from "@/components/Header";
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, TestTube, Pencil, LineChart } from 'lucide-react';
import TestManagement from '@/components/admin/TestManagement';
import UserManagement from '@/components/admin/UserManagement';
import StudentResults from '@/components/admin/StudentResults';
import Footer from "@/components/Footer";

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<'test' | 'user' | 'results' | null>(null);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 container max-w-6xl mx-auto py-8 px-4">
          <h2 className="text-3xl font-bold mb-8">Access Denied</h2>
          <p>You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-6xl mx-auto py-8 px-4">
        <h2 className="text-3xl font-bold mb-8">Admin Panel</h2>
        
        {activeSection === null ? (
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => setActiveSection('user')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>Manage student accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  View and manage student accounts, reset passwords, and adjust roles and permissions.
                </p>
                <Button variant="outline" onClick={(e) => {
                  e.stopPropagation();
                  setActiveSection('user');
                }} className="w-full">
                  Manage Users
                </Button>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setActiveSection('test')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Test Management
                </CardTitle>
                <CardDescription>Create and manage practice tests</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Create new practice tests, edit existing ones, and manage test availability.
                </p>
                <Button variant="outline" onClick={(e) => {
                  e.stopPropagation();
                  setActiveSection('test');
                }} className="w-full">
                  Manage Tests
                </Button>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setActiveSection('results')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Student Results
                </CardTitle>
                <CardDescription>View all student test results</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Access and analyze test results from all students to track performance trends.
                </p>
                <Button variant="outline" onClick={(e) => {
                  e.stopPropagation();
                  setActiveSection('results');
                }} className="w-full">
                  View Results
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                onClick={() => setActiveSection(null)}
                className="mr-4"
              >
                ← Back
              </Button>
              <h3 className="text-2xl font-semibold">
                {activeSection === 'test' ? 'Test Management' : 
                  activeSection === 'user' ? 'User Management' : 'Student Results'}
              </h3>
            </div>
            
            {activeSection === 'test' && <TestManagement />}
            {activeSection === 'user' && <UserManagement />}
            {activeSection === 'results' && <StudentResults />}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminPanel;
