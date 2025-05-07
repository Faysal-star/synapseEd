import { createClient } from '@/utils/supabase/client';

export interface Resource {
  id: number;
  course_id: number;
  user_id: string;
  name: string;
  path: string;
  size: number | null;
  type: string;
  starred: boolean;
  modifiedDate: string;
  file_path?: string;
  created_at?: string;
  updated_at?: string;
}

type FileType = 'folder' | 'pdf' | 'doc' | 'image' | 'archive' | 'audio' | 'video' | 'other';

const supabase = createClient();

// Course operations
export async function fetchCourses(): Promise<Resource[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get courses created by the user
  const { data: ownedCoursesData, error: ownedCoursesError } = await supabase
    .from('courses')
    .select('id, name, is_starred')
    .eq('created_by', user.id);

  if (ownedCoursesError) throw new Error(ownedCoursesError.message);

  // Get courses containing shared files
  const { data: sharedFilesData, error: sharedFilesError } = await supabase
    .from('file_sharing')
    .select('files(course_id, courses(id, name, is_starred))')
    .eq('user_id', user.id);

  if (sharedFilesError) throw new Error(sharedFilesError.message);

  // Extract unique courses from shared files
  const sharedCourses = sharedFilesData
    .map(sf => (sf.files as any)?.courses)
    .filter(Boolean)
    .reduce((unique: any[], course) => {
      if (!unique.some(u => u.id === course.id)) {
        unique.push(course);
      }
      return unique;
    }, []);

  // Combine owned and shared courses, removing duplicates
  const allCourses = [
    ...ownedCoursesData,
    ...sharedCourses
  ].reduce((unique: any[], course) => {
    if (!unique.some(u => u.id === course.id)) {
      unique.push(course);
    }
    return unique;
  }, []);

  return allCourses.map(course => ({
    id: course.id,
    course_id: course.id,
    user_id: '',
    name: course.name,
    path: course.id.toString(),
    size: null,
    type: 'folder' as FileType,
    starred: course.is_starred,
    modifiedDate: new Date().toISOString()
  }));

}

export async function createCourse(name: string, userId: string): Promise<Resource> {
  const { data, error } = await supabase
    .from('courses')
    .insert({
      name: name.trim(),
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    course_id: data.id,
    user_id: data.created_by,
    name: data.name,
    path: data.id.toString(),
    size: null,
    type: 'folder',
    starred: false,
    modifiedDate: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export async function updateCourseStarred(courseId: string, starred: boolean): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .update({ is_starred: starred })
    .eq('id', courseId);

  if (error) throw new Error(error.message);
}

export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) throw new Error(error.message);
}

// File operations
export async function fetchFiles(): Promise<Resource[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get files created by the user
  const { data: ownedFiles, error: ownedFilesError } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', user.id);

  if (ownedFilesError) throw new Error(ownedFilesError.message);

  // Get files shared with the user
  const { data: sharedFiles, error: sharedFilesError } = await supabase
    .from('file_sharing')
    .select('files(*)') // Join with files table
    .eq('user_id', user.id);

  if (sharedFilesError) throw new Error(sharedFilesError.message);

  // Combine owned and shared files
  const filesData = [
    ...ownedFiles,
    ...sharedFiles.map(sf => sf.files).filter(Boolean)
  ];


  return filesData.map(file => ({
    id: file.id,
    course_id: file.course_id,
    user_id: file.user_id,
    name: file.filename,
    type: file.file_type as FileType,
    path: `${file.course_id}/${file.file_path}`, // Construct path with courseId and filename
    size: file.file_size,
    starred: false,
    modifiedDate: file.updated_at || new Date().toISOString()
  }));
}

export async function uploadFile(
  file: File,
  courseId: string,
  userId: string,
  currentPath: string[]
): Promise<void> {
  try {
    // Construct a clean file path using only courseId and filename
    const filePath = `${file.name}`;
    
    // Check if file already exists
    const { data: existingFile } = await supabase.storage
      .from('files')
      .list(courseId, {
        search: file.name
      });

    if (existingFile && existingFile.length > 0) {
      throw new Error('A file with this name already exists in this course');
    }

    // Upload file to storage with courseId as prefix
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(`${courseId}/${filePath}`, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw new Error(uploadError.message);

    // Insert file record in database with correct path
    const { error: dbError } = await supabase.from('files').insert({
      course_id: parseInt(courseId),
      user_id: userId,
      filename: file.name,
      file_path: filePath, // Store only filename in file_path
      file_size: file.size,
      file_type: file.type.split('/')[1] || 'other',
      updated_at: new Date().toISOString()
    });

    if (dbError) {
      // If database insert fails, clean up the uploaded file
      await supabase.storage.from('files').remove([`${courseId}/${filePath}`]);
      throw new Error(dbError.message);
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error('Failed to upload file');
  }
}

export async function downloadFile(filePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from('files')
    .download(filePath);

  if (error) throw new Error(error.message);
  if (!data) throw new Error('No data received');

  return data;
}

export async function deleteFile(fileId: string, filePath: string): Promise<void> {
  // Delete file from storage
  const { error: storageError } = await supabase.storage
    .from('files')
    .remove([filePath]);

  if (storageError) throw new Error(storageError.message);

  // Delete file record from database
  const { error: dbError } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);

  if (dbError) throw new Error(dbError.message);
}

// Combined operations
export async function fetchAllResources(): Promise<Resource[]> {
  const [courses, files] = await Promise.all([
    fetchCourses(),
    fetchFiles()
  ]);

  return [...courses, ...files];
}