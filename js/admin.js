// js/admin.js — Local Admin UI (export JSON)
// Works locally: fetch existing data, edit in browser, download updated JSON.

let listings = [];
let filtered = [];
let editingId = null;
let selectedImageDataUrl = null;
let selectedImageFilename = null;

const els = {
  msg: document.getElementById("adminMsg"),
  form: document.getElementById("listingForm"),
  download: document.getElementById("downloadJson"),
  copyCurrent: document.getElementById("copyCurrent"),
  importJson: document.getElementById("importJson"),
  table: document.getElementById("adminTable"),
  count: document.getElementById("adminCount"),
  search: document.getElementById("searchAdmin"),
  newBtn: document.getElementById("newBtn"),
  resetForm: document.getElementById("resetForm"),
  deleteBtn: document.getElementById("deleteBtn"),
  preview: document.getElementById("previewSlot"),

  // fields
  id: document.getElementById("id"),
  createdAt: document.getElementById("createdAt"),
  cropType: document.getElementById("cropType"),
  region: document.getElementById("region"),
  quantityTons: document.getElementById("quantityTons"),
  pricePerKg: document.getElementById("pricePerKg"),
  priceNote: document.getElementById("priceNote"),
  image: document.getElementById("image"),
  harvestStart: document.getElementById("harvestStart"),
  harvestEnd: document.getElementById("harvestEnd"),
  sellerName: document.getElementById("sellerName"),
  sellerPhone: document.getElementById("sellerPhone"),
  sellerEmail: document.getElementById("sellerEmail"),
  description: document.getElementById("description"),
  imageFile: document.getElementById("imageFile"),
  embedImage: document.getElementById("embedImage"),
};

// Helper

function fileNameOnly(path) {
return String(path || "").split("\\").pop().split("/").pop();
}

