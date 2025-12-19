// ============================================
// THE CATALYST MAGAZINE - MAIN JAVASCRIPT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupNavigation();
    setupScrollEffects();
    setupScrollToTop();
    setupForms();

    // Page-specific initialization
    const page = document.body.dataset.page || detectPage();

    if (page === 'home') {
        initHomePage();
    } else if (page === 'articles') {
        initArticlesPage();
    } else if (page === 'article') {
        initArticleDetailPage();
    }
}

function detectPage() {
    const path = window.location.pathname;
    if (path.includes('article.html')) return 'article';
    if (path.includes('articles')) return 'articles';
    if (path.includes('collaborate')) return 'collaborate';
    if (path.includes('about')) return 'about';
    return 'home';
}

// ============================================
// NAVIGATION
// ============================================
function setupNavigation() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
        });

        // Close on link click
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
            });
        });
    }

    // Set active nav link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

// ============================================
// SCROLL EFFECTS
// ============================================
function setupScrollEffects() {
    const header = document.querySelector('.header');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header?.classList.add('scrolled');
        } else {
            header?.classList.remove('scrolled');
        }
    });

    // Intersection observer for fade-in
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

// ============================================
// SCROLL TO TOP
// ============================================
function setupScrollToTop() {
    const scrollBtn = document.getElementById('scroll-top');
    if (!scrollBtn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });

    scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ============================================
// HOME PAGE
// ============================================
function initHomePage() {
    initHeroFeatured();
    initHomeArticles();
}

function initHeroFeatured() {
    const container = document.getElementById('hero-featured');
    if (!container || typeof articles === 'undefined') return;

    // Use the first article as featured
    const featured = articles[0];

    container.innerHTML = `
        <div class="featured-card" onclick="viewArticle(${featured.id})">
            <img src="${featured.image}" alt="${featured.title}" class="featured-card-image">
            <div class="featured-card-overlay">
                <span class="featured-card-category">${formatCategory(featured.category)}</span>
                <h3 class="featured-card-title">${featured.title}</h3>
                <p class="featured-card-meta">${featured.author} • ${featured.date}</p>
            </div>
        </div>
        <div class="floating-cards">
            <div class="floating-card">
                <div class="floating-card-icon" style="font-size: 2.5rem; font-weight: 800; color: var(--accent-primary);">25+</div>
                <div class="floating-card-text">Articles</div>
            </div>
            <div class="floating-card">
                <div class="floating-card-icon" style="font-size: 2.5rem; font-weight: 800; color: var(--accent-secondary);">15+</div>
                <div class="floating-card-text">Contributors</div>
            </div>
            <div class="floating-card">
                <div class="floating-card-icon" style="font-size: 2.5rem; font-weight: 800; color: var(--accent-light-blue);">100%</div>
                <div class="floating-card-text">Free</div>
            </div>
        </div>
    `;
}

function initHomeArticles() {
    const grid = document.getElementById('home-articles-grid');
    if (!grid || typeof articles === 'undefined') return;

    // Show first 7 articles (most recent)
    const homeArticles = articles.slice(0, 7);

    grid.innerHTML = homeArticles.map(article => createArticleCard(article)).join('');
}

// ============================================
// ARTICLES PAGE
// ============================================
let articlesDisplayed = 9;
let currentFilter = 'all';

function initArticlesPage() {
    renderArticles();
    renderEditorials();
    setupFilters();
    setupLoadMore();
}

function renderArticles(filter = 'all') {
    const grid = document.getElementById('articles-grid');
    if (!grid || typeof articles === 'undefined') return;

    currentFilter = filter;
    const filtered = filter === 'all'
        ? articles
        : articles.filter(a => a.category === filter);

    const toShow = filtered.slice(0, articlesDisplayed);

    grid.innerHTML = toShow.map(article => createArticleCard(article)).join('');

    // Update load more visibility
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = articlesDisplayed >= filtered.length ? 'none' : 'inline-flex';
    }
}

function createArticleCard(article) {
    return `
        <article class="article-card fade-in" onclick="viewArticle(${article.id})">
            <div class="article-image">
                <img src="${article.image}" alt="${article.title}" loading="lazy">
                <span class="article-category ${article.category}">${formatCategory(article.category)}</span>
            </div>
            <div class="article-content">
                <h3 class="article-title">${article.title}</h3>
                <p class="article-excerpt">${article.excerpt}</p>
                <div class="article-meta">
                    <span class="article-author">${article.author}</span>
                    <span>${article.date}</span>
                </div>
            </div>
        </article>
    `;
}

