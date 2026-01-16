import { loadPartial } from "./main.js"; // we’ll export it
async function fetchPost(slug) {
  const res = await fetch("/data/posts.json");
  const posts = await res.json();
  return posts.find(p => p.slug === slug);
}

// Load header/footer
loadPartial("header", "/partials/header.html");
loadPartial("footer", "/partials/footer.html");

// Read the slug from the URL
const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");

(async function () {
  const post = await fetchPost(slug);
  if (!post) {
    document.getElementById("post-container").innerHTML = "<p>Post not found</p>";
    return;
  }

  document.getElementById("post-title").textContent = post.title;
  document.getElementById("post-content").textContent = post.content;
})();