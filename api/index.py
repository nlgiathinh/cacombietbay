from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
from database import (
    get_stories, get_story, create_story, update_story, delete_story,
    get_chapters, get_chapter, create_chapter, update_chapter, delete_chapter
)

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max-limit

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- Story Endpoints ---

@app.route('/api/stories', methods=['GET'])
def list_stories():
    try:
        stories = get_stories()
        return jsonify(stories), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stories/<int:story_id>', methods=['GET'])
def fetch_story(story_id):
    try:
        story = get_story(story_id)
        if not story:
            return jsonify({'error': 'Story not found'}), 404
        return jsonify(story), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stories', methods=['POST'])
def add_story_endpoint():
    try:
        title = request.form.get('title')
        author = request.form.get('author', '')
        description = request.form.get('description', '')
        status = request.form.get('status', 'ongoing')
        genre = request.form.get('genre', '')
        
        cover_path = ''
        if 'cover' in request.files:
            file = request.files['cover']
            if file.filename != '':
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                cover_path = filename

        story = create_story(title, author, description, cover_path, status, genre)
        return jsonify({'id': story['id'], 'message': 'Story added successfully', 'data': story}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stories/<int:story_id>', methods=['PUT'])
def update_story_endpoint(story_id):
    try:
        existing_story = get_story(story_id)
        if not existing_story:
            return jsonify({'error': 'Story not found'}), 404

        title = request.form.get('title', existing_story['title'])
        author = request.form.get('author', existing_story['author'])
        description = request.form.get('description', existing_story['description'])
        status = request.form.get('status', existing_story['status'])
        genre = request.form.get('genre', existing_story.get('genre', ''))
        
        cover_path = existing_story['cover_path']
        if 'cover' in request.files:
            file = request.files['cover']
            if file.filename != '':
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                cover_path = filename

        story = update_story(story_id, title, author, description, cover_path, status, genre)
        return jsonify({'message': 'Story updated successfully', 'data': story}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stories/<int:story_id>', methods=['DELETE'])
def delete_story_endpoint(story_id):
    try:
        existing_story = get_story(story_id)
        if not existing_story:
            return jsonify({'error': 'Story not found'}), 404
        
        delete_story(story_id)
        return jsonify({'message': 'Story deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Chapter Endpoints ---

@app.route('/api/stories/<int:story_id>/chapters', methods=['GET'])
def list_chapters(story_id):
    try:
        chapters = get_chapters(story_id)
        return jsonify(chapters), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chapters/<int:chapter_id>', methods=['GET'])
def fetch_chapter(chapter_id):
    try:
        chapter = get_chapter(chapter_id)
        if not chapter:
            return jsonify({'error': 'Chapter not found'}), 404
        return jsonify(chapter), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stories/<int:story_id>/chapters', methods=['POST'])
def add_chapter_endpoint(story_id):
    try:
        # Verify story exists
        story = get_story(story_id)
        if not story:
            return jsonify({'error': 'Story not found'}), 404

        chapter_number = request.form.get('chapter_number', type=int)
        title = request.form.get('title', '')
        content = request.form.get('content', '')
        
        chapter = create_chapter(story_id, chapter_number, title, content)
        return jsonify({'id': chapter['id'], 'message': 'Chapter added successfully', 'data': chapter}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chapters/<int:chapter_id>', methods=['PUT'])
def update_chapter_endpoint(chapter_id):
    try:
        existing_chapter = get_chapter(chapter_id)
        if not existing_chapter:
            return jsonify({'error': 'Chapter not found'}), 404

        chapter_number = request.form.get('chapter_number', existing_chapter['chapter_number'], type=int)
        title = request.form.get('title', existing_chapter['title'])
        content = request.form.get('content', existing_chapter['content'])
        
        chapter = update_chapter(chapter_id, chapter_number, title, content)
        return jsonify({'message': 'Chapter updated successfully', 'data': chapter}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chapters/<int:chapter_id>', methods=['DELETE'])
def delete_chapter_endpoint(chapter_id):
    try:
        existing_chapter = get_chapter(chapter_id)
        if not existing_chapter:
            return jsonify({'error': 'Chapter not found'}), 404
        
        delete_chapter(chapter_id)
        return jsonify({'message': 'Chapter deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve uploaded files
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Serve static files
@app.route('/')
def index():
    return send_from_directory('..', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('..', path)
