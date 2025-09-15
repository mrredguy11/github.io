// blog/blog.js — robust loader that strips YAML front-matter and renders markdown
const FEED_EL = document.getElementById('feed');
const POST_EL = document.getElementById('post');
const TITLE_EL = document.getElementById('post-title');
const DATE_EL  = document.getElementById('post-date');
const TAGS_EL  = document.getElementById('post-tags');
const HERO_EL  = document.getElementById('post-hero');
const CONTENT_EL = document.getElementById('post-content');

const POSTS_DIR = 'posts';
const POSTS_JSON = `${POSTS_DIR}/posts.json`;

const html = String.raw;
const esc = (s) => (s == null ? '' : String(s));

function getSlugFromURL() {
  const usp = new URLSearchParams(location.search);
  let slug = usp.get('p');
  if (!slug && location.hash.startsWith('#/')) {
    slug = decodeURIComponent(location.hash.slice(2));
  }
  return slug;
}

async function fetchJSON(url) {
  const r = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}
async function fetchText(url) {
  const r = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.text();
}

// Remove a leading YAML front-matter block (--- ... ---) if present
function stripFrontMatter(md) {
  if (!md) return md;
  const fm = /^\ufeff?---[\s\S]*?---\s*/; // handles BOM + front-matter at start
  return md.replace(fm, '');
}

function renderFeed(posts) {
  POST_EL.style.display = 'none';
  FEED_EL.style.display = 'grid';

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  FEED_EL.innerHTML = posts.map(p => html`
    <article class="post-card">
      <h3><a href="./?p=${encodeURIComponent(p.slug)}">${esc(p.title)}</a></h3>
      <p class="muted">${dayjs(p.date).format('YYYY-MM-DD')}${p.tags?.length ? ' • ' + p.tags.join(', ') : ''}</p>
      ${p.hero_image ? `<img src="${esc(p.hero_image)}" alt="" style="width:100%;border:1px solid var(--edge);border-radius:10px;margin:8px 0;"/>` : ''}
      <p>${esc(p.summary || '')}</p>
      <p><a class="link" href="./?p=${encodeURIComponent(p.slug)}">Read →</a></p>
    </article>
  `).join('');
}

function renderPostMeta(post) {
  TITLE_EL.textContent = post.title || 'Untitled';
  DATE_EL.textContent = post.date ? dayjs(post.date).format('YYYY-MM-DD') : '';
  TAGS_EL.innerHTML = (post.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('');
  HERO_EL.innerHTML = post.hero_image ? `<img src="${esc(post.hero_image)}" alt="${esc(post.title)}" />` : '';
}

async function renderPost(slug, posts) {
  const post = posts.find(p => p.slug === slug);
  if (!post) {
    FEED_EL.style.display = 'none';
    POST_EL.style.display = 'block';
    TITLE_EL.textContent = 'Not Found';
    DATE_EL.textContent = '';
    TAGS_EL.innerHTML = '';
    HERO_EL.innerHTML = '';
    CONTENT_EL.innerHTML = `<p>Post with slug <code>${esc(slug)}</code> not found.</p>`;
    return;
  }

  // fetch markdown by slug
  const mdPath = `${POSTS_DIR}/${post.slug}.md`;
  let md = '';
  try {
    md = await fetchText(mdPath);
  } catch (e) {
    console.error('Markdown fetch failed:', e);
    FEED_EL.style.display = 'none';
    POST_EL.style.display = 'block';
    renderPostMeta(post);
    CONTENT_EL.innerHTML = `<p>Could not load the post content (<code>${esc(mdPath)}</code>).</p>`;
    return;
  }

  // strip YAML front-matter so only the article shows
  const body = stripFrontMatter(md || '');
  renderPostMeta(post);
  CONTENT_EL.innerHTML = marked.parse(body);

  FEED_EL.style.display = 'none';
  POST_EL.style.display = 'block';
}

async function main() {
  try {
    const posts = await fetchJSON(POSTS_JSON);
    const slug = getSlugFromURL();
    if (slug) {
      await renderPost(slug, posts);
    } else {
      renderFeed(posts);
    }
    window.addEventListener('hashchange', () => {
      const s = getSlugFromURL();
      if (s) renderPost(s, posts);
      else renderFeed(posts);
    });
  } catch (e) {
    console.error('Blog load error:', e);
    FEED_EL.innerHTML = `<p>Failed to load the blog index. Check console for details.</p>`;
  }
}

main();