function showMsg(text, type = "ok") {
  if (!els.msg) return;
  els.msg.style.display = "block";
  els.msg.className = `admin-msg ${type}`;
  els.msg.textContent = text;
  window.setTimeout(() => {
    if (els.msg) els.msg.style.display = "none";
  }, 2600);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generateId(item) {
  const base = `${slugify(item.cropType)}-${slugify(item.region)}`.slice(0, 48);
  const rand = Math.random().toString(16).slice(2, 6);
  return `${base}-${rand}` || `listing-${rand}`;
}

function parseNumberOrNull(value) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getFormItem() {
  const item = {
    id: (els.id.value || "").trim(),
    cropType: (els.cropType.value || "").trim(),
    region: (els.region.value || "").trim(),
    quantityTons: parseNumberOrNull(els.quantityTons.value),
    harvestStart: (els.harvestStart.value || "").trim() || null,
    harvestEnd: (els.harvestEnd.value || "").trim() || null,
    pricePerKg: parseNumberOrNull(els.pricePerKg.value),
    priceNote: (els.priceNote.value || "").trim() || null,
    image: els.embedImage.checked
  ? (selectedImageDataUrl || "images/listings/placeholder.jpg")
  : ((els.image.value || "").trim() || "images/listings/placeholder.jpg"),
    seller: {
      name: (els.sellerName.value || "").trim(),
      phone: (els.sellerPhone.value || "").trim() || null,
      email: (els.sellerEmail.value || "").trim() || null,
    },
    createdAt: (els.createdAt.value || "").trim() || todayISO(),
    description: (els.description.value || "").trim() || null,
  };

  // Normalize nulls
  if (!item.harvestStart) delete item.harvestStart;
  if (!item.harvestEnd) delete item.harvestEnd;
  if (item.pricePerKg === null) item.pricePerKg = null; // keep for your filtering logic
  if (!item.priceNote) item.priceNote = null;
  if (!item.description) delete item.description;
  if (!item.seller.phone) delete item.seller.phone;
  if (!item.seller.email) delete item.seller.email;

  return item;
}

function validateItem(item) {
  if (!item.cropType) return "Crop Type is required.";
  if (!item.region) return "Region is required.";
  if (item.quantityTons === null) return "Quantity (tons) is required.";
  if (!item.seller?.name) return "Seller Name is required.";
  return null;
}

function setFormItem(item) {
  els.id.value = item?.id ?? "";
  els.createdAt.value = item?.createdAt ?? "";
  els.cropType.value = item?.cropType ?? "";
  els.region.value = item?.region ?? "";
  els.quantityTons.value = item?.quantityTons ?? "";
  els.pricePerKg.value = item?.pricePerKg ?? "";
  els.priceNote.value = item?.priceNote ?? "";
  els.image.value = item?.image ?? "";
  els.harvestStart.value = item?.harvestStart ?? "";
  els.harvestEnd.value = item?.harvestEnd ?? "";
  els.sellerName.value = item?.seller?.name ?? "";
  els.sellerPhone.value = item?.seller?.phone ?? "";
  els.sellerEmail.value = item?.seller?.email ?? "";
  els.description.value = item?.description ?? "";
}

function clearForm() {
  editingId = null;
  els.form.reset();
  els.id.value = "";
  els.createdAt.value = todayISO();
  els.deleteBtn.classList.add("hidden");
  renderPreview(getFormItem());
  selectedImageDataUrl = null;
  selectedImageFilename = null;
  if (els.embedImage) els.embedImage.checked = false;
  if (els.imageFile) els.imageFile.value = "";
}

function formatPrice(item) {
  if (item.pricePerKg === null || item.pricePerKg === undefined) {
    return item.priceNote ? item.priceNote : "Price not specified";
  }
  return `€${Number(item.pricePerKg).toFixed(2)} / kg`;
}

function renderPreview(item) {
  if (!els.preview) return;
  const title = `${item.cropType || "Crop"} • ${item.region || "Region"}`;
  const harvest = `${item.harvestStart ?? "?"} → ${item.harvestEnd ?? "?"}`;
  const qty = item.quantityTons !== null && item.quantityTons !== undefined ? `${item.quantityTons} tons` : "—";

  els.preview.innerHTML = `
    <article class="listing-card">
      <a class="listing-link" href="#" onclick="return false;">
        <div class="listing-image">
          <img src="${escapeHtml(item.image || "images/listings/placeholder.jpg")}" alt="${escapeHtml(item.cropType || "Listing")}" />
        </div>
        <div class="listing-body">
          <h3 class="listing-title">${escapeHtml(title)}</h3>
          <div class="listing-meta">
            <div><strong>Quantity:</strong> ${escapeHtml(qty)}</div>
            <div><strong>Harvest:</strong> ${escapeHtml(harvest)}</div>
            <div><strong>Price:</strong> ${escapeHtml(formatPrice(item))}</div>
          </div>
          <div class="listing-seller">
            <div><strong>Seller:</strong> ${escapeHtml(item.seller?.name || "—")}</div>
          </div>
        </div>
      </a>
    </article>
  `;
}

function renderTable(items) {
  if (!els.table) return;

  els.count.textContent = String(items.length);

  if (!items.length) {
    els.table.innerHTML = `<div class="empty-state"><div class="empty-title">No listings</div><p class="empty-text">Create your first listing on the left.</p></div>`;
    return;
  }

  els.table.innerHTML = items
    .map((l) => {
      const title = `${l.cropType} • ${l.region}`;
      return `
        <div class="admin-row">
          <div class="admin-row-main">
            <div class="admin-row-title">${escapeHtml(title)}</div>
            <div class="admin-row-sub">
              <span class="pill">${escapeHtml(l.id)}</span>
              <span class="pill">${escapeHtml(l.seller?.name || "—")}</span>
              <span class="pill">${escapeHtml(l.createdAt || "—")}</span>
            </div>
          </div>
          <div class="admin-row-actions">
            <button class="empty-btn" type="button" data-edit="${escapeHtml(l.id)}">Edit</button>
            <button class="empty-btn" type="button" data-copy="${escapeHtml(l.id)}">Copy</button>
          </div>
        </div>
      `;
    })
    .join("");

  // wire row actions
  els.table.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const item = listings.find((x) => x.id === id);
      if (!item) return;
      editingId = id;
      setFormItem(item);
      selectedImageDataUrl = (item.image && String(item.image).startsWith("data:image/")) ? item.image : null;
      selectedImageFilename = null;
      if (els.embedImage) els.embedImage.checked = !!selectedImageDataUrl;
      if (!selectedImageDataUrl && els.image) els.image.value = item.image || "";
      els.deleteBtn.classList.remove("hidden");
      renderPreview(getFormItem());
      showMsg("Loaded for editing.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  els.table.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-copy");
      const item = listings.find((x) => x.id === id);
      if (!item) return;
      await navigator.clipboard.writeText(JSON.stringify(item, null, 2));
      showMsg("Copied listing JSON.");
    });
  });
}

