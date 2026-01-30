import React, { useState, useEffect, useMemo } from "react";
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
import { Pencil, Trash2, Key, ArrowRightLeft, Search } from 'lucide-react';
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

const USERS_PER_PAGE = 100;
const USERS_PER_PAGE_SORTED = 1000; // Pagination size when sorting without search

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'name-asc' | 'name-desc' | 'email-asc' | 'email-desc' | 'none'>('none');
  
  // Debounce search query to avoid refetching on every keystroke
  // Clear immediately when search is empty, otherwise debounce
  useEffect(() => {
    if (searchQuery === '') {
      // Clear immediately when search is empty
      setDebouncedSearchQuery('');
      return;
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // Wait 300ms after user stops typing
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Reset pagination when search or sort changes
  useEffect(() => {
    if (debouncedSearchQuery.trim() !== '' || sortOrder !== 'none') {
      setCurrentPage(1);
    }
  }, [debouncedSearchQuery, sortOrder]);
  
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
  // When searching, fetch all users; when sorting without search, fetch all for client-side pagination
  // Otherwise use server-side pagination
  const hasSearch = debouncedSearchQuery.trim() !== '';
  const hasSort = sortOrder !== 'none';
  const shouldFetchAll = hasSearch || hasSort; // Fetch all when searching or sorting
  
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['profiles', currentPage, debouncedSearchQuery, sortOrder],
    queryFn: async () => {
      console.log('Fetching users from profiles table', { shouldFetchAll, debouncedSearchQuery, sortOrder });
      
      let query = supabase
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
        `, { count: 'exact' });
      
      // If searching or sorting, fetch all users; otherwise use pagination
      if (shouldFetchAll) {
        // Fetch all users for client-side filtering/sorting
        query = query.order('created_at', { ascending: false });
      } else {
        // Use pagination when not searching/sorting
        const from = (currentPage - 1) * USERS_PER_PAGE;
        const to = from + USERS_PER_PAGE - 1;
        query = query.order('created_at', { ascending: false }).range(from, to);
      }
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
      
      // Update total users count
      setTotalUsers(count || 0);
      
      console.log('Fetched users:', data?.length, 'total:', count);
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

  // Filter and sort users - must be called before any early returns
  const filteredAndSortedUsers = useMemo(() => {
    if (!users) return [];
    
    let filtered = users;
    
    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = users.filter(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        const schoolName = (user.schools?.name || '').toLowerCase();
        return fullName.includes(query) || email.includes(query) || schoolName.includes(query);
      });
    }
    
    // Apply sorting
    if (sortOrder !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        if (sortOrder === 'name-asc' || sortOrder === 'name-desc') {
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
          const comparison = nameA.localeCompare(nameB);
          return sortOrder === 'name-asc' ? comparison : -comparison;
        } else if (sortOrder === 'email-asc' || sortOrder === 'email-desc') {
          const emailA = (a.email || '').toLowerCase();
          const emailB = (b.email || '').toLowerCase();
          const comparison = emailA.localeCompare(emailB);
          return sortOrder === 'email-asc' ? comparison : -comparison;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [users, debouncedSearchQuery, sortOrder]);

  const displayedUsersCount = filteredAndSortedUsers.length;
  
  // Determine pagination behavior:
  // - When searching: show all filtered results (no pagination)
  // - When sorting without search: paginate sorted results at 1,000 per page
  // - Otherwise: use server-side pagination at 100 per page
  const shouldPaginateSorted = hasSort && !hasSearch;
  const paginationSize = shouldPaginateSorted ? USERS_PER_PAGE_SORTED : USERS_PER_PAGE;
  
  // Apply client-side pagination when sorting without search
  const usersToDisplay = shouldPaginateSorted
    ? filteredAndSortedUsers.slice(
        (currentPage - 1) * paginationSize,
        currentPage * paginationSize
      )
    : filteredAndSortedUsers;
  
  // Calculate total pages
  const totalPages = hasSearch
    ? 1 // No pagination when searching
    : shouldPaginateSorted
    ? Math.ceil(filteredAndSortedUsers.length / paginationSize)
    : Math.ceil(totalUsers / USERS_PER_PAGE);

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
          {hasSearch 
            ? (displayedUsersCount > 0 
                ? `Showing ${displayedUsersCount} of ${totalUsers} users (filtered)`
                : 'No users found')
            : shouldPaginateSorted
            ? (filteredAndSortedUsers.length > 0
                ? `Showing ${((currentPage - 1) * paginationSize) + 1} to ${Math.min(currentPage * paginationSize, filteredAndSortedUsers.length)} of ${filteredAndSortedUsers.length} users (sorted)`
                : 'No users found')
            : (totalUsers > 0 
                ? `Showing ${((currentPage - 1) * USERS_PER_PAGE) + 1} to ${Math.min(currentPage * USERS_PER_PAGE, totalUsers)} of ${totalUsers} users`
                : 'No users found')}
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users by name, email, or camp location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={sortOrder} onValueChange={(value: 'name-asc' | 'name-desc' | 'email-asc' | 'email-desc' | 'none') => setSortOrder(value)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No sorting</SelectItem>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="email-asc">Email (A-Z)</SelectItem>
            <SelectItem value="email-desc">Email (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {debouncedSearchQuery && (
        <p className="text-sm text-gray-500">
          {displayedUsersCount === 0 
            ? 'No users match your search'
            : `Found ${displayedUsersCount} user${displayedUsersCount === 1 ? '' : 's'}`}
        </p>
      )}

      {usersToDisplay && usersToDisplay.length > 0 ? (
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
            {usersToDisplay.map((user) => (
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
          <p className="text-gray-500">
            {hasSearch ? 'No users match your search criteria.' : 'No users found.'}
          </p>
        </div>
      )}

      {/* Pagination Controls - show when pagination is needed */}
      {!hasSearch && users && users.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || isLoading}
            >
              Next
            </Button>
          </div>
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
