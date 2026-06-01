from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
from werkzeug.utils import secure_filename
from database import get_db_connection

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max-limit

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def dict_from_row(row):
    return dict(row) if row else None

# --- Story Endpoints ---

@app.route('/api/stories', methods=['GET'])
def get_stories():
    conn = get_db_connection()
    stories = conn.execute('SELECT * FROM stories ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify([dict_from_row(s) for s in stories])

@app.route('/api/stories/<int:story_id>', methods=['GET'])
def get_story(story_id):
    conn = get_db_connection()
    story = conn.execute('SELECT * FROM stories WHERE id = ?', (story_id,)).fetchone()
    conn.close()
    if story:
        return jsonify(dict_from_row(story))
    return jsonify({'error': 'Story not found'}), 404

@app.route('/api/stories', methods=['POST'])
def add_story():
    title = request.form.get('title')
    author = request.form.get('author')
    description = request.form.get('description')
    
    cover_path = ''
    if 'cover' in request.files:
        file = request.files['cover']
        if file.filename != '':
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            cover_path = filename

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO stories (title, author, description, cover_path) VALUES (?, ?, ?, ?)',
        (title, author, description, cover_path)
    )
    conn.commit()
    story_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': story_id, 'message': 'Story added successfully'}), 201

@app.route('/api/stories/<int:story_id>', methods=['PUT'])
def update_story(story_id):
    title = request.form.get('title')
    author = request.form.get('author')
    description = request.form.get('description')
    
    conn = get_db_connection()
    story = conn.execute('SELECT * FROM stories WHERE id = ?', (story_id,)).fetchone()
    
    if not story:
        conn.close()
        return jsonify({'error': 'Story not found'}), 404

    cover_path = story['cover_path']
    if 'cover' in request.files:
        file = request.files['cover']
        if file.filename != '':
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            cover_path = filename

    conn.execute(
        'UPDATE stories SET title = ?, author = ?, description = ?, cover_path = ? WHERE id = ?',
        (title, author, description, cover_path, story_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Story updated successfully'})

@app.route('/api/stories/<int:story_id>', methods=['DELETE'])
def delete_story(story_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM stories WHERE id = ?', (story_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Story deleted successfully'})

# --- Chapter Endpoints ---

@app.route('/api/stories/<int:story_id>/chapters', methods=['GET'])
def get_chapters(story_id):
    conn = get_db_connection()
    chapters = conn.execute('SELECT * FROM chapters WHERE story_id = ? ORDER BY chapter_number ASC', (story_id,)).fetchall()
    conn.close()
    return jsonify([dict_from_row(c) for c in chapters])

@app.route('/api/chapters/<int:chapter_id>', methods=['GET'])
def get_chapter(chapter_id):
    conn = get_db_connection()
    chapter = conn.execute('SELECT * FROM chapters WHERE id = ?', (chapter_id,)).fetchone()
    conn.close()
    if chapter:
        return jsonify(dict_from_row(chapter))
    return jsonify({'error': 'Chapter not found'}), 404

@app.route('/api/stories/<int:story_id>/chapters', methods=['POST'])
def add_chapter(story_id):
    chapter_number = request.form.get('chapter_number')
    title = request.form.get('title')
    content = request.form.get('content') # This could be text or image paths
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO chapters (story_id, chapter_number, title, content) VALUES (?, ?, ?, ?)',
        (story_id, chapter_number, title, content)
    )
    conn.commit()
    chapter_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': chapter_id, 'message': 'Chapter added successfully'}), 201

@app.route('/api/chapters/<int:chapter_id>', methods=['PUT'])
def update_chapter(chapter_id):
    chapter_number = request.form.get('chapter_number')
    title = request.form.get('title')
    content = request.form.get('content')
    
    conn = get_db_connection()
    conn.execute(
        'UPDATE chapters SET chapter_number = ?, title = ?, content = ? WHERE id = ?',
        (chapter_number, title, content, chapter_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Chapter updated successfully'})

@app.route('/api/chapters/<int:chapter_id>', methods=['DELETE'])
def delete_chapter(chapter_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM chapters WHERE id = ?', (chapter_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Chapter deleted successfully'})

# Serve static files
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

# Serve uploaded files
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
