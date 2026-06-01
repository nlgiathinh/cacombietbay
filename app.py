from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import time
import requests
from werkzeug.utils import secure_filename
from database import (
    get_stories as db_get_stories,
    get_story as db_get_story,
    create_story,
    update_story as db_update_story,
    delete_story as db_delete_story,
    get_chapters as db_get_chapters,
    get_chapter as db_get_chapter,
    create_chapter,
    update_chapter as db_update_chapter,
    delete_chapter as db_delete_chapter
)

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
    stories = db_get_stories()
    return jsonify(stories)

@app.route('/api/stories/<int:story_id>', methods=['GET'])
def get_story(story_id):
    story = db_get_story(story_id)
    if story:
        return jsonify(story)
    return jsonify({'error': 'Story not found'}), 404

def _get_request_data():
    if request.is_json:
        return request.get_json(silent=True) or {}
    return request.form


def _upload_cover_file_to_supabase(file):
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    bucket_name = os.getenv('SUPABASE_STORAGE_BUCKET', 'covers')
    if not supabase_url or not supabase_key:
        raise RuntimeError('Supabase service key or URL not configured on server.')

    file_name = secure_filename(file.filename)
    if not file_name:
        raise ValueError('Invalid file name')

    file_name = f"{int(time.time())}-{file_name}"
    upload_url = f"{supabase_url}/storage/v1/object/{bucket_name}/{file_name}"

    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'x-upsert': 'true',
        'Content-Type': file.content_type or 'application/octet-stream'
    }
    file_data = file.read()
    response = requests.post(upload_url, headers=headers, data=file_data)
    if response.status_code not in (200, 201):
        if response.status_code == 404:
            raise RuntimeError(
                f'Supabase upload failed: Bucket "{bucket_name}" not found. '
                'Hãy kiểm tra tên bucket trong SUPABASE_STORAGE_BUCKET và chắc chắn bucket này đã được tạo trên Supabase.'
            )
        raise RuntimeError(f'Supabase upload failed: {response.status_code} {response.text}')

    return f"{supabase_url}/storage/v1/object/public/{bucket_name}/{file_name}"


@app.route('/api/upload-cover', methods=['POST'])
def upload_cover():
    if 'cover' not in request.files:
        return jsonify({'error': 'No cover file provided'}), 400

    file = request.files['cover']
    if file.filename == '':
        return jsonify({'error': 'No cover file selected'}), 400

    try:
        public_url = _upload_cover_file_to_supabase(file)
        return jsonify({'public_url': public_url}), 200
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@app.route('/api/stories', methods=['POST'])
def add_story():
    data = _get_request_data()
    title = data.get('title')
    author = data.get('author', '')
    description = data.get('description', '')
    status = data.get('status', 'ongoing')
    genre = data.get('genre', '')
    cover_path = data.get('cover_path', '')

    if 'cover' in request.files:
        file = request.files['cover']
        if file.filename != '':
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            cover_path = filename

    story = create_story(title, author, description, cover_path, status, genre)
    if not story:
        return jsonify({'error': 'Unable to create story'}), 500
    return jsonify({'id': story.get('id'), 'message': 'Story added successfully', 'data': story}), 201


@app.route('/api/stories/<int:story_id>', methods=['PUT'])
def update_story(story_id):
    data = _get_request_data()
    existing_story = db_get_story(story_id)
    if not existing_story:
        return jsonify({'error': 'Story not found'}), 404

    title = data.get('title', existing_story.get('title'))
    author = data.get('author', existing_story.get('author', ''))
    description = data.get('description', existing_story.get('description', ''))
    status = data.get('status', existing_story.get('status', 'ongoing'))
    genre = data.get('genre', existing_story.get('genre', ''))
    cover_path = data.get('cover_path', existing_story.get('cover_path', ''))

    if 'cover' in request.files:
        file = request.files['cover']
        if file.filename != '':
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            cover_path = filename

    story = db_update_story(story_id, title, author, description, cover_path, status, genre)
    if not story:
        return jsonify({'error': 'Unable to update story'}), 500
    return jsonify({'message': 'Story updated successfully', 'data': story})

@app.route('/api/stories/<int:story_id>', methods=['DELETE'])
def delete_story(story_id):
    success = db_delete_story(story_id)
    if not success:
        return jsonify({'error': 'Unable to delete story'}), 500
    return jsonify({'message': 'Story deleted successfully'})

# --- Chapter Endpoints ---

@app.route('/api/stories/<int:story_id>/chapters', methods=['GET'])
def get_chapters(story_id):
    chapters = db_get_chapters(story_id)
    return jsonify(chapters)

@app.route('/api/chapters/<int:chapter_id>', methods=['GET'])
def get_chapter(chapter_id):
    chapter = db_get_chapter(chapter_id)
    if chapter:
        return jsonify(chapter)
    return jsonify({'error': 'Chapter not found'}), 404

@app.route('/api/stories/<int:story_id>/chapters', methods=['POST'])
def add_chapter(story_id):
    data = _get_request_data()
    chapter_number = data.get('chapter_number')
    if chapter_number is not None:
        try:
            chapter_number = int(chapter_number)
        except (ValueError, TypeError):
            chapter_number = None
    title = data.get('title', '')
    content = data.get('content', '')

    chapter = create_chapter(story_id, chapter_number, title, content)
    if not chapter:
        return jsonify({'error': 'Unable to create chapter'}), 500
    return jsonify({'id': chapter.get('id'), 'message': 'Chapter added successfully', 'data': chapter}), 201

@app.route('/api/chapters/<int:chapter_id>', methods=['PUT'])
def update_chapter(chapter_id):
    data = _get_request_data()
    chapter_number = data.get('chapter_number')
    if chapter_number is not None:
        try:
            chapter_number = int(chapter_number)
        except (ValueError, TypeError):
            chapter_number = None
    title = data.get('title')
    content = data.get('content')

    chapter = db_update_chapter(chapter_id, chapter_number, title, content)
    if not chapter:
        return jsonify({'error': 'Unable to update chapter'}), 500
    return jsonify({'message': 'Chapter updated successfully', 'data': chapter})

@app.route('/api/chapters/<int:chapter_id>', methods=['DELETE'])
def delete_chapter(chapter_id):
    success = db_delete_chapter(chapter_id)
    if not success:
        return jsonify({'error': 'Unable to delete chapter'}), 500
    return jsonify({'message': 'Chapter deleted successfully'})

# Serve favicon directly
@app.route('/favicon.ico')
def favicon():
    return send_from_directory('.', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

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
