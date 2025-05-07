'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useDropzone } from 'react-dropzone';
import { motion } from "framer-motion";
import { ChevronRight, FolderOpen, File, FileText, FileImage, FileArchive, FileAudio, FileVideo, MoreHorizontal, Trash, Download, Edit, Share2, Plus, Upload, Search, Folder, FolderPlus, X, Clock, Grid3X3, List, Info, Star, Check, Brain } from "lucide-react";
import { createClient } from '@/utils/supabase/client';

// Types
type FileType = 'folder' | 'pdf' | 'doc' | 'image' | 'archive' | 'audio' | 'video' | 'other';

import { 
  Resource,
  fetchAllResources,
  createCourse,
  updateCourseStarred,
  deleteCourse,
  deleteFile,
  uploadFile,
  downloadFile
} from '@/app/lib/resource-management';

// Remove the Resource interface and FileType type as they're now imported

export default function ResourceManagementPage() {
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showDetails, setShowDetails] = useState(false);
  const [showAiAgents,setShowAiAgents] = useState(false); 
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  
  // Add state for share dialog and user selection
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string; avatar_url: string }[]>([]);
  const [selectedFileToShare, setSelectedFileToShare] = useState<Resource | null>(null);

  // Function to fetch available users from Supabase
  const fetchAvailableUsers = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    }
  };

  // Function to handle opening share dialog
  const handleOpenShareDialog = async (file: Resource) => {
    setSelectedFileToShare(file);
    setSelectedUsers([]);
    await fetchAvailableUsers();
    setShowShareDialog(true);
  };

  // Function to toggle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Function to handle file sharing
  const handleShareFile = async () => {
    if (!selectedFileToShare || selectedUsers.length === 0) return;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user is the file owner
      if (selectedFileToShare.user_id !== user.id) {
        throw new Error('You can only share files that you own');
      }

      // Insert sharing records
      const { error } = await supabase.from('file_sharing').insert(
        selectedUsers.map(userId => ({
          file_id: selectedFileToShare.id,
          user_id: userId
        }))
      );

      if (error) throw error;

      // Close dialog and reset state
      setShowShareDialog(false);
      setSelectedUsers([]);
      setSelectedFileToShare(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share file';
      setError(errorMessage);
      toast({
        title: "Error",
        description: "You can only share files that you own",
        variant: "destructive"
      });
    }
  };

  // Fetch resources from Supabase
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const resources = await fetchAllResources();
      setResources(resources);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch resources on component mount
  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Select first course by default
  useEffect(() => {
    if (resources.length > 0) {
      const firstCourse = resources.find(item => item.type === 'folder');
      if (firstCourse) {
        navigateToFolder([firstCourse.path]);
      }
    }
  }, [resources]);

  // Get current folder resources based on path
  const getCurrentResources = useCallback(() => {
    if (currentPath.length === 0) {
      // At root level, show only courses (folders)
      return resources.filter(item => item.type === 'folder');
    }
    // Inside a course, show files for that course
    return resources.filter(item => 
      item.type !== 'folder' && // Only files
      item.path.startsWith(currentPath[0]) // Files in current course
    );
  }, [resources, currentPath]);

  // Filtered and sorted resources
  const filteredResources = getCurrentResources().filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    // Always sort folders first
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    
    // Then sort by the selected column
    if (sortBy === 'name') {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (sortBy === 'date') {
      // We can implement date sorting later when we add timestamps
      return 0;
    } else if (sortBy === 'size') {
      const sizeA = a.size || 0;
      const sizeB = b.size || 0;
      return sortDirection === 'asc' ? sizeA - sizeB : sizeB - sizeA;
    }
    return 0;
  });

  // Handle folder navigation
  const navigateToFolder = (folderPath: string[]) => {
    setCurrentPath(folderPath);
    setSelectedItems([]);
  };

  // Handle breadcrumb navigation
  const navigateToBreadcrumb = (index: number) => {
    setCurrentPath(prev => prev.slice(0, index + 1));
    setSelectedItems([]);
  };

  // Handle file selection
  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  // Handle item double click (navigation or file open)
  const handleItemDoubleClick = async (item: Resource) => {
    if (item.type === 'folder') {
      navigateToFolder(Array.isArray(item.path) ? item.path : [item.path]);
    } else {
      // Get file URL from Supabase storage
      try {
        const supabase = createClient();
        const filePath = Array.isArray(item.path) ? item.path.join('/') : item.path;
        // Remove duplicate course ID from path if present
        const cleanPath = filePath.replace(/\/([^\/]+)\/\1\//, '/$1/');
        
        const { data } = await supabase.storage
          .from('files')
          .getPublicUrl(cleanPath);

        if (error) throw error;

        // Open file in new tab
        window.open(data.publicUrl, '_blank');
      } catch (err) {
        console.error('Error opening file:', err);
        // Show error toast or notification
      }
    }
  };



  // Create or update folder (course)
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (editingCourseId) {
        // Update existing course
        const { error } = await supabase
          .from('courses')
          .update({ name: newFolderName })
          .eq('id', editingCourseId);

        if (error) throw error;

        // Update local state
        setResources(prev =>
          prev.map(r =>
            r.id.toString() === editingCourseId ? { ...r, name: newFolderName } : r
          )
        );
      } else {
        // Create new course
        const newCourse = await createCourse(newFolderName, user.id);
        setResources(prev => [...prev, newCourse]);
      }

      setNewFolderName('');
      setEditingCourseId(null);
      setShowCreateFolderDialog(false);
    } catch (err) {
      console.error('Error creating/updating course:', err);
      // Show error toast or notification
    }
  };

  // Delete selected items
  const deleteSelectedItems = async (itemsToDelete?: string[]) => {
    const itemsToProcess = itemsToDelete || selectedItems;
    if (itemsToProcess.length === 0) return;
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      for (const id of itemsToProcess) {
        const item = resources.find(r => r.id.toString() === id);
        if (!item) continue;

        // Check if user is the owner before deleting
        if (item.type !== 'folder' && item.user_id !== user.id) {
          throw new Error('You can only delete files that you own');
        }

        if (item.type === 'folder') {
          await deleteCourse(id);
        } else {
          await deleteFile(id, item.path);
        }
      }

      await fetchResources();
      setSelectedItems([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete items';
      setError(errorMessage);
      toast({
        title: "Error",
        description: "You can only delete files that you own",
        variant: "destructive"
      });
    }
  };

  // Format file size to human readable
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // File icon based on type
  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'folder':
        return <FolderOpen className="h-10 w-10 text-blue-500" />;
      case 'pdf':
        return <FileText className="h-10 w-10 text-red-500" />;
      case 'doc':
        return <FileText className="h-10 w-10 text-blue-600" />;
      case 'image':
        return <FileImage className="h-10 w-10 text-purple-500" />;
      case 'archive':
        return <FileArchive className="h-10 w-10 text-amber-500" />;
      case 'audio':
        return <FileAudio className="h-10 w-10 text-green-500" />;
      case 'video':
        return <FileVideo className="h-10 w-10 text-pink-500" />;
      default:
        return <File className="h-10 w-10 text-gray-500" />;
    }
  };

  // Toolbar dropzone for upload
  const { getRootProps: getToolbarRootProps, getInputProps: getToolbarInputProps, isDragActive: isToolbarDragActive } = useDropzone({
    noClick: false,
    onDrop: async (acceptedFiles) => {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!currentPath[0]) {
          throw new Error('Please select a course before uploading files');
        }
        if (!user) {
          throw new Error('User not authenticated');
        }

        for (const file of acceptedFiles) {
          await uploadFile(file, currentPath[0], user.id, currentPath);
        }

        await fetchResources();
        console.log('Files uploaded successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload files';
        console.error(errorMessage); // TODO: Replace with proper toast notification system
        console.error('Error uploading files:', err);
      } finally {
        setLoading(false);
      }
    },
  });

  // Empty state dropzone for upload
  const { getRootProps: getEmptyStateRootProps, getInputProps: getEmptyStateInputProps, isDragActive: isEmptyStateDragActive } = useDropzone({
    noClick: false,
    onDrop: async (acceptedFiles) => {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!currentPath[0]) {
          throw new Error('Please select a course before uploading files');
        }
        if (!user) {
          throw new Error('User not authenticated');
        }

        for (const file of acceptedFiles) {
          await uploadFile(file, currentPath[0], user.id, currentPath);
        }

        await fetchResources();
        console.log('Files uploaded successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to upload files';
        console.error(errorMessage); // TODO: Replace with proper toast notification system
        console.error('Error uploading files:', err);
      } finally {
        setLoading(false);
      }
    },
  });
  
  // Get a single selected item for details panel
  const getSelectedItem = (): Resource | null => {
    if (selectedItems.length !== 1) return null;
    return resources.find(item => item.id.toString() === selectedItems[0]) || null;
  };
  
  // Toggle star status for an item
  const toggleStar = async (id: string) => {
    try {
      const supabase = createClient();
      const item = resources.find(r => r.id.toString() === id);
      
      if (!item) return;

      if (item.type === 'folder') {
        // Update course star status
        const { error } = await supabase
          .from('courses')
          .update({ is_starred: !item.starred })
          .eq('id', id);

        if (error) throw error;

        // Update local state
        setResources(prev =>
          prev.map(r =>
            r.id.toString() === id ? { ...r, starred: !r.starred } : r
          )
        );
      }
    } catch (err) {
      console.error('Error toggling star:', err);
      // Show error toast or notification
    }
  };

  return (
    <div className="h-full flex">
      <Toaster />
      {/* Left sidebar */}
      <div className="w-64 border-r bg-background p-4 flex flex-col">
        <Button
          className="w-full justify-start gap-2 mb-4"
          size="sm"
          onClick={() => setShowCreateFolderDialog(true)}
        >
          <Plus className="h-4 w-4" />
          New
        </Button>

        <Separator className="mb-4" />

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2">COURSES</p>
          {resources
            .filter(item => item.type === 'folder')
            .map(course => (
              <Button
                key={course.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2 truncate",
                  currentPath[0] === course.path && "bg-accent"
                )}
                size="sm"
                onClick={() => navigateToFolder([course.path])}
              >
                <Folder className="h-4 w-4 flex-shrink-0 text-blue-500" />
                <span className="truncate">{course.name}</span>
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(course.id.toString());
                    }}
                  >
                    <Star
                      className={cn(
                        "h-3 w-3",
                        course.starred ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                      )}
                    />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button>
                        <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewFolderName(course.name);
                          setEditingCourseId(course.id.toString());
                          setShowCreateFolderDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSelectedItems([course.id.toString()]);
                        }}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Button>
            ))}
        </div>

        <div className="mt-auto">
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Storage</p>
              <p className="text-xs text-muted-foreground">65% used</p>
            </div>
            <div className="h-2 bg-muted mt-2 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '65%' }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">6.5 GB of 10 GB used</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top toolbar */}
        <div className="border-b p-3 flex items-center justify-between bg-background">
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateToFolder([])}>
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
            
            <Breadcrumb>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigateToFolder([])}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              
              {currentPath.map((path, index) => (
                <BreadcrumbItem key={index}>
                  <BreadcrumbSeparator />
                  <BreadcrumbLink onClick={() => navigateToBreadcrumb(index)}>
                    {path}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              ))}
            </Breadcrumb>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-accent' : ''}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-accent' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDetails(!showDetails)}
              className={showDetails ? 'bg-accent' : ''}
            >
              <Info className="h-4 w-4" />
            </Button>

            <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAiAgents(!showAiAgents)}
            className={showAiAgents ? 'bg-accent' : ''}
          >
            <Brain className="h-4 w-4" /> 
          </Button>

          </div>
        </div>
        
        {/* Action toolbar */}
        <div className="border-b p-2 bg-background flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            disabled={currentPath.length === 0}
            {...getToolbarRootProps()}
          >
            <Upload className="h-4 w-4" />
            Upload Files
            <input {...getToolbarInputProps()} />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            disabled={selectedItems.length === 0}
            onClick={() => deleteSelectedItems()}
          >
            <Trash className="h-4 w-4" />
            Delete
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            disabled={selectedItems.length === 0}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          
          {/* Action toolbar share button */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            disabled={selectedItems.length !== 1}
            onClick={() => {
              const selectedItem = resources.find(r => r.id.toString() === selectedItems[0]);
              if (selectedItem) handleOpenShareDialog(selectedItem);
            }}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Rest of the content */}
        {(isToolbarDragActive || isEmptyStateDragActive) && (
          <div className="absolute inset-0 z-50 bg-background/95 flex items-center justify-center border-2 border-dashed border-primary">
            <div className="text-center p-10 rounded-lg">
              <Upload className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold">Drop files here</h3>
              <p className="text-muted-foreground mt-2">
                Drop files to upload them to this folder
              </p>
            </div>
          </div>
        )}
        
        {/* Main file area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Files grid/list */}
          <ScrollArea className="flex-1 p-4">
            {filteredResources.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-10">
                <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">This folder is empty</h3>
                <p className="text-muted-foreground mt-2 max-w-md">
                  {searchQuery ? 'No items match your search.' : 'Upload files or create folders to get started.'}
                </p>
                <div className="mt-4 space-x-2">
                  <Button variant="outline" size="sm" {...getEmptyStateRootProps()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                    <input {...getEmptyStateInputProps()} />
                  </Button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {filteredResources.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div
                      className={cn(
                        "flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all border relative group",
                        selectedItems.includes(item.id.toString()) 
                          ? "bg-accent border-primary"
                          : "hover:bg-accent/50 border-transparent"
                      )}
                      onClick={() => toggleSelectItem(item.id.toString())}
                      onDoubleClick={() => handleItemDoubleClick({
                        id: item.id,
                        name: item.name,
                        type: item.type as FileType,
                        size: item.size ?? null,
                        modifiedDate: new Date().toISOString(),
                        course_id: item.course_id,
                        user_id: item.user_id,
                        path: item.path,
                        starred: item.starred
                      })}
                    >
                      {/* Star button */}
                      <button 
                        title='Star this item'
                        type="button"
                        className={cn(
                          "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity",
                          item.starred && "opacity-100"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(item.id.toString());
                        }}
                      >
                        <Star 
                          className={cn(
                            "h-4 w-4", 
                            item.starred ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                          )} 
                        />
                      </button>
                      
                      {/* File icon */}
                      <div className="mb-2 mt-2 relative">
                        {getFileIcon(item.type as FileType)}
                        
                        {/* Selection check */}
                        {selectedItems.includes(item.id.toString()) && (
                          <div className="absolute -top-2 -right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* File name */}
                      <div className="w-full text-center mt-1">
                        <p className="text-sm font-medium truncate max-w-full">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.type !== 'folder' && formatFileSize(item.size ?? undefined)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground bg-accent/50 rounded-md">
                  <div className="col-span-6 flex items-center gap-2 cursor-pointer" onClick={() => {
                    if (sortBy === 'name') {
                      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('name');
                      setSortDirection('asc');
                    }
                  }}>
                    Name
                    {sortBy === 'name' && (
                      <ChevronRight className={`h-3 w-3 transition-transform ${sortDirection === 'desc' ? 'rotate-90' : 'rotate-[270deg]'}`} />
                    )}
                  </div>
                  <div className="col-span-2 cursor-pointer" onClick={() => {
                    if (sortBy === 'date') {
                      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('date');
                      setSortDirection('desc');
                    }
                  }}>
                    Modified
                    {sortBy === 'date' && (
                      <ChevronRight className={`h-3 w-3 inline ml-1 transition-transform ${sortDirection === 'desc' ? 'rotate-90' : 'rotate-[270deg]'}`} />
                    )}
                  </div>
                  <div className="col-span-2 cursor-pointer" onClick={() => {
                    if (sortBy === 'size') {
                      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('size');
                      setSortDirection('desc');
                    }
                  }}>
                    Size
                    {sortBy === 'size' && (
                      <ChevronRight className={`h-3 w-3 inline ml-1 transition-transform ${sortDirection === 'desc' ? 'rotate-90' : 'rotate-[270deg]'}`} />
                    )}
                  </div>
                  <div className="col-span-2">Actions</div>
                </div>
                
                {/* Table rows */}
                {filteredResources.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div
                      className={cn(
                        "grid grid-cols-12 gap-4 px-4 py-2 rounded-md cursor-pointer items-center",
selectedItems.includes(item.id.toString())
                          ? "bg-accent" 
                          : "hover:bg-accent/50"
                      )}
                      onClick={() => toggleSelectItem(item.id.toString())}
                      onDoubleClick={() => handleItemDoubleClick(item)}
                    >
                      <div className="col-span-6 flex items-center gap-3 truncate">
                        <div className="flex-shrink-0 h-9 w-9 flex items-center justify-center">
                          {item.type === 'folder' ? (
                            <FolderOpen className="h-6 w-6 text-blue-500" />
                          ) : (
getFileIcon(item.type as FileType)
                          )}
                        </div>
                        
                        <span className="truncate font-medium">
                          {item.name}
                        </span>
                        
                        {item.starred && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                        )}
                      </div>
                      
                      <div className="col-span-2 text-sm text-muted-foreground">
                        {new Date().toLocaleDateString()} {/* Temporary placeholder - should use actual modified date from API */}
                      </div>
                      
                      <div className="col-span-2 text-sm text-muted-foreground">
                        {item.type !== 'folder' && formatFileSize(item.size ?? undefined)}
                      </div>
                      
                      <div className="col-span-2 flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleStar(item.id.toString())}>
                              <Star className={cn("h-4 w-4 mr-2", item.starred ? "text-yellow-500 fill-yellow-500" : "")} />
                              {item.starred ? 'Remove Star' : 'Star'}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setSelectedItems([item.id.toString()]);
                              deleteSelectedItems();
                            }}>
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {/* Details panel */}
          {showDetails && ( 
            <div className="w-80 border-l bg-muted/20 p-4 overflow-y-auto">
              {getSelectedItem() ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="mx-auto mb-3 w-16 h-16 flex items-center justify-center">
                      {getFileIcon(getSelectedItem()!.type as FileType)}
                    </div>
                    <h3 className="font-medium text-lg break-all">
                      {getSelectedItem()!.name}
                    </h3>
                    {getSelectedItem()!.type !== 'folder' && (
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(getSelectedItem()!.size ?? undefined)}
                      </p>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">File Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Type</span>
                          <span className="font-medium">
                            {getSelectedItem()!.type.charAt(0).toUpperCase() + getSelectedItem()!.type.slice(1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Location</span>
                          <span className="font-medium">
                            /{currentPath.join('/')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Modified</span>
                          <span className="font-medium">
                            {new Date(getSelectedItem()!.modifiedDate).toLocaleDateString()}
                          </span>
                        </div>
                        {getSelectedItem()!.type !== 'folder' && (
                          <div className="flex justify-between">
                            <span>Size</span>
                            <span className="font-medium">
                              {formatFileSize(getSelectedItem()!.size || undefined)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start gap-2"
                        onClick={() => toggleStar(getSelectedItem()!.id.toString())}
                      >
                        <Star className={cn(
                          "h-4 w-4", 
                          getSelectedItem()!.starred ? "text-yellow-500 fill-yellow-500" : ""
                        )} />
                        {getSelectedItem()!.starred ? 'Remove Star' : 'Add Star'}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start gap-2"
                        onClick={() => handleOpenShareDialog(getSelectedItem()!)}
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                      
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start gap-2 text-red-500 hover:text-red-500"
                        onClick={() => deleteSelectedItems()}
                      >
                        <Trash className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">No item selected</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Select a file or folder to view its details.
                  </p>
                </div>
              )}
            </div>
          )}
          {showAiAgents && (
            <div className="w-80 border-l bg-muted/20 p-4 flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="text-center">
                  <div className="mx-auto mb-3 w-16 h-16 flex items-center justify-center rounded-full bg-muted">
                    🤖
                  </div>
                  <h3 className="font-medium text-lg">AI Assistant</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ask questions, get help, or explore ideas.
                  </p>
                </div>

                <Separator />

                <div className="flex flex-col gap-3 text-sm">
                  {/* Example Chat Messages */}
                  <div className="flex flex-col gap-2">
                    <div className="self-end bg-primary text-primary-foreground px-3 py-2 rounded-xl max-w-[75%]">
                      What is the size of this file?
                    </div>
                    <div className="self-start bg-muted px-3 py-2 rounded-xl max-w-[75%]">
                      This file is 2.5 MB in size.
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-3" />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // handleSendMessage logic here
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 text-sm bg-background border px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-ring"
                />
                <Button type="submit" size="sm">
                  Send
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
      
      {/* Create a course dialog */}
      <Dialog 
        open={showCreateFolderDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingCourseId(null);
            setNewFolderName('');
          }
          setShowCreateFolderDialog(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourseId ? 'Edit folder' : 'Create new folder'}</DialogTitle>
            <DialogDescription>
              {editingCourseId ? 'Edit the folder name.' : 'Enter a name for the new folder.'}
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>
              {editingCourseId ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share File</DialogTitle>
            <DialogDescription>
              Select users to share "{selectedFileToShare?.name}" with
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px] overflow-y-auto py-4">
            {availableUsers.map(user => (
              <div
                key={user.id}
                className="flex items-center space-x-4 p-2 hover:bg-accent rounded-lg cursor-pointer"
                onClick={() => toggleUserSelection(user.id)}
              >
                <div className="h-10 w-10 rounded-full overflow-hidden bg-muted">
                  <img
                    src={user.avatar_url || '/placeholder-user.jpg'}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.name}</p>
                </div>
                <div className={cn(
                  'h-5 w-5 rounded-full border-2 flex items-center justify-center',
                  selectedUsers.includes(user.id)
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground'
                )}>
                  {selectedUsers.includes(user.id) && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
              </div>
            ))}
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowShareDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleShareFile}
              disabled={selectedUsers.length === 0}
            >
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
