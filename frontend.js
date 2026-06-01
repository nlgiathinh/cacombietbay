// Dữ liệu mẫu ban đầu (Nếu API không khả dụng)
const defaultData = [
    {
        id: "truyen_1",
        title: "Nghê Thường Trướng Noãn",
        author: "Cá Cơm Mộng Mơ",
        cover_path: "samplecover.png",
        description: "Một câu chuyện nhẹ nhàng về những chuyến bay vượt đại dương của chú cá nhỏ mang theo nhiều ước mơ...",
        status: "ongoing",
        chapters: [
            { id: 1, chapter_number: 1, title: "Chương 1: Bình minh trên biển", content: "<p>Sáng sớm, mặt biển lấp lánh như được rắc hàng vạn viên kim cương xanh. Cá Cơm vươn chiếc vây nhỏ xíu, hít một hơi thật sâu mùi mặn mòi của gió.</p><p>Hôm nay là ngày cậu quyết định sẽ tập bay.</p>" },
            { id: 2, chapter_number: 2, title: "Chương 2: Chạm vào đám mây", content: "<p>Cú nhảy đầu tiên thất bại. Nhưng ở lần thứ hai, đuôi cậu quẫy mạnh vào mặt nước, tạo ra một lực đẩy phi thường.</p><p>Cậu thấy mình đang lơ lửng, gió lùa qua vây mát rượi. Đám mây trắng xốp đang ở ngay trước mắt.</p>" }
        ]
    }
];

const API_URL = '/api';
let db = [];
let currentStoryId = null;
let currentChapterIdx = 0;
let currentStoryChapters = [];
let currentFontSize = 1.2;

// Helper: build a slightly more responsive thumbnail image. For known
// providers (e.g. Unsplash) we provide a srcset; always enable lazy loading
// and async decoding to reduce perceived pixelation and improve loading.
function buildCoverImgHtml(coverUrl, role = 'thumb') {
    const attrs = `loading="lazy" decoding="async"`;
    let srcset = '';
    try {
        if (/images\.unsplash\.com/i.test(coverUrl)) {
            const base = coverUrl.split('?')[0];
            const s500 = `${base}?w=500&q=80&auto=format`;
            const s1000 = `${base}?w=1000&q=80&auto=format`;
            srcset = `${s500} 500w, ${s1000} 1000w`;
        }
    } catch (e) {
        srcset = '';
    }

    if (srcset) {
        const sizes = role === 'thumb' ? `(max-width:600px) 50vw, 250px` : `(max-width:800px) 50vw, 440px`;
        return `<img src="${coverUrl}" srcset="${srcset}" sizes="${sizes}" alt="Bìa truyện" ${attrs}>`;
    }
    return `<img src="${coverUrl}" alt="Bìa truyện" ${attrs}>`;
}

document.addEventListener("DOMContentLoaded", async () => {
    // Tải dữ liệu từ API
    try {
        const res = await fetch(`${API_URL}/stories`);
        if (res.ok) {
            const stories = await res.json();
            // Load chapters for each story
            db = [];
            for (const story of stories) {
                const chapRes = await fetch(`${API_URL}/stories/${story.id}/chapters`);
                const chapters = await chapRes.json();
                db.push({
                    id: story.id.toString(),
                    title: story.title,
                    author: story.author,
                    cover: story.cover_path ? story.cover_path : 'logo.png',
                    description: story.description,
                    status: story.status || 'ongoing',
                    chapters: chapters
                });
            }
        } else {
            db = defaultData;
        }
    } catch (e) {
        console.error("Không thể tải dữ liệu từ API, dùng dữ liệu mẫu", e);
        db = defaultData;
    }

    loadTheme();
    showHome();
});

// --- QUẢN LÝ VIEW ---
function hideAllViews() {
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-story').classList.add('hidden');
    document.getElementById('view-reading').classList.add('hidden');
    window.scrollTo(0,0);
}

