import { initCTA } from "./ui.js";
import { loadPosts } from "./blog.js";

export async function loadPartials() {
  const headerRes = await fetch("partials/header.html");
  const footerRes = await fetch("partials/footer.html");

  document.getElementById("header").innerHTML = await headerRes.text();
  document.getElementById("footer").innerHTML = await footerRes.text();

  setActiveNav(); // 👈 IMPORTANT
}

async function loadLatestPosts() {
  const res = await fetch("data/posts.json");
  const posts = await res.json();

  const latest = posts.slice(0, 3);

  const container = document.getElementById("latest-posts");
  if (!container) return;

  container.innerHTML = latest.map(post => `
    <article class="post-card">
      <h4>${post.title}</h4>
      <p>${post.excerpt}</p>
      <a href="post.html?slug=${post.slug}">Read more</a>
    </article>
  `).join("");
}

function setActiveNav() {
  const links = document.querySelectorAll(".nav a");
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  links.forEach(link => {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) {
      link.classList.add("active");
    }
  });
}

loadPartials();
initCTA();
loadPosts();
loadLatestPosts();
