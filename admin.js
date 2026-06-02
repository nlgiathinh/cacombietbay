const API_URL = '/api';

async function uploadCoverFileToServer(file) {
    const formData = new FormData();
    formData.append('cover', file);

    const response = await fetch(`${API_URL}/upload-cover`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Upload thất bại');
    }

    const result = await response.json();
    return result.public_url;
}

async function uploadStoryCoverFile() {
    const input = document.getElementById('story-cover-file');
    if (!input || !input.files.length) {
        alert('Vui lòng chọn file ảnh bìa để upload.');
        return;
    }

    try {
        const url = await uploadCoverFileToServer(input.files[0]);
        document.getElementById('story-cover-url').value = url;
        alert('Upload bìa lên Supabase thành công!');
    } catch (err) {
        console.error(err);
        alert('Upload thất bại: ' + (err.message || err));
    }
}

async function uploadEditStoryCoverFile() {
    const input = document.getElementById('edit-story-cover-file');
    if (!input || !input.files.length) {
        alert('Vui lòng chọn file ảnh bìa để upload.');
        return;
    }

    try {
        const url = await uploadCoverFileToServer(input.files[0]);
        document.getElementById('edit-story-cover').value = url;
        document.getElementById('edit-cover-preview').src = url;
        document.getElementById('edit-cover-preview').style.display = 'block';
        alert('Upload bìa lên Supabase thành công!');
    } catch (err) {
        console.error(err);
        alert('Upload thất bại: ' + (err.message || err));
    }
}

// --- Tab Switching ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
    
    if (tabId === 'tab-manage-stories') loadStories();
    if (tabId === 'tab-add-chapter' || tabId === 'tab-manage-chapters') loadStoriesForSelect();
    if (tabId === 'tab-manage-chapters') loadAllChapters();
}

// --- Story Management ---
let storiesData = [];

async function loadStories() {
    const response = await fetch(`${API_URL}/stories`);
    storiesData = await response.json();
    
    const list = document.getElementById('stories-list');
    list.innerHTML = '';
    
    if (storiesData.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="bx bx-book"></i><p>Chưa có truyện nào. Hãy thêm truyện mới!</p></div>';
        return;
    }
    
    storiesData.forEach(story => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-info">
                <h4>${story.title}</h4>
                <p>Tác giả: ${story.author || 'Ẩn danh'}</p>
                <p>${story.description || ''}</p>
            </div>
            <div class="item-actions">
                <button class="btn-action btn-edit" onclick="openEditStory(${story.id})">Sửa</button>
                <button class="btn-action btn-delete" onclick="deleteStory(${story.id})">Xóa</button>
            </div>
        `;
        list.appendChild(card);
    });
}

async function handleAddStory(event) {
    event.preventDefault();

    const payload = {
        title: document.getElementById('story-title').value,
        author: document.getElementById('story-author').value,
        description: document.getElementById('story-description').value,
        status: document.getElementById('story-status').value,
        genre: document.getElementById('story-genre').value,
        cover_path: document.getElementById('story-cover-url').value || ''
    };

    const response = await fetch(`${API_URL}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        alert('Thêm truyện thành công!');
        document.getElementById('form-add-story').reset();
        loadStories();
    } else {
        alert('Có lỗi xảy ra khi thêm truyện!');
    }
}

function openEditStory(storyId) {
    const story = storiesData.find(s => s.id === storyId);
    if (!story) return;
    
    document.getElementById('edit-story-id').value = story.id;
    document.getElementById('edit-story-title').value = story.title;
    document.getElementById('edit-story-author').value = story.author || '';
    document.getElementById('edit-story-description').value = story.description || '';
    document.getElementById('edit-story-cover').value = story.cover_path || '';
    document.getElementById('edit-story-genre').value = story.genre || '';
    document.getElementById('edit-story-status').value = story.status || 'ongoing';
    
    if (story.cover_path) {
        document.getElementById('edit-cover-preview').src = story.cover_path;
        document.getElementById('edit-cover-preview').style.display = 'block';
    }
    
    document.getElementById('modal-edit-story').classList.add('active');
}

