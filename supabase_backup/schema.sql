create table stories (
  id bigint generated always as identity primary key,
  title text not null,
  author text,
  description text,
  cover_path text,
  status text default 'ongoing',
  genre text,
  created_at timestamptz default now()
);

create table chapters (
  id bigint generated always as identity primary key,
  story_id bigint references stories(id) on delete cascade,
  chapter_number int not null,
  title text,
  content text,
  created_at timestamptz default now()
);