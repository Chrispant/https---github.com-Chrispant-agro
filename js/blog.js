export async function loadPosts() {
  const list = document.getElementById("posts");
  if (!list) return;

  const response = await fetch("data/posts.json");
  const posts = await response.json();

list.innerHTML = posts
  .map(
    post => `
      <li>
        <h3><a href="post.html?slug=${post.slug}">${post.title}</a></h3>
        <p>${post.excerpt}</p>
      </li>
    `
  )
  .join("");
}
