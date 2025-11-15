import React, { useState } from 'react';
import Header from "@/components/Header";
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, TestTube, Pencil, LineChart, School } from 'lucide-react';
import TestManagement from '@/components/admin/TestManagement';
import UserManagement from '@/components/admin/UserManagement';
import StudentResults from '@/components/admin/StudentResults';
import SchoolManagement from '@/components/admin/SchoolManagement';
import DebugEnum from '@/components/admin/DebugEnum';
import Footer from "@/components/Footer";

const AdminPanel = () => {
  const { isAdmin, isTeacher } = useAuth();
  const [activeSection, setActiveSection] = useState<'test' | 'user' | 'results' | 'school' | null>(null);

  if (!(isAdmin || isTeacher)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 container max-w-6xl mx-auto py-8 px-4">
          <h2 className="text-3xl font-bold mb-8">Access Denied</h2>
          <p>You need administrator or teacher privileges to access this page.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-6xl mx-auto py-4 sm:py-8 px-4">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">{isAdmin ? 'Admin Panel' : 'Teacher Panel'}</h2>
        
        {activeSection === null ? (
          <div className={`grid gap-4 sm:gap-6 ${isAdmin ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
            {isAdmin && (
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
            )}
            
            {isAdmin && (
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
            )}
            
            {isAdmin && (
              <Card className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setActiveSection('school')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <School className="h-5 w-5" />
                    School Management
                  </CardTitle>
                  <CardDescription>Add and manage schools</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Create and manage schools that students can select during registration.
                  </p>
                  <Button variant="outline" onClick={(e) => {
                    e.stopPropagation();
                    setActiveSection('school');
                  }} className="w-full">
                    Manage Schools
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Show Student Results for both admins and teachers */}
            {(isAdmin || isTeacher) && (
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
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setActiveSection(null)}
                className="self-start sm:self-auto"
              >
                ← Back
              </Button>
              <h3 className="text-xl sm:text-2xl font-semibold">
                {activeSection === 'test' ? 'Test Management' : 
                  activeSection === 'user' ? 'User Management' : 
                  activeSection === 'school' ? 'School Management' :
                  activeSection === 'results' ? 'Student Results & Essay Grading' : 
                  'Student Results'}
              </h3>
            </div>
            
            {activeSection === 'test' && isAdmin && <TestManagement />}
            {activeSection === 'test' && !isAdmin && (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
                Access Denied: Test Management is only available to administrators.
              </div>
            )}
            {activeSection === 'user' && isAdmin && (
              <div className="space-y-6">
                <UserManagement />
                {/* <DebugEnum /> - Temporarily disabled to reduce egress */}
              </div>
            )}
            {activeSection === 'user' && !isAdmin && (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
                Access Denied: User Management is only available to administrators.
              </div>
            )}
            {activeSection === 'school' && isAdmin && <SchoolManagement />}
            {activeSection === 'school' && !isAdmin && (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
                Access Denied: School Management is only available to administrators.
              </div>
            )}
            {activeSection === 'results' && (isAdmin || isTeacher) && <StudentResults />}
            {activeSection === 'results' && !isAdmin && !isTeacher && (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
                Access Denied: Student Results is only available to administrators and teachers.
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminPanel;