function renderEditorials() {
    const grid = document.getElementById('editorials-grid');
    if (!grid || typeof editorials === 'undefined') return;

    grid.innerHTML = editorials.map(article => `
        <article class="article-card fade-in">
            <div class="article-content" style="padding-top: 28px;">
                <span class="article-category ${article.category.replace('-', '')}" style="position: relative; margin-bottom: 16px;">${formatCategory(article.category)}</span>
                <h3 class="article-title">${article.title}</h3>
                <p class="article-excerpt">${article.excerpt}</p>
                <div class="article-meta">
                    <span class="article-author">${article.author}</span>
                    <span>${article.date}</span>
                </div>
            </div>
        </article>
    `).join('');
}

function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            articlesDisplayed = 9;
            renderArticles(btn.dataset.filter);
        });
    });
}

function setupLoadMore() {
    const btn = document.getElementById('load-more-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            articlesDisplayed += 6;
            renderArticles(currentFilter);
        });
    }
}

// ============================================
// FORMS
// ============================================
function setupForms() {
    // Newsletter form
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showNotification('Thank you for subscribing!');
            newsletterForm.reset();
        });
    }

    // Proposal form
    const proposalForm = document.getElementById('proposal-form');
    if (proposalForm) {
        proposalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showNotification('Thank you for your submission! We will review it soon.');
            proposalForm.reset();
        });
    }

    // Team form
    const teamForm = document.getElementById('team-form');
    if (teamForm) {
        teamForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showNotification('Thank you for your interest! We will be in touch.');
            teamForm.reset();
        });
    }
}

function showNotification(message) {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>${message}</span>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        bottom: 32px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: linear-gradient(135deg, #0D47A1 0%, #1976D2 50%, #42A5F5 100%);
        color: white;
        padding: 16px 28px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 600;
        box-shadow: 0 10px 40px rgba(13, 71, 161, 0.4);
        z-index: 10000;
        animation: slideUp 0.4s ease forwards;
    `;

    // Add animation keyframes if not exists
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideUp {
                to { transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideUp 0.4s ease reverse forwards';
        setTimeout(() => notification.remove(), 400);
    }, 4000);
}

// ============================================
// ARTICLE DETAIL PAGE
// ============================================
function initArticleDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = parseInt(urlParams.get('id'));

    if (!articleId || typeof articles === 'undefined') {
        window.location.href = 'articles.html';
        return;
    }

    const article = articles.find(a => a.id === articleId);
    if (!article) {
        window.location.href = 'articles.html';
        return;
    }

    renderArticleDetail(article);
    renderRelatedArticles(article);
}

function renderArticleDetail(article) {
    const container = document.getElementById('article-detail');
    if (!container) return;

    // Update page title
    document.title = `${article.title} | The Catalyst Magazine`;

    container.innerHTML = `
        <div class="article-detail-header">
            <span class="article-detail-category">${formatCategory(article.category)}</span>
            <h1 class="article-detail-title">${article.title}</h1>
            <div class="article-detail-meta">
                <span class="article-detail-author">${article.author}</span>
                <span>•</span>
                <span>${article.date}</span>
            </div>
        </div>

        <div class="article-detail-image">
            <img src="${article.image}" alt="${article.title}">
        </div>

        <div class="article-detail-content">
            ${article.content ? article.content : `
                <p>${article.excerpt}</p>
                <p>This article is available on The Catalyst Magazine website.</p>
            `}
            <p style="margin-top: 40px; padding-top: 30px; border-top: 1px solid rgba(0, 0, 0, 0.1);">
                <a href="${article.link}" target="_blank" class="btn btn-primary" style="display: inline-flex;">
                    Read on Catalyst Magazine Website
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                </a>
            </p>
        </div>
    `;
}

function renderRelatedArticles(currentArticle) {
    const container = document.getElementById('related-articles');
    if (!container || typeof articles === 'undefined') return;

    // Get 3 random articles from the same category, excluding current
    const related = articles
        .filter(a => a.id !== currentArticle.id && a.category === currentArticle.category)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

    // If not enough from same category, fill with random articles
    if (related.length < 3) {
        const additional = articles
            .filter(a => a.id !== currentArticle.id && !related.includes(a))
            .sort(() => Math.random() - 0.5)
            .slice(0, 3 - related.length);
        related.push(...additional);
    }

    container.innerHTML = related.map(article => createArticleCard(article)).join('');
}

function viewArticle(articleId) {
    window.location.href = `article.html?id=${articleId}`;
}

// ============================================
// UTILITIES
// ============================================
function formatCategory(category) {
    const map = {
        'feature': 'Feature',
        'profile': 'Profile',
        'interview': 'Interview',
        'op-ed': 'Op-Ed',
        'oped': 'Op-Ed',
        'editorial': 'Editorial'
    };
    return map[category] || category.charAt(0).toUpperCase() + category.slice(1);
}
