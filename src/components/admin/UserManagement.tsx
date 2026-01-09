import React, { useState, useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin-client';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Key, ArrowRightLeft } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "student" | "teacher";
  school_id: string | null;
  schools?: {
    id: string;
    name: string;
  } | null;
}

const UserManagement = () => {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isMoveSchoolDialogOpen, setIsMoveSchoolDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<"admin" | "student" | "teacher">("student");
  const [newPassword, setNewPassword] = useState("");
  const [newSchoolId, setNewSchoolId] = useState<string>("none");
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  
  // Fetch schools
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('id, name')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching schools:', error);
          return;
        }
        
        setSchools(data || []);
      } catch (error) {
        console.error('Unexpected error fetching schools:', error);
      }
    };

    fetchSchools();
  }, []);

  // Fetch all users from Supabase profiles table
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      console.log('Fetching users from profiles table');
      // Fetch users with school information
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          email, 
          first_name, 
          last_name, 
          role, 
          school_id,
          created_at,
          schools(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
      
      console.log('Fetched users:', data);
      return data as User[];
    }
  });

  const handleEditRole = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setNewPassword("");
    setIsResetPasswordDialogOpen(true);
  };

  const handleMoveSchool = (user: User) => {
    setSelectedUser(user);
    setNewSchoolId(user.school_id || "none");
    setIsMoveSchoolDialogOpen(true);
  };

  const saveSchoolChange = async () => {
    if (!selectedUser) return;
    
    try {
      const schoolIdToSet = newSchoolId === "none" ? null : newSchoolId;
      
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ school_id: schoolIdToSet })
        .eq('id', selectedUser.id);

      if (error) throw error;
      
      const schoolName = schoolIdToSet 
        ? schools.find(s => s.id === schoolIdToSet)?.name || 'Unknown'
        : 'None';
      
      toast({ 
        title: "Success", 
        description: `${selectedUser.first_name} ${selectedUser.last_name} moved to ${schoolName}` 
      });
      
      setIsMoveSchoolDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: `Failed to update school: ${error.message || "Unknown error"}`, 
        variant: "destructive" 
      });
    }
  };

  const saveRole = async () => {
    if (!selectedUser || !newRole) return;
    
    console.log('Attempting to update role:', {
      userId: selectedUser.id,
      newRole: newRole,
      roleType: typeof newRole
    });
    
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ role: newRole })
        .eq('id', selectedUser.id);

      if (error) {
        console.error('Database error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Special handling for teacher role enum error
        if (error.code === '22P02' && newRole === 'teacher') {
          toast({ 
            title: "Teacher Role Not Available", 
            description: "The teacher role is not yet available in the database. Please contact the administrator to add this role to the database enum.", 
            variant: "destructive" 
          });
          return;
        }
        
        throw error;
      }
      
      toast({ 
        title: "Success", 
        description: `${selectedUser.first_name}'s role updated to ${newRole}` 
      });
      
      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      console.error('Full error object:', error);
      toast({ 
        title: "Error", 
        description: `Failed to update user role: ${error.message || "Unknown error"}. Check console for details.`, 
        variant: "destructive" 
      });
    }
  };

  const resetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        selectedUser.id,
        { password: newPassword }
      );

      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: `Password has been reset for ${selectedUser.first_name || selectedUser.email}` 
      });
      
      setIsResetPasswordDialogOpen(false);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to reset password", 
        variant: "destructive" 
      });
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      // First delete from profiles table
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;
      
      // Then delete the auth user
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
        selectedUser.id
      );
      
      if (authError) throw authError;
      
      toast({ 
        title: "Success", 
        description: `${selectedUser.first_name || 'User'} has been deleted` 
      });
      
      setIsDeleteDialogOpen(false);
      refetch();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete user", 
        variant: "destructive" 
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        Error loading users: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">User Management</h3>
        <p className="text-sm text-gray-500">
          {users ? `${users.length} users found` : 'No users found'}
        </p>
      </div>

      {users && users.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Camp Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.first_name} {user.last_name}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  {user.schools?.name || <span className="text-gray-400">None</span>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleEditRole(user)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    {user.role === 'student' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleMoveSchool(user)}
                        title="Move to different camp location"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                        <span className="sr-only">Move School</span>
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleResetPassword(user)}
                    >
                      <Key className="h-4 w-4" />
                      <span className="sr-only">Reset Password</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-md">
          <p className="text-gray-500">No users found.</p>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              Changing role for: {selectedUser?.first_name} {selectedUser?.last_name}
            </p>
            <Select value={newRole} onValueChange={(value: "admin" | "student" | "teacher") => setNewRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveRole}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for {selectedUser?.first_name} {selectedUser?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={resetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMoveSchoolDialogOpen} onOpenChange={setIsMoveSchoolDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Student to Different Camp Location</DialogTitle>
            <DialogDescription>
              Move {selectedUser?.first_name} {selectedUser?.last_name} to a different camp location
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-gray-600">
              Current camp location: <strong>{selectedUser?.schools?.name || 'None'}</strong>
            </p>
            <Select value={newSchoolId} onValueChange={setNewSchoolId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a camp location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveSchoolChange}>Move Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.first_name} {selectedUser?.last_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