async function handleEditStory(event) {
    event.preventDefault();
    
    const storyId = document.getElementById('edit-story-id').value;
    const payload = {
        title: document.getElementById('edit-story-title').value,
        author: document.getElementById('edit-story-author').value,
        description: document.getElementById('edit-story-description').value,
        status: document.getElementById('edit-story-status').value,
        genre: document.getElementById('edit-story-genre').value,
        cover_path: document.getElementById('edit-story-cover').value || ''
    };

    const response = await fetch(`${API_URL}/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    if (response.ok) {
        alert('Cập nhật truyện thành công!');
        closeModal('modal-edit-story');
        loadStories();
    } else {
        alert('Có lỗi xảy ra khi cập nhật truyện!');
    }
}

async function deleteStory(storyId) {
    if (!confirm('Bạn có chắc chắn muốn xóa truyện này và tất cả chương của nó?')) return;
    
    const response = await fetch(`${API_URL}/stories/${storyId}`, {
        method: 'DELETE'
    });
    
    if (response.ok) {
        alert('Xóa truyện thành công!');
        loadStories();
    } else {
        alert('Có lỗi xảy ra khi xóa truyện!');
    }
}

// --- Chapter Management ---
let chaptersData = [];

async function loadStoriesForSelect() {
    const response = await fetch(`${API_URL}/stories`);
    const stories = await response.json();
    
    const selectStory = document.getElementById('select-story');
    const filterStory = document.getElementById('filter-story-chapters');
    
    selectStory.innerHTML = '<option value="">-- Chọn truyện --</option>';
    filterStory.innerHTML = '<option value="">-- Tất cả truyện --</option>';
    
    stories.forEach(story => {
        selectStory.innerHTML += `<option value="${story.id}">${story.title}</option>`;
        filterStory.innerHTML += `<option value="${story.id}">${story.title}</option>`;
    });
}

async function loadAllChapters() {
    const response = await fetch(`${API_URL}/stories`);
    const stories = await response.json();
    
    chaptersData = [];
    for (const story of stories) {
        const chapResponse = await fetch(`${API_URL}/stories/${story.id}/chapters`);
        const chapters = await chapResponse.json();
        chapters.forEach(chap => {
            chaptersData.push({...chap, storyTitle: story.title});
        });
    }
    
    displayChapters();
}

function displayChapters(filterStoryId = '') {
    const list = document.getElementById('chapters-list');
    list.innerHTML = '';
    
    const filtered = filterStoryId ? chaptersData.filter(c => c.story_id == filterStoryId) : chaptersData;
    const sorted = filtered.slice().sort((a, b) => {
        if (a.story_id !== b.story_id) {
            return a.storyTitle.localeCompare(b.storyTitle);
        }
        return Number(a.chapter_number) - Number(b.chapter_number);
    });
    
    if (sorted.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="bx bx-file"></i><p>Chưa có chương nào.</p></div>';
        return;
    }
    
    sorted.forEach(chapter => {
        const card = document.createElement('div');
        card.className = 'item-card';
        // Only render the chapter title text itself. Do not add or prepend
        // any ordinal label in the admin list.
        const rawTitle = chapter.title ? chapter.title.trim() : '';
        const displayTitle = rawTitle;
        card.innerHTML = `
            <div class="item-info">
                <h4>${displayTitle}</h4>
                <p>Truyện: ${chapter.storyTitle}</p>
            </div>
            <div class="item-actions">
                <button class="btn-action btn-move" onclick="moveChapterOrder(${chapter.id}, 'up')">▲</button>
                <button class="btn-action btn-move" onclick="moveChapterOrder(${chapter.id}, 'down')">▼</button>
                <button class="btn-action btn-edit" onclick="openEditChapter(${chapter.id})">Sửa</button>
                <button class="btn-action btn-delete" onclick="deleteChapter(${chapter.id})">Xóa</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function filterChapters() {
    const filterStoryId = document.getElementById('filter-story-chapters').value;
    displayChapters(filterStoryId);
}

async function handleAddChapter(event) {
    event.preventDefault();
    
    const storyId = document.getElementById('select-story').value;
    const chapterNumber = parseInt(document.getElementById('chap-number').value, 10);
    if (!storyId) {
        alert('Vui lòng chọn truyện trước khi thêm chương.');
        return;
    }
    if (isNaN(chapterNumber) || chapterNumber < 1) {
        alert('Vui lòng nhập số chương hợp lệ.');
        return;
    }

    const formData = new FormData();
    const title = document.getElementById('chap-title').value;
    
    formData.append('chapter_number', chapterNumber);
    formData.append('title', title);
    formData.append('content', document.getElementById('chap-content').value);
    
    const response = await fetch(`${API_URL}/stories/${storyId}/chapters`, {
        method: 'POST',
        body: formData
    });
    
    if (response.ok) {
        alert('Thêm chương thành công!');
        document.getElementById('form-add-chapter').reset();
        loadAllChapters();
    } else {
        alert('Có lỗi xảy ra khi thêm chương!');
    }
}

function openEditChapter(chapterId) {
    const chapter = chaptersData.find(c => c.id === chapterId);
    if (!chapter) return;
    
    document.getElementById('edit-chapter-id').value = chapter.id;
    document.getElementById('edit-chapter-story-id').value = chapter.story_id;
    document.getElementById('edit-chapter-number').value = chapter.chapter_number || 1;
    document.getElementById('edit-chapter-title').value = chapter.title || '';
    document.getElementById('edit-chapter-content').value = chapter.content || '';
    
    document.getElementById('modal-edit-chapter').classList.add('active');
}

async function handleEditChapter(event) {
    event.preventDefault();
    
    const chapterId = document.getElementById('edit-chapter-id').value;
    const chapterNumber = parseInt(document.getElementById('edit-chapter-number').value, 10);
    if (isNaN(chapterNumber) || chapterNumber < 1) {
        alert('Vui lòng nhập số chương hợp lệ.');
        return;
    }
    const formData = new FormData();
    
    const title = document.getElementById('edit-chapter-title').value;
    
    formData.append('chapter_number', chapterNumber);
    formData.append('title', title);
    formData.append('content', document.getElementById('edit-chapter-content').value);
    
    const response = await fetch(`${API_URL}/chapters/${chapterId}`, {
        method: 'PUT',
        body: formData
    });
    
    if (response.ok) {
        alert('Cập nhật chương thành công!');
        closeModal('modal-edit-chapter');
        loadAllChapters();
    } else {
        alert('Có lỗi xảy ra khi cập nhật chương!');
    }
}

async function deleteChapter(chapterId) {
    if (!confirm('Bạn có chắc chắn muốn xóa chương này?')) return;
    
    const response = await fetch(`${API_URL}/chapters/${chapterId}`, {
        method: 'DELETE'
    });
    
    if (response.ok) {
        alert('Xóa chương thành công!');
        loadAllChapters();
    } else {
        alert('Có lỗi xảy ra khi xóa chương!');
    }
}

async function updateChapterNumber(chapterId, chapterNumber, title, content) {
    const formData = new FormData();
    formData.append('chapter_number', chapterNumber);
    formData.append('title', title);
    formData.append('content', content);

    const response = await fetch(`${API_URL}/chapters/${chapterId}`, {
        method: 'PUT',
        body: formData
    });
    return response.ok;
}

async function moveChapterOrder(chapterId, direction) {
    const chapter = chaptersData.find(c => c.id === chapterId);
    if (!chapter) return;

    const sameStoryChapters = chaptersData
        .filter(c => c.story_id === chapter.story_id)
        .slice()
        .sort((a, b) => Number(a.chapter_number) - Number(b.chapter_number));

    const currentIndex = sameStoryChapters.findIndex(c => c.id === chapterId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sameStoryChapters.length) return;

    const targetChapter = sameStoryChapters[targetIndex];
    const currentNumber = Number(chapter.chapter_number);
    const targetNumber = Number(targetChapter.chapter_number);

    const updatedCurrent = await updateChapterNumber(chapterId, targetNumber, chapter.title, chapter.content);
    if (!updatedCurrent) {
        alert('Không thể đổi vị trí chương. Vui lòng thử lại.');
        return;
    }

    const updatedTarget = await updateChapterNumber(targetChapter.id, currentNumber, targetChapter.title, targetChapter.content);
    if (!updatedTarget) {
        alert('Có lỗi khi cập nhật chương đối ứng. Tải lại trang để kiểm tra lại.');
        return;
    }

    loadAllChapters();
}

// --- Modal Management ---
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Initial load
loadStories();

function formatText(tag, textareaId = 'chap-content') {
    const textarea = document.getElementById(textareaId);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    const openTag = `<${tag}>`;
    const closeTag = `</${tag}>`;
    
    const newText = text.substring(0, start) + openTag + selectedText + closeTag + text.substring(end);
    textarea.value = newText;
    textarea.focus();
    textarea.setSelectionRange(start + openTag.length, end + openTag.length);
}

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'i')) {
        e.preventDefault();
        const tag = e.key === 'b' ? 'b' : 'i';
        const activeElement = document.activeElement;
        if (activeElement.id === 'chap-content' || activeElement.id === 'edit-chapter-content') {
            formatText(tag, activeElement.id);
        }
    }
});
