async function inject(selectorId, url) {
  const el = document.getElementById(selectorId);
  if (!el) return;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  el.innerHTML = await res.text();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await inject("siteHeader", "partials/header.html");
    await inject("siteFooter", "partials/footer.html");
  } catch (err) {
    console.error(err);
  }
});