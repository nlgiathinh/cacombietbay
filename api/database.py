import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_stories():
    """Fetch all stories ordered by created_at"""
    response = supabase.table('stories').select('*').order('created_at', desc=True).execute()
    return response.data

def get_story(story_id):
    """Fetch a single story by ID"""
    response = supabase.table('stories').select('*').eq('id', story_id).execute()
    return response.data[0] if response.data else None

def create_story(title, author, description, cover_path, status='ongoing', genre=''):
    """Create a new story"""
    response = supabase.table('stories').insert({
        'title': title,
        'author': author,
        'description': description,
        'cover_path': cover_path,
        'status': status,
        'genre': genre
    }).execute()
    return response.data[0] if response.data else None

def update_story(story_id, title, author, description, cover_path, status, genre=''):
    """Update an existing story"""
    response = supabase.table('stories').update({
        'title': title,
        'author': author,
        'description': description,
        'cover_path': cover_path,
        'status': status,
        'genre': genre
    }).eq('id', story_id).execute()
    return response.data[0] if response.data else None

def delete_story(story_id):
    """Delete a story"""
    response = supabase.table('stories').delete().eq('id', story_id).execute()
    return True

def get_chapters(story_id):
    """Fetch all chapters for a story"""
    response = supabase.table('chapters').select('*').eq('story_id', story_id).order('chapter_number', desc=False).execute()
    return response.data

def get_chapter(chapter_id):
    """Fetch a single chapter by ID"""
    response = supabase.table('chapters').select('*').eq('id', chapter_id).execute()
    return response.data[0] if response.data else None

def create_chapter(story_id, chapter_number, title, content):
    """Create a new chapter"""
    response = supabase.table('chapters').insert({
        'story_id': story_id,
        'chapter_number': chapter_number,
        'title': title,
        'content': content
    }).execute()
    return response.data[0] if response.data else None

def update_chapter(chapter_id, chapter_number, title, content):
    """Update an existing chapter"""
    response = supabase.table('chapters').update({
        'chapter_number': chapter_number,
        'title': title,
        'content': content
    }).eq('id', chapter_id).execute()
    return response.data[0] if response.data else None

def delete_chapter(chapter_id):
    """Delete a chapter"""
    response = supabase.table('chapters').delete().eq('id', chapter_id).execute()
    return True
