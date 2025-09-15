// Simple zero-build blog engine
// - loads /blog/posts/posts.json
// - renders feed OR single post (?p=slug)

const FEED_EL = document.getElementById('feed');
const POST_EL = document.getElementById('post');

async function loadManifest(){
  const r = await fetch('/blog/posts/posts.json', {cache:'no-store'});
  if(!r.ok) throw new Error('posts.json not found');
  return r.json();
}

function excerpt(markdown, max=220){
  // crude excerpt: first paragraph without images/headings
  const lines = markdown.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('!['));
  const text = lines.join(' ').replace(/[`*_>#]/g,'').trim();
  return text.length>max ? text.slice(0,max-1)+'…' : text;
}

function renderFeed(posts){
  FEED_EL.style.display = '';
  POST_EL.style.display = 'none';
  FEED_EL.innerHTML = '';

  posts.sort((a,b)=> new Date(b.date) - new Date(a.date));

  posts.forEach(p=>{
    const card = document.createElement('article');
    card.className = 'post-card';

    const title = document.createElement('h3');
    const a = document.createElement('a');
    a.href = `?p=${encodeURIComponent(p.slug)}`;
    a.textContent = p.title;
    title.appendChild(a);

    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = dayjs(p.date).format('ddd, MMM D, YYYY');

    const tags = document.createElement('div');
    if (p.tags?.length) {
      p.tags.forEach(t=>{
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = t;
        tags.appendChild(tag);
      });
    }

    const summary = document.createElement('p');
    summary.textContent = p.summary || '';

    // Optional inline excerpt by sneak-peeking the md (without blocking feed if it fails)
    fetch(`/blog/posts/${p.slug}.md`).then(r=>r.ok?r.text():null).then(md=>{
      if(md && !summary.textContent) summary.textContent = excerpt(md);
    }).catch(()=>{});

    card.append(title, meta, tags, summary);
    FEED_EL.appendChild(card);
  });
}

async function renderPost(slug){
  FEED_EL.style.display = 'none';
  POST_EL.style.display = '';

  // load post md
  const r = await fetch(`/blog/posts/${slug}.md`, {cache:'no-store'});
  if(!r.ok){ POST_EL.innerHTML = `<p>Post not found.</p><p><a class="backlink" href="/blog/">← Back</a></p>`; return; }
  const md = await r.text();

  // find post meta from manifest
  const manifest = await loadManifest();
  const p = manifest.find(x=>x.slug===slug) || {title: slug, date:''};

  const header = `
    <a class="backlink" href="/blog/">← Back</a>
    <h2>${p.title}</h2>
    <div class="muted">${p.date ? dayjs(p.date).format('ddd, MMM D, YYYY') : ''}</div>
    ${p.tags?.length ? `<div>${p.tags.map(t=>`<span class="tag">${t}</span>`).join(' ')}</div>` : ''}
    <hr>
  `;
  POST_EL.innerHTML = header + marked.parse(md);
}

function route(){
  const url = new URL(window.location.href);
  const slug = url.searchParams.get('p');
  if (slug) renderPost(slug);
  else loadManifest().then(renderFeed).catch(err=>{
    FEED_EL.innerHTML = `<p>Couldn’t load posts: ${err.message}</p>`;
  });
}

route();
