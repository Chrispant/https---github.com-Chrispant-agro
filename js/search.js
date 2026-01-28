// js/search.js
// - On index.html: submits form -> redirects to listings.html with query params
// - On listings.html: boots the listings engine (read filters from URL)

import { initListingsPage } from "./main.js";

function isListingsPage() {
  const page = window.location.pathname.split("/").pop();
  return page === "listings.html";
}

document.addEventListener("DOMContentLoaded", () => {
  if (isListingsPage()) {
    initListingsPage({ readFromUrl: true });
    return;
  }

  // index.html (search-only)
  const form = document.getElementById("searchForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const ids = [
      "cropType",
      "region",
      "minQuantity",
      "maxQuantity",
      "harvestMonth",
      "minPrice",
      "maxPrice",
    ];

    const params = new URLSearchParams();

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && el.value) params.set(id, el.value);
    }

    const qs = params.toString();
    window.location.href = qs ? `listings.html?${qs}` : "listings.html";
  });
});