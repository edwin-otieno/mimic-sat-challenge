import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, School } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface School {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

const SchoolManagement = () => {
  const { toast } = useToast();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSchools(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load schools: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchool = () => {
    setEditingSchool(null);
    setSchoolName('');
    setIsDialogOpen(true);
  };

  const handleEditSchool = (school: School) => {
    setEditingSchool(school);
    setSchoolName(school.name);
    setIsDialogOpen(true);
  };

  const handleSaveSchool = async () => {
    if (!schoolName.trim()) {
      toast({
        title: 'Error',
        description: 'School name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingSchool) {
        // Update existing school
        const { error } = await supabase
          .from('schools')
          .update({
            name: schoolName.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSchool.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'School updated successfully',
        });
      } else {
        // Create new school
        const { error } = await supabase
          .from('schools')
          .insert({
            name: schoolName.trim(),
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'School added successfully',
        });
      }

      setIsDialogOpen(false);
      setSchoolName('');
      setEditingSchool(null);
      fetchSchools();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save school',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (school: School) => {
    setSchoolToDelete(school);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSchool = async () => {
    if (!schoolToDelete) return;

    try {
      // Check if any students are using this school
      const { data: students, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('school_id', schoolToDelete.id)
        .limit(1);

      if (checkError) throw checkError;

      if (students && students.length > 0) {
        toast({
          title: 'Cannot Delete',
          description: 'This school is assigned to one or more students. Please reassign or remove students before deleting.',
          variant: 'destructive',
        });
        setDeleteDialogOpen(false);
        setSchoolToDelete(null);
        return;
      }

      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', schoolToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'School deleted successfully',
      });

      setDeleteDialogOpen(false);
      setSchoolToDelete(null);
      fetchSchools();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete school',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-semibold">School Management</h3>
          <p className="text-gray-600 mt-1">Add and manage schools for student registration</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddSchool}>
              <Plus className="h-4 w-4 mr-2" />
              Add School
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSchool ? 'Edit School' : 'Add New School'}</DialogTitle>
              <DialogDescription>
                {editingSchool ? 'Update the school name below.' : 'Enter the name of the new school.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="schoolName" className="block text-sm font-medium mb-2">
                  School Name
                </label>
                <Input
                  id="schoolName"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Enter school name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveSchool();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSchool}>
                  {editingSchool ? 'Update' : 'Add'} School
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading schools...</p>
        </div>
      ) : schools.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No schools added yet</p>
            <Button onClick={handleAddSchool}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First School
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((school) => (
            <Card key={school.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <School className="h-5 w-5 text-blue-600" />
                    <span className="text-lg">{school.name}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSchool(school)}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(school)}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{schoolToDelete?.name}". This action cannot be undone.
              {schoolToDelete && (
                <span className="block mt-2 text-sm text-gray-500">
                  Note: If students are assigned to this school, you'll need to reassign them first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSchool} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SchoolManagement;

