'use client';

import { useState, useCallback } from 'react';
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
import { ChevronRight, FolderOpen, File, FileText, FileImage, FileArchive, FileAudio, FileVideo, MoreHorizontal, Trash, Download, Edit, Share2, Plus, Upload, Search, Folder, FolderPlus, X, Clock, Grid3X3, List, Info, Star } from "lucide-react";

// Types
type FileType = 'folder' | 'pdf' | 'doc' | 'image' | 'archive' | 'audio' | 'video' | 'other';

interface Resource {
  id: number;
  course_id: number;
  user_id: string;
  name: string;
  path: string;
  size: number | null;
  type: string;
  starred: boolean;
  modifiedDate: string;
}

const rscrs: Resource[] = [
  {
    id: 1,
    course_id: 101,
    user_id: "uuid-123",
    name: "Lecture Notes",
    path: "/files/notes.pdf",
    size: 204800,
    type: "pdf",
    starred: true,
    modifiedDate: "2023-08-20T10:30:00Z",
  },
  {
    id: 2,
    course_id: 101,
    user_id: "uuid-123",
    name: "Diagram.png",
    path: "/files/diagram.png",
    size: 512000,
    type: "image",
    starred: false,
    modifiedDate: "2023-08-20T10:30:00Z",
  },
  {
    id: 3,
    course_id: 102,
    user_id: "uuid-234",
    name: "Project.mp4",
    path: "/files/project.mp4",
    size: 10485760,
    type: "video",
    starred: false,
    modifiedDate: "2023-08-20T10:30:00Z",
  },
  {
    id: 4,
    course_id: 103,
    user_id: "uuid-345",
    name: "Course Materials",
    path: "/files/folder1/",
    size: null,
    type: "folder",
    starred: true,
    modifiedDate: "2023-08-20T10:30:00Z",
  },
];


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
  
  // Get current folder resources based on path
  const getCurrentResources = useCallback(() => {
    return rscrs;
  }, []);

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
      // Since rscrs doesn't have modifiedDate, we'll skip date sorting
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
  const handleItemDoubleClick = (item: Resource) => {
    if (item.type === 'folder') {
      // In a real app, this would navigate to the folder contents
      console.log('Opening folder:', item.path);
    } else {
      // In a real app, this would open the file
      console.log('Opening file:', item.path);
    }
  };

  // Create new folder
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    
    // In a real app, this would create the folder on the server
    console.log('Creating folder:', newFolderName);
    
    setNewFolderName('');
    setShowCreateFolderDialog(false);
  };

  // Delete selected items
  const deleteSelectedItems = () => {
    if (selectedItems.length === 0) return;
    
    // In a real app, this would delete the items on the server
    console.log('Deleting items:', selectedItems);
    
    setSelectedItems([]);
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

  // File dropzone for upload
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: acceptedFiles => {
      console.log('Files dropped:', acceptedFiles);
      // In a real app, this would upload the files to the server
      // and then update the resources state
      alert(`${acceptedFiles.length} files would be uploaded here.`);
    },
  });
  
  // Get a single selected item for details panel
  const getSelectedItem = (): Resource | null => {
    if (selectedItems.length !== 1) return null;
    return rscrs.find(item => item.id.toString() === selectedItems[0]) || null;
  };
  
  // Toggle star status for an item
  const toggleStar = (id: string) => {
    // In a real app, this would update the star status on the server
    console.log('Toggling star for item:', id);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-60 border-r bg-muted/30 overflow-hidden flex flex-col">
        <div className="p-4 space-y-4">
          {/* create a new course */}
          <Button
            className="w-full justify-start gap-2"
            size="sm"
            onClick={() => setShowCreateFolderDialog(true)}  // Open dialog when clicked
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
          
          <Separator />
          
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2">COURSES</p>
            {['CSE 101', 'HUM 102', 'MATH 203', 'PHY 101'].map(course => (
              <Button
                key={course}
                variant="ghost"
                className="w-full justify-start gap-2 truncate"
                size="sm"
                onClick={() => alert(`Navigating to ${course}`)} // Replace with actual navigation logic
              >
                <Folder className="h-4 w-4 flex-shrink-0 text-blue-500" />
                <span className="truncate">{course}</span>
                {/* You can add a star icon if necessary */}
                <Star className="h-3 w-3 ml-auto text-yellow-500 flex-shrink-0" />
              </Button>
            ))}
          </div>

        </div>
        
        <div className="mt-auto p-4">
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
          </div>
        </div>
        
        {/* Action toolbar */}
        <div className="border-b p-2 bg-background flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            {...getRootProps()}
          >
            <Upload className="h-4 w-4" />
            Upload Files
            <input {...getInputProps()} />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            disabled={selectedItems.length === 0}
            onClick={deleteSelectedItems}
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
          
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            disabled={selectedItems.length === 0}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
        
        {/* Dropzone area (active during drag) */}
        {isDragActive && (
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
                  <Button variant="outline" size="sm" onClick={() => setShowCreateFolderDialog(true)}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                  <Button variant="outline" size="sm" {...getRootProps()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                    <input {...getInputProps()} />
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
                      
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2">
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
        </div>
      </div>
      
      {/* Create a course dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder.
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
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}