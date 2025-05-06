-- Create Courses table
create table courses (
  id serial primary key,
  name varchar(255) not null,
  description text,
  is_starred boolean default false,  -- To mark if the course is starred
  created_by uuid references profiles(id) on delete cascade,  -- Foreign key referencing Profiles table
  created_at timestamp with time zone default current_timestamp,
  updated_at timestamp with time zone default current_timestamp
);

-- Create Files table
create table files (
  id serial primary key,
  course_id integer references courses(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,  -- Foreign key referencing Profiles table
  filename varchar(255) not null,
  file_path varchar(255) not null,  -- Path to the file in storage
  file_size integer,
  file_type varchar(50),  -- File type (pdf, image, video, etc.)
  uploaded_at timestamp with time zone default current_timestamp,
  updated_at timestamp with time zone default current_timestamp
);

-- Create File_Sharing table
create table file_sharing (
  id serial primary key,
  file_id integer references files(id) on delete cascade,  -- Foreign key referencing Files
  user_id uuid references profiles(id) on delete cascade,  -- Foreign key referencing Profiles table
  shared_at timestamp with time zone default current_timestamp
);

-- Optional: Triggers to update updated_at field on record change
create or replace function update_course_timestamp()
  returns trigger as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$ language plpgsql;

create trigger update_course_timestamp
  before update on courses
  for each row execute function update_course_timestamp();

create or replace function update_file_timestamp()
  returns trigger as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$ language plpgsql;

create trigger update_file_timestamp
  before update on files
  for each row execute function update_file_timestamp();