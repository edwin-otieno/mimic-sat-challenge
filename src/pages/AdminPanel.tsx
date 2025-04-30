
import React from 'react';
import Header from "@/components/Header";
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminPanel = () => {
  const { isAdmin } = useAuth();

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
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage student accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                This feature allows you to view and manage student accounts, reset passwords, 
                and adjust roles and permissions.
              </p>
              {/* Additional admin controls would go here */}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Test Management</CardTitle>
              <CardDescription>Create and manage practice tests</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                This feature allows you to create new practice tests, edit existing ones, 
                and manage test availability.
              </p>
              {/* Additional admin controls would go here */}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
