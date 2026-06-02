// Dữ liệu mẫu ban đầu (Nếu API không khả dụng)
const defaultData = [
    {
        id: "truyen_1",
        title: "Sau Khi Trọng Sinh, Thứ Tử Âm Trầm Ngày Ngày Mong Nàng Thành Quả Phụ",
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

// Tính tổng và trung bình lượt view của một truyện
function getStoryViewStats(story) {
    const chapters = story.chapters || [];
    const total = chapters.reduce((sum, c) => sum + (Number(c.views) || 0), 0);
    const avg = chapters.length > 0 ? total / chapters.length : 0;
    return { total, avg, count: chapters.length };
}

// Trả về Set chứa id của các truyện "đang cập nhật" có avg view cao nhất (gán HOT)
function getHotStoryIds() {
    const ongoing = db.filter(s => (s.status || 'ongoing') === 'ongoing');
    const withStats = ongoing
        .map(s => ({ id: s.id, avg: getStoryViewStats(s).avg }))
        .filter(s => s.avg > 0);
    if (withStats.length === 0) return new Set();
    const maxAvg = Math.max(...withStats.map(s => s.avg));
    return new Set(withStats.filter(s => s.avg === maxAvg).map(s => s.id));
}

function formatViews(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

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
    const hotIds = getHotStoryIds();
        db.forEach(story => {
            let statusText = 'Đang cập nhật';
            if (story.status === 'completed') statusText = 'Hoàn thành';
            else if (story.status === 'hiatus') statusText = 'Tạm dừng';
            else if (story.status === 'ongoing') statusText = 'Đang cập nhật';
            else statusText = story.status;

            const { total: totalViews } = getStoryViewStats(story);
            const hotBadge = hotIds.has(story.id)
                ? `<span class="hot-badge" title="Truyện nổi bật">HOT</span>`
                : '';

            grid.innerHTML += `
                <div class="book-card" onclick="showStory('${story.id}')" title="${story.title}">
                    <div class="cover-wrapper">
                        ${buildCoverImgHtml(story.cover, 'thumb')}
                        ${hotBadge}
                    </div>
                    <h3 class="story-card-title">${story.title}</h3>
                    <p>Tác giả: ${story.author}</p>
                    <p style="margin-top:6px; font-size:0.85rem; color: var(--text-color); opacity:0.85">
                        <strong style="color: var(--accent-color);">${statusText}</strong>
                    </p>
                    <p class="chapter-count" style="margin-top:8px; font-size:0.8rem; color: var(--accent-color)">
                        ${story.chapters.length} chương
                    </p>
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

    const { total: totalViews } = getStoryViewStats(story);

    // Render Metadata
    document.getElementById('story-meta-container').innerHTML = `
        <div class="cover-wrapper">${buildCoverImgHtml(story.cover, 'meta')}</div>
        <div class="meta-info">
            <h1 class="story-title">${story.title}</h1>
            <p><strong>Tác giả:</strong> ${story.author}</p>
            <p style="margin-top: 8px;"><span class="view-count"><i class='bx bx-show'></i> ${formatViews(totalViews)} lượt xem</span></p>
            <p style="margin-top: 15px; opacity: 0.8;">${story.description}</p>
        </div>
    `;

    // Render Chapters
    const chapList = document.getElementById('chapter-list-container');
    chapList.innerHTML = '';
    currentStoryChapters.forEach((chap, idx) => {
        const views = Number(chap.views) || 0;
        chapList.innerHTML += `
            <div class="chap-item" onclick="readChapter(${idx})">
                <span>${chap.title}</span>
                <span class="chap-meta">
                    <span class="view-count"><i class='bx bx-show'></i> ${formatViews(views)}</span>
                    <i class='bx bx-book-open'></i>
                </span>
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

    incrementChapterView(chapter);
}

// Gọi API tăng lượt xem cho chương. Mỗi chương chỉ tăng 1 lần / phiên trình duyệt.
async function incrementChapterView(chapter) {
    if (!chapter || !chapter.id) return;
    const key = `viewed_chapter_${chapter.id}`;
    try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
    } catch (e) {
        // sessionStorage có thể bị chặn; vẫn cố gắng tăng view
    }

    try {
        const res = await fetch(`${API_URL}/chapters/${chapter.id}/view`, { method: 'POST' });
        if (!res.ok) return;
        const data = await res.json();
        // Cập nhật cache cục bộ để UI phản ánh ngay
        const story = db.find(s => s.id === currentStoryId);
        if (story) {
            const target = story.chapters.find(c => c.id === chapter.id);
            if (target) target.views = data.views;
        }
        chapter.views = data.views;
    } catch (e) {
        console.error('Không thể tăng lượt xem', e);
    }
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