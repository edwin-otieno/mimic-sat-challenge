import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function TestExportImport() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const exportTests = async () => {
    try {
      setIsExporting(true);
      
      // Fetch all tests with their questions
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('*');

      if (testsError) throw testsError;

      // Fetch all questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*');

      if (questionsError) throw questionsError;

      // Create export data
      const exportData = {
        tests,
        questions,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);

      // Create and download file
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tests-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Tests exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export tests');
    } finally {
      setIsExporting(false);
    }
  };

  const importTests = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsImporting(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content);

          // Validate import data
          if (!importData.tests || !importData.questions) {
            throw new Error('Invalid import file format');
          }

          // Import tests
          const { error: testsError } = await supabase
            .from('tests')
            .upsert(importData.tests, { onConflict: 'id' });

          if (testsError) throw testsError;

          // Import questions
          const { error: questionsError } = await supabase
            .from('questions')
            .upsert(importData.questions, { onConflict: 'id' });

          if (questionsError) throw questionsError;

          toast.success('Tests imported successfully');
        } catch (error) {
          console.error('Import error:', error);
          toast.error('Failed to import tests');
        } finally {
          setIsImporting(false);
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import tests');
      setIsImporting(false);
    }
  };

  return (
    <div className="flex gap-4 p-4">
      <Button
        onClick={exportTests}
        disabled={isExporting}
      >
        {isExporting ? 'Exporting...' : 'Export Tests'}
      </Button>
      
      <div className="relative">
        <input
          type="file"
          accept=".json"
          onChange={importTests}
          disabled={isImporting}
          className="hidden"
          id="import-file"
        />
        <Button
          onClick={() => document.getElementById('import-file')?.click()}
          disabled={isImporting}
        >
          {isImporting ? 'Importing...' : 'Import Tests'}
        </Button>
      </div>
    </div>
  );
} 