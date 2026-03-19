// js/search.js
// - On index.html: loads dynamic filters + redirects to listings.html with query params
// - On listings.html: boots the listings engine (read filters from URL)

import { initListingsPage } from "./main.js";

function isListingsPage() {
  const page = window.location.pathname.split("/").pop();
  return page === "listings.html";
}

function buildValueToLabelMapFromGroups(json) {
  const map = new Map();
  const groups = json?.groups || [];
  for (const g of groups) {
    const items = g?.items || [];
    for (const it of items) {
      if (it?.value && it?.label) map.set(it.value, it.label);
    }
  }
  return map;
}

async function loadJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

function populateSelectFromGroups(selectEl, json, allLabel) {
  if (!selectEl) return;

  selectEl.innerHTML = `<option value="">${allLabel}</option>`;

  const groups = json?.groups || [];
  for (const group of groups) {
    const og = document.createElement("optgroup");
    og.label = group.groupLabel || "";

    for (const item of group.items || []) {
      if (!item?.value) continue;
      const opt = document.createElement("option");
      opt.value = item.value;
      opt.textContent = item.label || item.value;
      og.appendChild(opt);
    }

    selectEl.appendChild(og);
  }
}

async function initHomeFilters() {
  const cropSelect = document.getElementById("cropType");
  const regionSelect = document.getElementById("region");

  if (!cropSelect || !regionSelect) return;

  try {
    const [cropsJson, regionsJson] = await Promise.all([
      loadJson("data/crops.json"),
      loadJson("data/regions.json"),
    ]);

    populateSelectFromGroups(cropSelect, cropsJson, "All crops");
    populateSelectFromGroups(regionSelect, regionsJson, "All regions");
  } catch (err) {
    console.error("Failed to load home filters:", err);

    cropSelect.innerHTML = `<option value="">All crops</option>`;
    regionSelect.innerHTML = `<option value="">All regions</option>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (isListingsPage()) {
    initListingsPage({ readFromUrl: true });
    return;
  }

  // index.html
  await initHomeFilters();

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