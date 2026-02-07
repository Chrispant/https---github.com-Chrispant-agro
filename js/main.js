// js/main.js
// Listings engine for listings.html (filters + sorting + rendering)

let listings = [];

let currentPage = 1;
const pageSize = 9; // 9 = nice 3x3 grid; change anytime
let lastFiltered = []; // keeps current filtered results for paging


const els = {
  form: null,
  cropType: null,
  region: null,
  minQuantity: null,
  maxQuantity: null,
  harvestMonth: null,
  minPrice: null,
  maxPrice: null,
  container: null,
  resultsCount: null,
  sortBy: null,
  prevPage: null,
  nextPage: null,
  pageInfo: null,
  pageNumbers: null,
  activeFilters: null,

};

// ---------- Helpers ----------
function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Compare YYYY-MM strings
function monthCompare(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function isMonthWithinRange(month, start, end) {
  if (!month) return true; // no filter applied
  if (!start || !end) return true; // incomplete listing dates -> don't exclude
  return monthCompare(month, start) >= 0 && monthCompare(month, end) <= 0;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(l) {
  if (l.pricePerKg === null || l.pricePerKg === undefined) {
    return l.priceNote ? l.priceNote : "Price not specified";
  }
  return `€${Number(l.pricePerKg).toFixed(2)} / kg`;
}

function updateResultsCount(n) {
  if (!els.resultsCount) return;
  els.resultsCount.textContent = `Showing ${n} listing${n === 1 ? "" : "s"}`;
}

function updateActiveFiltersIndicator() {
  if (!els.activeFilters) return;

  const labels = [];

  if (els.cropType?.value) labels.push("Crop");
  if (els.region?.value) labels.push("Region");

  const minQ = (els.minQuantity?.value || "").trim();
  const maxQ = (els.maxQuantity?.value || "").trim();
  if (minQ || maxQ) labels.push("Quantity");

  if ((els.harvestMonth?.value || "").trim()) labels.push("Harvest");

  const minP = (els.minPrice?.value || "").trim();
  const maxP = (els.maxPrice?.value || "").trim();
  if (minP || maxP) labels.push("Price");

  const sortVal = els.sortBy?.value || "newest";
  if (sortVal !== "newest") labels.push("Sort");

  els.activeFilters.textContent =
    labels.length ? `Active filters: ${labels.join(", ")}` : "No active filters";
}

function hasActiveFilters() {
  if (els.cropType?.value) return true;
  if (els.region?.value) return true;

  if ((els.minQuantity?.value || "").trim()) return true;
  if ((els.maxQuantity?.value || "").trim()) return true;

  if ((els.harvestMonth?.value || "").trim()) return true;

  if ((els.minPrice?.value || "").trim()) return true;
  if ((els.maxPrice?.value || "").trim()) return true;

  if (els.sortBy && els.sortBy.value !== "newest") return true;

  return false;
}

function updateResetButtonVisibility() {
  const resetBtn = document.getElementById("resetFilters");
  if (!resetBtn) return;

  if (hasActiveFilters()) {
    resetBtn.classList.remove("hidden");
  } else {
    resetBtn.classList.add("hidden");
  }
}

// ---------- Populate filters from data ----------
function populateSelect(selectEl, values, allLabel) {
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="">${allLabel}</option>`;
  values.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
}

function populateFiltersFromListings(items) {
  const cropTypes = Array.from(new Set(items.map((l) => l.cropType).filter(Boolean))).sort();
  const regions = Array.from(new Set(items.map((l) => l.region).filter(Boolean))).sort();

  populateSelect(els.cropType, cropTypes, "All crops");
  populateSelect(els.region, regions, "All regions");
}

// ---------- Sorting ----------
function sortListings(items) {
  const mode = els.sortBy?.value || "newest";
  const arr = [...items];

  const createdTime = (l) => Date.parse(l.createdAt || "") || 0;
  const qty = (l) => Number(l.quantityTons) || 0;
  const price = (l) =>
    l.pricePerKg === null || l.pricePerKg === undefined ? null : Number(l.pricePerKg);

  arr.sort((a, b) => {
    if (mode === "newest") return createdTime(b) - createdTime(a);

    if (mode === "qtyDesc") return qty(b) - qty(a);
    if (mode === "qtyAsc") return qty(a) - qty(b);

    if (mode === "priceAsc") {
      const pa = price(a), pb = price(b);
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;   // push "no price" to bottom
      if (pb === null) return -1;
      return pa - pb;
    }

    if (mode === "priceDesc") {
      const pa = price(a), pb = price(b);
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return pb - pa;
    }

    return 0;
  });

  return arr;
}

// ---------- Rendering ----------
function renderListings(items) {
  if (!els.container) return;
  
  const returnUrl = `${window.location.pathname}${window.location.search}`;

 if (!items.length) {
  updateResultsCount(0);

  els.container.innerHTML = `
    <div class="empty-state">
      <div class="empty-title">No listings match your filters</div>
      <p class="empty-text">
        Try broadening your search. Small changes can bring results back.
      </p>

      <ul class="empty-hints">
        <li>Remove or widen <strong>Price</strong> and <strong>Quantity</strong> ranges.</li>
        <li>Try a different <strong>Region</strong>, or clear it to search all of Greece.</li>
        <li>Clear <strong>Harvest period</strong> if it’s too specific.</li>
      </ul>

      <div class="empty-actions">
        <button type="button" class="empty-btn primary" id="emptyReset">Reset filters</button>
        <button type="button" class="empty-btn" id="emptyClearPrice">Clear price</button>
        <button type="button" class="empty-btn" id="emptyClearQty">Clear quantity</button>
        <button type="button" class="empty-btn" id="emptyShowAll">Show all</button>
      </div>
    </div>
  `;

  // Wire empty-state buttons (safe: only exists in empty state)
  const resetBtn = document.getElementById("emptyReset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      // reuse your existing reset button if present
      const globalReset = document.getElementById("resetFilters");
      if (globalReset && !globalReset.classList.contains("hidden")) {
        globalReset.click();
      } else if (globalReset) {
        // even if hidden, click still works
        globalReset.click();
      } else {
        // fallback: manual reset
        els.form.reset();
        if (els.sortBy) els.sortBy.value = "newest";
        currentPage = 1;
        window.history.replaceState({}, "", window.location.pathname);
        applyFilters();
        if (typeof updateActiveFiltersIndicator === "function") updateActiveFiltersIndicator();
        if (typeof updateResetButtonVisibility === "function") updateResetButtonVisibility();
      }
    });
  }

  const clearPriceBtn = document.getElementById("emptyClearPrice");
  if (clearPriceBtn) {
    clearPriceBtn.addEventListener("click", () => {
      if (els.minPrice) els.minPrice.value = "";
      if (els.maxPrice) els.maxPrice.value = "";
      currentPage = 1;
      writeFiltersToURL();
      applyFilters();
      if (typeof updateActiveFiltersIndicator === "function") updateActiveFiltersIndicator();
      if (typeof updateResetButtonVisibility === "function") updateResetButtonVisibility();
    });
  }

  const clearQtyBtn = document.getElementById("emptyClearQty");
  if (clearQtyBtn) {
    clearQtyBtn.addEventListener("click", () => {
      if (els.minQuantity) els.minQuantity.value = "";
      if (els.maxQuantity) els.maxQuantity.value = "";
      currentPage = 1;
      writeFiltersToURL();
      applyFilters();
      if (typeof updateActiveFiltersIndicator === "function") updateActiveFiltersIndicator();
      if (typeof updateResetButtonVisibility === "function") updateResetButtonVisibility();
    });
  }

  const showAllBtn = document.getElementById("emptyShowAll");
  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      els.form.reset();
      if (els.sortBy) els.sortBy.value = "newest";
      currentPage = 1;
      window.history.replaceState({}, "", window.location.pathname);
      applyFilters();
      if (typeof updateActiveFiltersIndicator === "function") updateActiveFiltersIndicator();
      if (typeof updateResetButtonVisibility === "function") updateResetButtonVisibility();
    });
  }

  return;
}


  updateResultsCount(items.length);

  els.container.innerHTML = items
    .map((l) => {
      const title = `${l.cropType} • ${l.region}`;
      const harvest = `${l.harvestStart ?? "?"} → ${l.harvestEnd ?? "?"}`;
      const qty = l.quantityTons !== undefined ? `${l.quantityTons} τόνοι` : "—";
      const price = formatPrice(l);

      return `
        <article class="listing-card">
          <a class="listing-link" href="listing.html?id=${encodeURIComponent(l.id)}&return=${encodeURIComponent(returnUrl)}">
            <div class="listing-image">
              <img
                src="${escapeHtml(l.image || "images/listings/placeholder.webp")}"
                alt="${escapeHtml(l.cropType || "Listing")}"
                loading="lazy"
              >
            </div>

            <div class="listing-body">
              <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
                <span class="badge">🌿 ${escapeHtml(l.cropType || "Καλλιέργεια")}</span>
                <span class="badge badge-muted">📍 ${escapeHtml(l.region || "Περιοχή")}</span>
              </div>
              <h3 class="listing-title">${escapeHtml(title)}</h3>

              <div class="listing-meta">
                <div><strong>Quantity:</strong> ${escapeHtml(qty)}</div>
                <div><strong>Harvest:</strong> ${escapeHtml(harvest)}</div>
                <div><strong>Price:</strong> ${escapeHtml(price)}</div>
              </div>

              <div class="listing-seller">
                <div><strong>Seller:</strong> ${escapeHtml(l.seller?.name || "—")}</div>
              </div>
            </div>
          </a>
        </article>
      `;
    })
    .join("");
}

function renderCurrentPage() {
  const total = lastFiltered.length;

  // Clamp currentPage to valid range
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * pageSize;
  const pageItems = lastFiltered.slice(start, start + pageSize);

  renderListings(pageItems);
  updatePaginationUI(totalPages);
}

// ---------- Pagination ---------

function updatePaginationUI(totalPages) {
  if (els.prevPage) els.prevPage.disabled = currentPage <= 1;
  if (els.nextPage) els.nextPage.disabled = currentPage >= totalPages;

  renderPageNumbers(totalPages);
}

function renderPageNumbers(totalPages) {
  if (!els.pageNumbers) return;

  els.pageNumbers.innerHTML = "";

  const addBtn = (page) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "page-num" + (page === currentPage ? " active" : "");
    btn.textContent = String(page);

    if (page !== currentPage) {
      btn.addEventListener("click", () => {
        currentPage = page;
        writeFiltersToURL();
        renderCurrentPage();
      });
    }

    els.pageNumbers.appendChild(btn);
  };

  const addEllipsis = () => {
    const span = document.createElement("span");
    span.className = "page-ellipsis";
    span.textContent = "…";
    els.pageNumbers.appendChild(span);
  };

  // always show first & last, show +/-2 around current
  const windowSize = 2;

  if (totalPages <= 7) {
    for (let p = 1; p <= totalPages; p++) addBtn(p);
    return;
  }

  addBtn(1);

  const start = Math.max(2, currentPage - windowSize);
  const end = Math.min(totalPages - 1, currentPage + windowSize);

  if (start > 2) addEllipsis();

  for (let p = start; p <= end; p++) addBtn(p);

  if (end < totalPages - 1) addEllipsis();

  addBtn(totalPages);
}



// ---------- Filtering ----------
function applyFilters() {
  const selectedCrop = els.cropType?.value || "";
  const selectedRegion = els.region?.value || "";

  const minQty = toNumber(els.minQuantity?.value);
  const maxQty = toNumber(els.maxQuantity?.value);

  const month = els.harvestMonth?.value || ""; // YYYY-MM

  const minPrice = toNumber(els.minPrice?.value);
  const maxPrice = toNumber(els.maxPrice?.value);
  const hasPriceFilter = minPrice !== null || maxPrice !== null;

  const filtered = listings.filter((l) => {
    // Crop / region
    if (selectedCrop && l.cropType !== selectedCrop) return false;
    if (selectedRegion && l.region !== selectedRegion) return false;

    // Quantity (τόνοι)
    if (minQty !== null && Number(l.quantityTons) < minQty) return false;
    if (maxQty !== null && Number(l.quantityTons) > maxQty) return false;

    // Harvest month within listing range
    if (!isMonthWithinRange(month, l.harvestStart, l.harvestEnd)) return false;

    // Price range (if filtering by price, exclude non-numeric price listings)
    const priceVal =
      l.pricePerKg === null || l.pricePerKg === undefined ? null : Number(l.pricePerKg);

    if (hasPriceFilter) {
      if (priceVal === null) return false;
      if (minPrice !== null && priceVal < minPrice) return false;
      if (maxPrice !== null && priceVal > maxPrice) return false;
    }

    return true;
  });

  lastFiltered = sortListings(filtered);
  renderCurrentPage();

}

// ---------- URL -> Filter fields ----------
function readFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  const pageParam = Number(params.get("page"));
  currentPage = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;
 


  if (els.cropType) els.cropType.value = params.get("cropType") || "";
  if (els.region) els.region.value = params.get("region") || "";
  if (els.minQuantity) els.minQuantity.value = params.get("minQuantity") || "";
  if (els.maxQuantity) els.maxQuantity.value = params.get("maxQuantity") || "";
  if (els.harvestMonth) els.harvestMonth.value = params.get("harvestMonth") || "";
  if (els.minPrice) els.minPrice.value = params.get("minPrice") || "";
  if (els.maxPrice) els.maxPrice.value = params.get("maxPrice") || "";
  if (els.sortBy) els.sortBy.value = params.get("sortBy") || "newest";
}

function writeFiltersToURL() {
  const params = new URLSearchParams();
   //keep page in url
  params.set("page", String(currentPage));

  const setIfValue = (key, el) => {
    if (!el) return;
    const val = (el.value || "").trim();
    if (val) params.set(key, val);
  };

  setIfValue("cropType", els.cropType);
  setIfValue("region", els.region);
  setIfValue("minQuantity", els.minQuantity);
  setIfValue("maxQuantity", els.maxQuantity);
  setIfValue("harvestMonth", els.harvestMonth);
  setIfValue("minPrice", els.minPrice);
  setIfValue("maxPrice", els.maxPrice);
  setIfValue("sortBy", els.sortBy);

  const newUrl =
    params.toString().length > 0
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

  // Replace current URL without reloading the page
  window.history.replaceState({}, "", newUrl);
}

// ---------- Data loading ----------
async function loadListings() {
  const res = await fetch("api/listings.php");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  listings = await res.json();
}

// ---------- Public entry ----------
export async function initListingsPage({ readFromUrl = false } = {}) {
  // Bind DOM elements (listings.html)
  els.form = document.getElementById("searchForm");
  els.cropType = document.getElementById("cropType");
  els.region = document.getElementById("region");
  els.minQuantity = document.getElementById("minQuantity");
  els.maxQuantity = document.getElementById("maxQuantity");
  els.harvestMonth = document.getElementById("harvestMonth");
  els.minPrice = document.getElementById("minPrice");
  els.maxPrice = document.getElementById("maxPrice");
  els.container = document.getElementById("listingsContainer");
  els.resultsCount = document.getElementById("resultsCount");
  els.sortBy = document.getElementById("sortBy");
  els.prevPage = document.getElementById("prevPage");
  els.nextPage = document.getElementById("nextPage");
  //els.pageInfo = document.getElementById("pageInfo");
  els.pageNumbers = document.getElementById("pageNumbers");
  els.activeFilters = document.getElementById("activeFilters");

  const resetBtn = document.getElementById("resetFilters");

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    // 1) Reset form fields
    els.form.reset();

    // 2) Reset sorting explicitly (important)
    if (els.sortBy) els.sortBy.value = "newest";

    // 3) Reset paging (if you have pagination)
    currentPage = 1;

    // 4) Clear URL params completely (filters + sort + page)
    window.history.replaceState({}, "", window.location.pathname);

    // 5) Re-render
    applyFilters();

    updateResetButtonVisibility();

    // 6) Update active filters indicator (if you added it)
    if (typeof updateActiveFiltersIndicator === "function") {
      updateActiveFiltersIndicator();
    }
  });
}



  if (!els.form || !els.container) return;

  try {
    await loadListings();
    populateFiltersFromListings(listings);

    if (readFromUrl) readFiltersFromURL();

    // initial render
    applyFilters();
    updateResetButtonVisibility();
    updateActiveFiltersIndicator();
    

    /* Events sorting without search button press
    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      applyFilters();
    });

    // Live filtering (change any input)
    els.form.addEventListener("input", () => {
      applyFilters();
    });

    if (els.sortBy) {
      els.sortBy.addEventListener("change", () => {
        applyFilters();
      });
    }
    */

    // Apply filters ONLY when button is pressed
    els.form.addEventListener("submit", (e) => {
      e.preventDefault();

      currentPage = 1; 

      // 1) Update the URL to match current filter values
      writeFiltersToURL();

      // 2) Apply filters and render
      applyFilters();

      updateActiveFiltersIndicator();

      updateResetButtonVisibility();
    });

    // Sorting can remain live
    if (els.sortBy) {
      els.sortBy.addEventListener("change", () => {
        currentPage = 1; 
        writeFiltersToURL();
        applyFilters();
        updateActiveFiltersIndicator();
        updateResetButtonVisibility();
      });
    }

    if (els.prevPage) {
      els.prevPage.addEventListener("click", () => {
        currentPage -= 1;
        writeFiltersToURL();
        renderCurrentPage();
      });
    }

    if (els.nextPage) {
      els.nextPage.addEventListener("click", () => {
        currentPage += 1;
        writeFiltersToURL();
        renderCurrentPage();
      });
    }

  } catch (err) {
    console.error("Failed to init listings page:", err);
    els.container.innerHTML =
      "<p>Could not load listings. Make sure your server is running.</p>";
  }

 
}