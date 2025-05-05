create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  email text,
  role text check (role in ('student', 'teacher'))
);

-- Allow authenticated users to access their own profile
CREATE POLICY "Users can access their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  WITH CHECK (auth.uid() = id OR (auth.jwt()->>'email' = email AND auth.role() = 'authenticated'));

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id OR (auth.jwt()->>'email' = email AND auth.role() = 'authenticated'));


alter table profiles enable row level security;


-- Allow authenticated users to upload to the avatars bucket
CREATE POLICY "authenticated users can upload files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND bucket_id = 'avatars'
  );