function applySearch() {
  const q = (els.search.value || "").trim().toLowerCase();
  if (!q) {
    filtered = [...listings];
  } else {
    filtered = listings.filter((l) => {
      const hay = [
        l.id,
        l.cropType,
        l.region,
        l.seller?.name,
        l.seller?.email,
        l.seller?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }
  renderTable(filtered);
}

async function loadInitialData() {
  try {
    const res = await fetch("data/listings.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    listings = await res.json();
    filtered = [...listings];
    renderTable(filtered);
    clearForm();
    showMsg("Loaded data/listings.json");
  } catch (e) {
    console.error(e);
    listings = [];
    filtered = [];
    renderTable(filtered);
    clearForm();
    showMsg("Could not load data/listings.json (is your server running?)", "warn");
  }
}

function downloadListingsJson() {
  const json = JSON.stringify(listings, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "listings.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  showMsg("Downloaded listings.json");
}

async function copyCurrentJson() {
  const item = getFormItem();
  const err = validateItem({ ...item, id: item.id || "temp" });
  if (err) {
    showMsg(err, "warn");
    return;
  }
  await navigator.clipboard.writeText(JSON.stringify(item, null, 2));
  showMsg("Copied current listing JSON.");
}

function upsertListing(item) {
  if (!item.id) item.id = generateId(item);

  // Ensure uniqueness on new insert
  if (!editingId) {
    const exists = listings.some((x) => x.id === item.id);
    if (exists) item.id = generateId(item);
  }

  if (editingId) {
    const idx = listings.findIndex((x) => x.id === editingId);
    if (idx !== -1) listings[idx] = item;
    editingId = item.id; // in case id changed (you can prevent that if you want)
  } else {
    listings.unshift(item); // add newest at top
    editingId = item.id;
  }
}

function deleteListingById(id) {
  listings = listings.filter((x) => x.id !== id);
  filtered = filtered.filter((x) => x.id !== id);
}

function syncUIAfterChange() {
  applySearch(); // renders table
  renderPreview(getFormItem());
}

// ---------- Events ----------
els.form.addEventListener("submit", (e) => {
  e.preventDefault();

  const item = getFormItem();
  const err = validateItem(item);
  if (err) {
    showMsg(err, "warn");
    return;
  }

  // If editing, keep id unless user changed it intentionally
  if (editingId && !item.id) item.id = editingId;

  upsertListing(item);
  setFormItem(item);
  els.deleteBtn.classList.remove("hidden");
  showMsg("Saved listing.");
  syncUIAfterChange();
});

els.resetForm.addEventListener("click", () => {
  clearForm();
  showMsg("Cleared form.");
});

els.deleteBtn.addEventListener("click", () => {
  if (!editingId) return;
  const ok = confirm("Delete this listing?");
  if (!ok) return;
  deleteListingById(editingId);
  clearForm();
  showMsg("Deleted listing.");
  syncUIAfterChange();
});

els.download.addEventListener("click", downloadListingsJson);

els.copyCurrent.addEventListener("click", copyCurrentJson);

els.search.addEventListener("input", applySearch);

els.newBtn.addEventListener("click", () => {
  clearForm();
  showMsg("New listing.");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Update preview as you type (safe, local only)
[
  els.cropType, els.region, els.quantityTons, els.harvestStart, els.harvestEnd,
  els.pricePerKg, els.priceNote, els.image, els.sellerName, els.sellerPhone,
  els.sellerEmail, els.createdAt, els.description, els.id
].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", () => renderPreview(getFormItem()));
});

els.importJson.addEventListener("change", async () => {
  const file = els.importJson.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      showMsg("Import failed: JSON must be an array of listings.", "warn");
      return;
    }

    listings = parsed;
    filtered = [...listings];
    applySearch();
    clearForm();
    showMsg("Imported JSON successfully.");
  } catch (e) {
    console.error(e);
    showMsg("Import failed: invalid JSON.", "warn");
  } finally {
    els.importJson.value = "";
  }
});

els.imageFile.addEventListener("change", async () => {
const file = els.imageFile.files?.[0];
if (!file) return;


selectedImageFilename = file.name;


// If embed is OFF, set image path to images/listings/<filename>
if (!els.embedImage.checked) {
els.image.value = `images/listings/${file.name}`;
selectedImageDataUrl = null;
renderPreview(getFormItem());
showMsg(`Selected: ${file.name}. Remember to copy it into images/listings/`);
return;
}


// If embed is ON, read file as data URL and store it
const reader = new FileReader();
reader.onload = () => {
selectedImageDataUrl = String(reader.result);
els.image.value = ""; // not needed when embedding
renderPreview(getFormItem());
showMsg(`Embedded image: ${file.name}`);
};
reader.onerror = () => {
showMsg("Could not read image file.", "warn");
};
reader.readAsDataURL(file);
});

els.embedImage.addEventListener("change", () => {
  // If turning ON embed and we already picked a file, re-embed it
  // If turning OFF embed, revert to path images/listings/<filename>
  if (els.embedImage.checked) {
    // user wants embedded; they can re-choose image if none selected
    if (!selectedImageDataUrl && selectedImageFilename) {
      showMsg("Re-choose the image to embed it.", "warn");
    }
  } else {
    // user wants path-based
    if (selectedImageFilename) {
      els.image.value = `images/listings/${selectedImageFilename}`;
      selectedImageDataUrl = null;
      renderPreview(getFormItem());
      showMsg("Embed disabled. Path set — remember to copy the file.");
    }
  }
});

// Boot
loadInitialData();