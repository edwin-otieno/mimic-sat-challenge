import React, { useState } from 'react';
import { supabaseAdmin } from '@/integrations/supabase/admin-client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const DebugEnum = () => {
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testEnumValues = async () => {
    setIsLoading(true);
    try {
      console.log('Testing enum values...');
      
      // Test 1: Get existing profiles to see what roles exist
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .limit(10);
      
      if (profilesError) {
        console.error('Error getting profiles:', profilesError);
        setDebugInfo({ error: 'Failed to get profiles', details: profilesError });
        return;
      }
      
      console.log('Existing profiles:', profiles);
      
      // Test 2: Try to get unique roles
      const uniqueRoles = [...new Set(profiles.map(p => p.role))];
      console.log('Unique roles found:', uniqueRoles);
      
      // Test 3: Try each role value
      const testResults = [];
      const testRoles = ['admin', 'student', 'teacher'];
      
      for (const role of testRoles) {
        try {
          console.log(`Testing role: ${role}`);
          
          // Try to query with this role
          const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('role', role)
            .limit(1);
          
          if (error) {
            testResults.push({ role, status: 'error', message: error.message });
            console.error(`Error with role ${role}:`, error);
          } else {
            testResults.push({ role, status: 'success', message: 'Role is valid' });
            console.log(`Role ${role} is valid`);
          }
        } catch (err: any) {
          testResults.push({ role, status: 'exception', message: err.message });
          console.error(`Exception with role ${role}:`, err);
        }
      }
      
      setDebugInfo({
        existingProfiles: profiles,
        uniqueRoles,
        testResults,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: 'Debug Complete',
        description: 'Check the debug info below and console for details'
      });
      
    } catch (error: any) {
      console.error('Debug test failed:', error);
      setDebugInfo({ error: 'Debug test failed', details: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Debug Enum Values</h3>
      
      <Button 
        onClick={testEnumValues} 
        disabled={isLoading}
        className="mb-4"
      >
        {isLoading ? 'Testing...' : 'Test Enum Values'}
      </Button>
      
      {debugInfo && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Debug Results:</h4>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DebugEnum;
