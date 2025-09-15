// blog.js — feed + single post with frontmatter support

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("posts/posts.json", { cache: "no-store" });
    const posts = await res.json();
    const params = new URLSearchParams(location.search);
    const slug = params.get("p");

    if (slug) {
      await showPost(slug, posts);
    } else {
      showFeed(posts);
    }
  } catch (e) {
    console.error("Blog load error", e);
    const feedEl = document.getElementById("feed");
    if (feedEl) feedEl.innerHTML = `<p>Couldn’t load posts.</p>`;
  }
});

function showFeed(posts){
  const feedEl = document.getElementById("feed");
  const postEl = document.getElementById("post");
  if (postEl) postEl.style.display = "none";
  if (!feedEl) return;

  posts.sort((a,b)=> new Date(b.date) - new Date(a.date));

  feedEl.innerHTML = posts.map(p => `
    <article class="post-card">
      <h3><a href="?p=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a></h3>
      <p class="muted">${formatDate(p.date)}</p>
      ${Array.isArray(p.tags) ? p.tags.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join(" ") : ""}
      ${p.hero_image ? `<img class="thumb" src="${p.hero_image}" alt="" style="max-width:100%;margin-top:8px;border-radius:10px;border:1px solid var(--edge)">` : ""}
      <p>${escapeHtml(p.summary || "")}</p>
    </article>
  `).join("");
}

async function showPost(slug, manifest){
  const feedEl = document.getElementById("feed");
  const postEl = document.getElementById("post");
  if (feedEl) feedEl.style.display = "none";
  if (postEl) postEl.style.display = "block";

  const meta = manifest.find(p=>p.slug===slug) || { title: slug };

  const r = await fetch(`posts/${slug}.md`, { cache: "no-store" });
  const raw = await r.text();

  const { fm, body } = parseFrontmatter(raw);

  const title = fm.title || meta.title || slug;
  const date = fm.date || meta.date || "";
  const tags = fm.tags || meta.tags || [];
  const hero = fm.hero_image || meta.hero_image || "";

  document.getElementById("post-title").textContent = title;
  document.getElementById("post-date").textContent = date ? formatDate(date) : "";
  document.getElementById("post-tags").innerHTML = Array.isArray(tags) ? tags.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("") : "";
  document.getElementById("post-hero").innerHTML = hero ? `<img src="${hero}" alt="">` : "";

  // markdown render
  const contentEl = document.getElementById("post-content");
  if (window.marked) {
    marked.setOptions({ gfm:true, breaks:true });
    contentEl.innerHTML = marked.parse(body || "");
  } else {
    contentEl.innerHTML = `<pre>${escapeHtml(body || "")}</pre>`;
  }

  window.scrollTo({ top: 0, behavior: "instant" });
}

function parseFrontmatter(src){
  // tolerate BOM + CRLF
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm:{}, body: src };

  const yaml = m[1], body = src.slice(m[0].length);
  const fm = {};
  yaml.split(/\r?\n/).forEach(line=>{
    if (!line.trim()) return;
    const k = line.split(":")[0].trim();
    let v = line.slice(k.length+1).trim();
    v = v.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (v.startsWith("[") && v.endsWith("]")){
      v = v.slice(1,-1).split(",").map(s=>s.trim().replace(/^"(.*)"$/,"$1").replace(/^'(.*)'$/,"$1"));
    }
    fm[k] = v;
  });
  return { fm, body };
}

function escapeHtml(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function formatDate(iso){
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString([], {weekday:"short", month:"short", day:"numeric", year:"numeric"});
}