function showHome() {
    hideAllViews();
    document.getElementById('view-home').classList.remove('hidden');
    
    const grid = document.getElementById('book-grid-container');
    grid.innerHTML = '';
        db.forEach(story => {
            let statusText = 'Đang cập nhật';
            if (story.status === 'completed') statusText = 'Hoàn thành';
            else if (story.status === 'hiatus') statusText = 'Tạm dừng';
            else if (story.status === 'ongoing') statusText = 'Đang cập nhật';
            else statusText = story.status;

            grid.innerHTML += `
                <div class="book-card" onclick="showStory('${story.id}')">
                    <div class="cover-wrapper">${buildCoverImgHtml(story.cover, 'thumb')}</div>
                    <h3 class="story-card-title">${story.title}</h3>
                    <p>Tác giả: ${story.author}</p>
                    <p style="margin-top:6px; font-size:0.85rem; color: var(--text-color); opacity:0.85">
                        <strong style="color: var(--accent-color);">${statusText}</strong>
                    </p>
                    <p style="margin-top:8px; font-size:0.8rem; color: var(--accent-color)">${story.chapters.length} chương</p>
                </div>
            `;
        });
}

function showStory(storyId) {
    hideAllViews();
    document.getElementById('view-story').classList.remove('hidden');
    currentStoryId = storyId;
    
    const story = db.find(s => s.id === storyId);
    const sortedChapters = story.chapters.slice().sort((a, b) => Number(a.chapter_number) - Number(b.chapter_number));
    currentStoryChapters = sortedChapters;
    
    // Render Metadata
    document.getElementById('story-meta-container').innerHTML = `
        <div class="cover-wrapper">${buildCoverImgHtml(story.cover, 'meta')}</div>
        <div class="meta-info">
            <h1 class="story-title">${story.title}</h1>
            <p><strong>Tác giả:</strong> ${story.author}</p>
            <p style="margin-top: 15px; opacity: 0.8;">${story.description}</p>
        </div>
    `;

    // Render Chapters
    const chapList = document.getElementById('chapter-list-container');
    chapList.innerHTML = '';
    currentStoryChapters.forEach((chap, idx) => {
        chapList.innerHTML += `
            <div class="chap-item" onclick="readChapter(${idx})">
                <span>${chap.title}</span>
                <i class='bx bx-book-open'></i>
            </div>
        `;
    });
}

function readChapter(idx) {
    hideAllViews();
    document.getElementById('view-reading').classList.remove('hidden');
    currentChapterIdx = idx;
    
    const story = db.find(s => s.id === currentStoryId);
    const chapter = currentStoryChapters[idx];

    document.getElementById('reading-title').innerText = chapter.title;

    const contentDiv = document.getElementById('reading-content');
    contentDiv.innerHTML = '';

    // Nếu nội dung chứa HTML (ví dụ <p>, <br>, <img>...), render HTML trực tiếp.
    // Ngược lại, coi đó là plain text và giữ nguyên newline bằng cách tách '\n' thành <p>.
    if (chapter && typeof chapter.content === 'string' && /<\s*(p|br|div|img|span|strong|em|a)[\s>]/i.test(chapter.content)) {
        contentDiv.innerHTML = chapter.content;
    } else {
        const lines = (chapter && chapter.content) ? chapter.content.split('\n') : [];
        lines.forEach(line => {
            // Nếu dòng rỗng, thêm một đoạn <p> rỗng để duy trì khoảng cách
            const p = document.createElement('p');
            p.textContent = line;
            contentDiv.appendChild(p);
        });
    }

    document.getElementById('btn-prev').disabled = (idx === 0);
    document.getElementById('btn-next').disabled = (idx === currentStoryChapters.length - 1);
}

function changeChapter(step) {
    const story = db.find(s => s.id === currentStoryId);
    let newIdx = currentChapterIdx + step;
    if (newIdx >= 0 && newIdx < story.chapters.length) {
        readChapter(newIdx);
    }
}

// --- TIỆN ÍCH GIAO DIỆN ---
function changeTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('reading-theme', theme);
}
function loadTheme() { changeTheme(localStorage.getItem('reading-theme') || 'light'); }

function changeFontSize(step) {
    currentFontSize += step * 0.1;
    if (currentFontSize < 1.0) currentFontSize = 1.0;
    if (currentFontSize > 2.0) currentFontSize = 2.0;
    document.getElementById('reading-content').style.fontSize = `${currentFontSize}rem`;
}

// --- ADMIN ACCESS ---
function checkAdmin() {
    const pass = prompt("Nhập mật khẩu để vào phòng viết truyện");
    if (pass === "vydepgai") {
        window.location.href = "admin.html";
    } else if (pass !== null) {
        alert("Sai mật khẩu!");
    }
}