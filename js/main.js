import { initCTA } from "./ui.js";
import { loadPosts } from "./blog.js";

export async function loadPartial(id, file) {
  const container = document.getElementById(id);
  if (!container) return;

  const response = await fetch(file);
  const html = await response.text();

  container.innerHTML = html;
}

loadPartial("header", "/partials/header.html");
loadPartial("footer", "/partials/footer.html");
initCTA();
loadPosts();