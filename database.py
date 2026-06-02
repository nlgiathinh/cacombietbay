import sqlite3
import os
import tempfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_NAME = 'database.db'

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
SUPABASE_ENABLED = bool(SUPABASE_URL and SUPABASE_KEY)

supa_db = None
if SUPABASE_ENABLED:
    try:
        from api import database as supa_db
    except ImportError:
        SUPABASE_ENABLED = False


def _resolve_db_path():
    requested_path = os.getenv('DATABASE_PATH') or os.path.join(BASE_DIR, DEFAULT_DB_NAME)
    db_dir = os.path.dirname(requested_path) or BASE_DIR

    if not os.path.exists(db_dir):
        try:
            os.makedirs(db_dir, exist_ok=True)
        except OSError:
            pass

    if os.access(db_dir, os.W_OK):
        return requested_path

    tmp_dir = tempfile.gettempdir()
    if os.access(tmp_dir, os.W_OK):
        return os.path.join(tmp_dir, DEFAULT_DB_NAME)

    return requested_path

DB_NAME = _resolve_db_path()


def get_db_connection():
    conn = sqlite3.connect(DB_NAME, timeout=30)
    conn.execute('PRAGMA foreign_keys = ON')
    conn.row_factory = sqlite3.Row
    return conn


def get_stories():
    if SUPABASE_ENABLED and supa_db:
        return supa_db.get_stories()

    conn = get_db_connection()
    stories = conn.execute('SELECT * FROM stories ORDER BY created_at DESC').fetchall()
    conn.close()
    return [dict(row) for row in stories]


def get_story(story_id):
    if SUPABASE_ENABLED and supa_db:
        return supa_db.get_story(story_id)

    conn = get_db_connection()
    story = conn.execute('SELECT * FROM stories WHERE id = ?', (story_id,)).fetchone()
    conn.close()
    return dict(story) if story else None


def create_story(title, author, description, cover_path, status='ongoing', genre=''):
    if SUPABASE_ENABLED and supa_db:
        return supa_db.create_story(title, author, description, cover_path, status, genre)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO stories (title, author, description, cover_path, status, genre) VALUES (?, ?, ?, ?, ?, ?)',
        (title, author, description, cover_path, status, genre)
    )
    conn.commit()
    story_id = cursor.lastrowid
    story = conn.execute('SELECT * FROM stories WHERE id = ?', (story_id,)).fetchone()
    conn.close()
    return dict(story)


def update_story(story_id, title, author, description, cover_path, status, genre=''):
    if SUPABASE_ENABLED and supa_db:
        return supa_db.update_story(story_id, title, author, description, cover_path, status, genre)

    conn = get_db_connection()
    conn.execute(
        'UPDATE stories SET title = ?, author = ?, description = ?, cover_path = ?, status = ?, genre = ? WHERE id = ?',
        (title, author, description, cover_path, status, genre, story_id)
    )
    conn.commit()
    story = conn.execute('SELECT * FROM stories WHERE id = ?', (story_id,)).fetchone()
    conn.close()
    return dict(story) if story else None


def delete_story(story_id):
    if SUPABASE_ENABLED and supa_db:
        return supa_db.delete_story(story_id)

    conn = get_db_connection()
    conn.execute('DELETE FROM stories WHERE id = ?', (story_id,))
    conn.commit()
    conn.close()
    return True


def get_chapters(story_id):
    if SUPABASE_ENABLED and supa_db:
        return supa_db.get_chapters(story_id)

    conn = get_db_connection()
    chapters = conn.execute('SELECT * FROM chapters WHERE story_id = ? ORDER BY chapter_number ASC', (story_id,)).fetchall()
    conn.close()
    return [dict(row) for row in chapters]


def get_chapter(chapter_id):
    if SUPABASE_ENABLED and supa_db:
        return supa_db.get_chapter(chapter_id)

    conn = get_db_connection()
    chapter = conn.execute('SELECT * FROM chapters WHERE id = ?', (chapter_id,)).fetchone()
    conn.close()
    return dict(chapter) if chapter else None


def create_chapter(story_id, chapter_number, title, content):
    if SUPABASE_ENABLED and supa_db:
        return supa_db.create_chapter(story_id, chapter_number, title, content)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO chapters (story_id, chapter_number, title, content) VALUES (?, ?, ?, ?)',
        (story_id, chapter_number, title, content)
    )
    conn.commit()
    chapter_id = cursor.lastrowid
    chapter = conn.execute('SELECT * FROM chapters WHERE id = ?', (chapter_id,)).fetchone()
    conn.close()
    return dict(chapter)


def update_chapter(chapter_id, chapter_number, title, content):
    if SUPABASE_ENABLED and supa_db:
        return supa_db.update_chapter(chapter_id, chapter_number, title, content)

    conn = get_db_connection()
    conn.execute(
        'UPDATE chapters SET chapter_number = ?, title = ?, content = ? WHERE id = ?',
        (chapter_number, title, content, chapter_id)
    )
    conn.commit()
    chapter = conn.execute('SELECT * FROM chapters WHERE id = ?', (chapter_id,)).fetchone()
    conn.close()
    return dict(chapter) if chapter else None


def delete_chapter(chapter_id):
    if SUPABASE_ENABLED and supa_db:
        return supa_db.delete_chapter(chapter_id)

    conn = get_db_connection()
    conn.execute('DELETE FROM chapters WHERE id = ?', (chapter_id,))
    conn.commit()
    conn.close()
    return True


def increment_chapter_view(chapter_id):
    if SUPABASE_ENABLED and supa_db:
        return supa_db.increment_chapter_view(chapter_id)

    conn = get_db_connection()
    row = conn.execute('SELECT id, views FROM chapters WHERE id = ?', (chapter_id,)).fetchone()
    if not row:
        conn.close()
        return None
    new_views = (row['views'] or 0) + 1
    conn.execute('UPDATE chapters SET views = ? WHERE id = ?', (new_views, chapter_id))
    conn.commit()
    conn.close()
    return {'id': chapter_id, 'views': new_views}


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create stories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT,
            description TEXT,
            cover_path TEXT,
            status TEXT DEFAULT 'Đang cập nhật',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create chapters table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chapters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            story_id INTEGER NOT NULL,
            chapter_number INTEGER NOT NULL,
            title TEXT,
            content TEXT, -- Can be text or a JSON string of image paths
            views INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == '__main__':
    init_db()