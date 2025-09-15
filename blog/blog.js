// blog.js — improved debug version

const POSTS_DIR = "posts";
const POSTS_JSON = `${POSTS_DIR}/posts.json`;

async function loadPosts() {
  try {
    console.log("Fetching posts.json from:", POSTS_JSON);
    const res = await fetch(POSTS_JSON);
    if (!res.ok) throw new Error(`Failed to fetch posts.json: ${res.status}`);
    const posts = await res.json();

    // sort newest first
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("post");

    if (slug) {
      showPost(slug, posts);
    } else {
      renderFeed(posts);
    }
  } catch (err) {
    console.error("Blog failed to load:", err);
    document.getElementById("feed").innerHTML =
      "<p style='color:red'>❌ Failed to load the blog. Check console for details.</p>";
  }
}

function renderFeed(posts) {
  const feed = document.getElementById("feed");
  feed.innerHTML = posts
    .map(
      (p) => `
    <div class="post-card">
      <h3><a href="?post=${p.slug}">${p.title}</a></h3>
      <div class="muted">${new Date(p.date).toDateString()}</div>
      <p>${p.summary}</p>
      ${
        p.hero_image
          ? `<img src="${p.hero_image}" alt="${p.title}" style="max-width:100%;margin-top:8px;border-radius:8px">`
          : ""
      }
    </div>`
    )
    .join("");
}

async function showPost(slug, posts) {
  const post = posts.find((p) => p.slug === slug);
  if (!post) {
    document.getElementById("feed").innerHTML =
      "<p style='color:red'>❌ Post not found.</p>";
    return;
  }

  console.log("Fetching markdown for slug:", slug);
  const mdPath = `${POSTS_DIR}/${slug}.md`;
  console.log("Looking for file:", mdPath);

  try {
    const res = await fetch(mdPath);
    if (!res.ok)
      throw new Error(`Failed to fetch markdown: ${res.status} ${mdPath}`);
    const raw = await res.text();
    const content = raw.replace(/^-{3}[\s\S]*?-{3}/, ""); // strip frontmatter

    document.getElementById("feed").style.display = "none";
    const postEl = document.getElementById("post");
    postEl.style.display = "block";

    document.getElementById("post-title").textContent = post.title;
    document.getElementById("post-date").textContent = new Date(
      post.date
    ).toDateString();
    document.getElementById("post-tags").innerHTML = post.tags
      .map((t) => `<span class="tag">${t}</span>`)
      .join("");
    document.getElementById("post-hero").innerHTML = post.hero_image
      ? `<img src="${post.hero_image}" alt="${post.title}">`
      : "";
    document.getElementById("post-content").innerHTML = marked.parse(content);
  } catch (err) {
    console.error("Failed to load post content:", err);
    document.getElementById("post").innerHTML =
      "<p style='color:red'>❌ Failed to load post content. Check console for details.</p>";
  }
}

loadPosts();
