// js/submit.js (clean version: no drag reorder, cover button instead)

let VARIETY_BY_CROP = {};

// ---------------- Crop custom dropdown ----------------
// cropType πλέον είναι hidden input (το πραγματικό value που στέλνεται στο form)
const cropHiddenInput = document.getElementById("cropType");

// UI elements για το searchable dropdown
const cropPicker = document.getElementById("cropPicker");
const cropPickerToggle = document.getElementById("cropPickerToggle");
const cropPickerLabel = document.getElementById("cropPickerLabel");
const cropPickerMenu = document.getElementById("cropPickerMenu");
const cropSearchInput = document.getElementById("cropSearch");
const cropDropdown = document.getElementById("cropDropdown");

// flattened crops data για render + search
let CROPS_DATA = [];


const varietySelect = document.getElementById("variety");
const varietyGroup = document.getElementById("varietyGroup");
const regionSelect = document.getElementById("region");

const form = document.getElementById("submitForm");
const statusEl = document.getElementById("formStatus");

const harvestEndEl = document.getElementById("harvestEnd");
const harvestStartEl = document.getElementById("harvestStart");


const imagesInput = document.getElementById("images");
const previewEl = document.getElementById("imagePreview");
const dropzone = document.getElementById("imageDropzone"); // optional (if you added it)
const livePreviewEl = document.getElementById("livePreview"); // optional

const fields = {
  cropType: document.getElementById("cropType"),
  region: document.getElementById("region"),
  quantityTons: document.getElementById("quantityTons"),
  pricePerKg: document.getElementById("pricePerKg"),
  description: document.getElementById("description"),
  sellerName: document.getElementById("sellerName"),
  sellerPhone: document.getElementById("sellerPhone"),
  sellerEmail: document.getElementById("sellerEmail"),
};

const MAX_IMAGES = 6;
let selectedFiles = []; // always in final order: index 0 = cover
let isCompressing = false;

// ----------------- Helpers -----------------

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  statusEl.style.color = isError ? "crimson" : "#555";
}

function setFieldError(fieldName, message) {
  const input = fields[fieldName];
  const errEl = document.getElementById(`err-${fieldName}`);
  if (!input || !errEl) return;
  errEl.textContent = message || "";
  if (message) input.classList.add("input-error");
  else input.classList.remove("input-error");
}

function getVal(name) {
  return (fields[name]?.value ?? "").trim();
}

function isEmpty(v) {
  return !v || v.trim() === "";
}

function formatBytes(n) {
  const num = Number(n) || 0;
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

function guessOutputType(file) {
  const t = (file.type || "").toLowerCase();
  if (t.includes("png")) return "image/png"; // keep transparency when likely
  return "image/webp"; // good compression
}

function fileNameWithExt(name, mime) {
  const base = String(name || "photo").replace(/\.[^.]+$/, "");
  const ext = mime === "image/png" ? "png" : (mime === "image/webp" ? "webp" : "jpg");
  return `${base}.${ext}`;
}

async function compressImageFile(
  file,
  { maxW = 1600, maxH = 1600, quality = 0.82, outputType = null } = {}
) {
  if (!file || !String(file.type || "").startsWith("image/")) return file;

  const outType = outputType || guessOutputType(file);

  // Use createImageBitmap when possible
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Image load failed"));
    });
    bitmap = img;
  }

  const srcW = bitmap.width;
  const srcH = bitmap.height;

  const ratio = Math.min(maxW / srcW, maxH / srcH, 1);
  const dstW = Math.round(srcW * ratio);
  const dstH = Math.round(srcH * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;

  const ctx = canvas.getContext("2d", { alpha: outType === "image/png" });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, dstW, dstH);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b),
      outType,
      outType === "image/png" ? undefined : quality
    );
  });

  if (!blob) return file;

  return new File([blob], fileNameWithExt(file.name, outType), {
    type: outType,
    lastModified: Date.now(),
  });
}

async function compressMany(files, opts) {
  const out = [];
  for (const f of files) out.push(await compressImageFile(f, opts));
  return out;
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;

  const type = btn.getAttribute("data-chip");
  const val = btn.getAttribute("data-val");

  if (type === "qty" && fields.quantityTons) {
    fields.quantityTons.value = val;
    setFieldError("quantityTons", "");
    updateLivePreview();
  }

  if (type === "price" && fields.pricePerKg) {
    fields.pricePerKg.value = val;
    setFieldError("pricePerKg", "");
    updateLivePreview();
  }
});



// ----------------- Varieties / Selects -----------------

function updateVarietiesForCrop(cropValue) {
  const list = VARIETY_BY_CROP[cropValue];

  varietySelect.innerHTML = `<option value="">— Επιλέξτε ποικιλία —</option>`;

  if (!Array.isArray(list) || list.length === 0) {
    if (varietyGroup) varietyGroup.style.display = "none";
    return;
  }

  for (const v of list) {
    const opt = document.createElement("option");
    opt.value = v.value;
    opt.textContent = v.label;
    varietySelect.appendChild(opt);
  }

  if (varietyGroup) varietyGroup.style.display = "block";
}

// Μετατρέπει τα groups του crops.json σε flat λίστα
function flattenCropGroups(json) {
  const out = [];

  for (const group of json?.groups || []) {
    for (const item of group.items || []) {
      out.push({
        groupLabel: group.groupLabel || "",
        value: item.value || "",
        label: item.label || "",
        icon: item.icon || ""
      });
    }
  }

  return out;
}

// Render όλων / filtered επιλογών μέσα στο panel
function renderCropOptions(items) {
  if (!cropDropdown) return;

  if (!items.length) {
    cropDropdown.innerHTML = `<div class="crop-select-empty">Δεν βρέθηκαν καλλιέργειες</div>`;
    return;
  }

  let html = "";
  let lastGroup = null;

  for (const item of items) {
    if (item.groupLabel !== lastGroup) {
      html += `<div class="crop-select-group">${escapeHtml(item.groupLabel)}</div>`;
      lastGroup = item.groupLabel;
    }

    html += `
      <div
        class="crop-select-option"
        data-value="${escapeHtml(item.value)}"
      >
        ${item.icon ? `${escapeHtml(item.icon)} ` : ""}${escapeHtml(item.label)}
      </div>
    `;
  }

  cropDropdown.innerHTML = html;
}

// Φιλτράρισμα με βάση search input
function filterCropOptions(term) {
  const q = String(term || "").trim().toLowerCase();

  if (!q) {
    renderCropOptions(CROPS_DATA);
    return;
  }

  const filtered = CROPS_DATA.filter((item) => {
    const label = String(item.label || "").toLowerCase();
    const value = String(item.value || "").toLowerCase();
    const group = String(item.groupLabel || "").toLowerCase();

    return label.includes(q) || value.includes(q) || group.includes(q);
  });

  renderCropOptions(filtered);
}

// Οριστική επιλογή crop
function selectCrop(item) {
  if (!item) return;

  // Γράφουμε το πραγματικό value στο hidden input
  if (cropHiddenInput) cropHiddenInput.value = item.value;

  // Δείχνουμε label + icon στο "select" κουμπί
  if (cropPickerLabel) {
    cropPickerLabel.textContent = item.icon
      ? `${item.icon} ${item.label}`
      : item.label;
  }

  // Κλείσιμο menu + καθαρισμός search
  if (cropSearchInput) cropSearchInput.value = "";
  cropPicker?.classList.remove("open");

  // Update variety / validation / live preview
  setFieldError("cropType", "");
  updateVarietiesForCrop(item.value);
  updateLivePreview();
}

async function loadCrops() {
  try {
    const res = await fetch("data/crops.json", { cache: "no-store" });
    const data = await res.json();

    if (!data || !Array.isArray(data.groups)) return;

    // Flatten για search/filter
    CROPS_DATA = flattenCropGroups(data);

    // Αρχικό render όλων των επιλογών
    renderCropOptions(CROPS_DATA);
  } catch (e) {
    if (cropDropdown) {
      cropDropdown.innerHTML = `<div class="crop-select-empty">Σφάλμα φόρτωσης</div>`;
    }
  }
}

async function loadRegions() {
  if (!regionSelect) return;
  regionSelect.innerHTML = `<option value="" disabled selected hidden>— Επιλέξτε Περιοχή —</option>`;

  try {
    const res = await fetch("data/regions.json", { cache: "no-store" });
    const data = await res.json();

    if (!data || !Array.isArray(data.groups)) {
      regionSelect.innerHTML = `<option value="">Αποτυχία φόρτωσης</option>`;
      return;
    }

    for (const g of data.groups) {
      const og = document.createElement("optgroup");
      og.label = g.groupLabel;

      for (const item of g.items || []) {
        const value = item.value?.trim();
        if (!value) continue;
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = item.label || value;
        og.appendChild(opt);
      }

      regionSelect.appendChild(og);
    }
  } catch {
    regionSelect.innerHTML = `<option value="">Σφάλμα δικτύου</option>`;
  }
}

async function loadVarieties() {
  try {
    const res = await fetch("data/varietyByCrop.json", { cache: "no-store" });
    VARIETY_BY_CROP = await res.json();
  } catch {
    VARIETY_BY_CROP = {};
  }
}

// συγκομιδή //
function monthLabel(ym) {
  const [y, m] = String(ym).split("-").map(Number);
  const names = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαι", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];
  return `${names[(m || 1) - 1]} ${y}`;
}

function buildMonthOptions(selectEl, startYear, monthsCount) {
  if (!selectEl) return;
  const now = new Date();
  const baseY = startYear ?? now.getFullYear();

  for (let i = 0; i < monthsCount; i++) {
    const d = new Date(baseY, now.getMonth() + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const opt = document.createElement("option");
    opt.value = ym;
    opt.textContent = monthLabel(ym);
    selectEl.appendChild(opt);
  }
}



// ----------------- Validation -----------------

function validateOne(name) {
  const v = getVal(name);

  if (name === "cropType") {
    if (isEmpty(v)) return "Διάλεξε καλλιέργεια.";
  }

  if (name === "region") {
    if (isEmpty(v)) return "Διάλεξε περιοχή.";
  }

  if (name === "sellerName") {
    if (isEmpty(v)) return "Γράψε το όνομά σου.";
  }

  if (name === "quantityTons") {
    if (isEmpty(v)) return "Βάλε ποσότητα σε τόνους.";
    const n = Number(v);
    if (Number.isNaN(n)) return "Η ποσότητα πρέπει να είναι αριθμός.";
    if (n <= 0) return "Η ποσότητα πρέπει να είναι > 0.";
    if (n > 100000) return "Η ποσότητα φαίνεται υπερβολικά μεγάλη. Έλεγξέ την.";
  }

  // price REQUIRED
  if (name === "pricePerKg") {
    if (isEmpty(v)) return "Βάλε τιμή (€ / kg).";
    const n = Number(v);
    if (Number.isNaN(n)) return "Η τιμή πρέπει να είναι αριθμός.";
    if (n <= 0) return "Η τιμή πρέπει να είναι > 0.";
    if (n > 1000) return "Η τιμή φαίνεται υπερβολικά μεγάλη. Έλεγξέ την.";
  }

    if (name === "description") {
      if (!isEmpty(v) && v.length > 1200) {
        return "Η περιγραφή είναι πολύ μεγάλη. Κράτησέ την πιο σύντομη.";
    }
  }

  if (name === "sellerEmail") {
    if (!isEmpty(v)) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (!ok) return "Το email δεν φαίνεται σωστό.";
    }
  }

  // phone required (as per your current rule)
  if (name === "sellerPhone") {
    if (isEmpty(v)) return "Γράψε το τηλέφωνο σου.";
    const ok = /^[0-9+\-() ]{6,}$/.test(v);
    if (!ok) return "Το τηλέφωνο δεν φαίνεται σωστό.";
  }

  return "";
}

function validateAll() {
  const order = ["cropType", "region", "quantityTons", "pricePerKg", "sellerName", "sellerPhone", "sellerEmail"];
  let firstBad = null;

  for (const name of order) {
    const msg = validateOne(name);
    setFieldError(name, msg);
    if (msg && !firstBad) firstBad = name;
  }

  return { ok: !firstBad, firstBad };
}

function attachLiveValidation() {
  Object.keys(fields).forEach((name) => {
    const input = fields[name];
    if (!input) return;

    input.addEventListener("blur", () => {
      const msg = validateOne(name);
      setFieldError(name, msg);
    });

    input.addEventListener("input", () => {
      const msg = validateOne(name);
      if (!msg) setFieldError(name, "");
      updateLivePreview();
    });

    input.addEventListener("change", () => updateLivePreview());
  });
}

// ----------------- Images (Browse + Drop + Compress + Preview + Cover Button) -----------------

function setDropzoneActive(active) {
  if (!dropzone) return;
  dropzone.style.borderColor = active ? "#2e7d32" : "#cfd8dc";
  dropzone.style.background = active ? "#f1fff4" : "#fafafa";
}

async function addPickedFiles(fileList) {
  const picked = Array.from(fileList || []).filter(file =>
    file && file.type.startsWith("image/")
  );

  if (!picked.length) return;

  const spaceLeft = MAX_IMAGES - selectedFiles.length;

  if (spaceLeft <= 0) {
    setStatus(`Μέχρι ${MAX_IMAGES} φωτογραφίες επιτρέπονται.`, true);
    return;
  }

  const toAdd = picked.slice(0, spaceLeft);

  selectedFiles = [...selectedFiles, ...toAdd];

  renderPreview();
}


function setCover(index) {
  if (index === 0) return;

  const file = selectedFiles.splice(index, 1)[0];
  selectedFiles.unshift(file);

  renderPreview();
}

function removeImage(index) {
  selectedFiles.splice(index, 1);
  renderPreview();
}

function renderPreview() {
  if (!previewEl) return;
  previewEl.innerHTML = "";

  selectedFiles.forEach((file, index) => {
    const wrap = document.createElement("div");
    wrap.style.position = "relative";
    wrap.style.width = "90px";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = file.name || `photo ${index + 1}`;
    img.style.width = "90px";
    img.style.height = "90px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "10px";
    img.style.border = index === 0 ? "2px solid #2e7d32" : "1px solid #ddd";
    img.style.display = "block";

    // remove button
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("data-remove", "1");
    removeBtn.style.position = "absolute";
    removeBtn.style.top = "4px";
    removeBtn.style.right = "4px";
    removeBtn.style.width = "22px";
    removeBtn.style.height = "22px";
    removeBtn.style.borderRadius = "999px";
    removeBtn.style.border = "0";
    removeBtn.style.cursor = "pointer";
    removeBtn.style.background = "rgba(0,0,0,0.65)";
    removeBtn.style.color = "white";
    removeBtn.style.fontWeight = "700";
    removeBtn.addEventListener("click", () => removeImage(index));

    // cover badge / cover button
    if (index === 0) {
      const badge = document.createElement("div");
      badge.textContent = "⭐ Cover";
      badge.style.position = "absolute";
      badge.style.left = "6px";
      badge.style.bottom = "6px";
      badge.style.background = "#2e7d32";
      badge.style.color = "white";
      badge.style.fontSize = "11px";
      badge.style.padding = "2px 6px";
      badge.style.borderRadius = "8px";
      wrap.appendChild(badge);
    } else {
      const coverBtn = document.createElement("button");
      coverBtn.type = "button";
      coverBtn.textContent = "⭐";
      coverBtn.title = "Κάνε cover";
      coverBtn.style.position = "absolute";
      coverBtn.style.left = "4px";
      coverBtn.style.bottom = "4px";
      coverBtn.style.width = "26px";
      coverBtn.style.height = "22px";
      coverBtn.style.borderRadius = "8px";
      coverBtn.style.border = "0";
      coverBtn.style.cursor = "pointer";
      coverBtn.style.background = "rgba(255,255,255,0.9)";
      coverBtn.setAttribute("data-cover", "1");
      coverBtn.addEventListener("click", () => setCover(index));
      wrap.appendChild(coverBtn);
    }

    wrap.appendChild(img);
    wrap.appendChild(removeBtn);
    previewEl.appendChild(wrap);
  });

  updateLivePreview();
}



// Browse


imagesInput?.addEventListener("change", async () => {
  const picked = Array.from(imagesInput.files || []); // copy
  await addPickedFiles(picked);
  imagesInput.value = "";
});

const browseBtn = document.getElementById("browseImagesBtn");
browseBtn?.addEventListener("click", () => {
  if (!imagesInput) return;
  imagesInput.value = ""; // IMPORTANT: reset BEFORE picker (same file works)
  if (typeof imagesInput.showPicker === "function") imagesInput.showPicker();
  else imagesInput.click();
});

// Dropzone handlers (optional if you have #imageDropzone)
if (dropzone) {
  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDropzoneActive(true);
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDropzoneActive(false);
    });
  });

  dropzone.addEventListener("drop", async (e) => {
    const files = e.dataTransfer?.files;
    await addPickedFiles(files);
  });

  // click anywhere in dropzone opens file picker (except remove buttons)
  if (imagesInput) {
    dropzone.addEventListener("click", (e) => {
      // Μην ανοίγεις picker αν πάτησε σε κουμπί (remove/cover κλπ) ή πάνω στο preview
      if (e.target.closest("button")) return;
      if (e.target.closest("[data-remove]")) return;
      if (e.target.closest("[data-cover]")) return;
      if (e.target.closest("#imagePreview")) return;

      imagesInput.click();
    });
  }
}

// ----------------- Live Preview (optional) -----------------

function getSelectedText(el) {
  if (!el) return "";

  // Για το crop hidden input, πάρε το label από το custom dropdown
  if (el === cropHiddenInput) {
    const txt = cropPickerLabel?.textContent?.trim() || "";
    return txt === "— Επίλεξε καλλιέργεια —" ? "" : txt;
  }

  // Για κανονικά selects
  const opt = el.options?.[el.selectedIndex];
  return (opt?.textContent || "").trim();
}

function previewImageSrc() {
  if (selectedFiles.length) return URL.createObjectURL(selectedFiles[0]);
  return "images/listings/placeholder.webp";
}

function updateLivePreview() {
  if (!livePreviewEl) return;

  const cropLabel = getSelectedText(fields.cropType) || "— Καλλιέργεια —";
  const regionLabel = getSelectedText(fields.region) || "— Περιοχή —";
  const varietyLabel = varietySelect?.value ? getSelectedText(varietySelect) : "";

  const qtyVal = (fields.quantityTons?.value || "").trim();
  const qtyText = qtyVal ? `${qtyVal} τόνοι` : "—";

  const priceVal = (fields.pricePerKg?.value || "").trim();
  const priceText = priceVal ? `€${Number(priceVal).toFixed(2)} / kg` : "—";

  const seller = (fields.sellerName?.value || "").trim() || "—";
  const description = (fields.description?.value || "").trim();
  const shortDescription = description
    ? description.slice(0, 140) + (description.length > 140 ? "…" : "")
    : "";
  const title = `${cropLabel} • ${regionLabel}`;
  const imgSrc = previewImageSrc();
  

  livePreviewEl.innerHTML = `
    <article class="listing-card">
      <div class="listing-link" style="cursor:default;">
        <div class="listing-image">
          <img src="${escapeHtml(imgSrc)}" alt="preview" loading="lazy">
        </div>
        <div class="listing-body">
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
            <span class="badge">🌿 ${escapeHtml(cropLabel)}</span>
            <span class="badge badge-muted">📍 ${escapeHtml(regionLabel)}</span>
            ${varietyLabel ? `<span class="badge badge-muted">🏷️ ${escapeHtml(varietyLabel)}</span>` : ""}
          </div>
          <h3 class="listing-title">${escapeHtml(title)}</h3>
          <div class="listing-meta">
            ${shortDescription ? `
            <div class="listing-description-preview" style="margin-top:10px; color:#555; font-size:14px; line-height:1.5;">
              <strong>Description:</strong> ${escapeHtml(shortDescription)}
            </div>
          ` : ""}
            <div><strong>Quantity:</strong> ${escapeHtml(qtyText)}</div>
            <div><strong>Price:</strong> ${escapeHtml(priceText)}</div>
          </div>
          <div class="listing-seller">
            <div><strong>Seller:</strong> ${escapeHtml(seller)}</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

// ----------------- Submit -----------------

attachLiveValidation();

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");

  if (isCompressing) {
    setStatus("Περίμενε να ολοκληρωθεί η συμπίεση εικόνων…", true);
    return;
  }

  const v = validateAll();
  if (!v.ok) {
    setStatus("Διόρθωσε τα πεδία με κόκκινο χρώμα.", true);
    fields[v.firstBad]?.scrollIntoView({ behavior: "smooth", block: "center" });
    fields[v.firstBad]?.focus();
    return;
  }

  setStatus("Αποστολή αγγελίας…");

  const fd = new FormData(form);

// compress at publish time
fd.delete("images[]");

if (selectedFiles.length) {
  isCompressing = true;

  const beforeBytes = selectedFiles.reduce((s, f) => s + (f.size || 0), 0);
  setStatus(`Συμπίεση φωτογραφιών… (${formatBytes(beforeBytes)})`);

  try {
    const compressed = await compressMany(selectedFiles, {
      maxW: 1600,
      maxH: 1600,
      quality: 0.82
      // outputType: "image/jpeg" // αν θες max compatibility
    });

    const afterBytes = compressed.reduce((s, f) => s + (f.size || 0), 0);
    setStatus(`Αποστολή αγγελίας… (φωτο: ${formatBytes(beforeBytes)} → ${formatBytes(afterBytes)})`);

    compressed.forEach((file) => fd.append("images[]", file));
  } finally {
    isCompressing = false;
  }
} else {
  setStatus("Αποστολή αγγελίας…");
}
  try {
    const res = await fetch("api/create-listing.php", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data || !data.ok) {
      setStatus(data?.error || "Σφάλμα αποστολής.", true);
      return;
    }

    setStatus("✅ Η αγγελία δημιουργήθηκε! Μεταφορά…");
    window.location.href = `listing.html?id=${encodeURIComponent(data.id)}`;
  } catch (err) {
    console.error(err);
    setStatus("Σφάλμα δικτύου. Δοκίμασε ξανά.", true);
  }
});

// ----------------- Init -----------------

document.addEventListener("DOMContentLoaded", async () => {
  await loadCrops();
  await loadVarieties();
  await loadRegions();

    // ---------------- Crop searchable dropdown ----------------

  // Άνοιγμα / κλείσιμο panel
  cropPickerToggle?.addEventListener("click", () => {
    cropPicker?.classList.toggle("open");

    // Όταν ανοίγει, δείχνουμε όλες τις επιλογές και εστιάζουμε στο search
    if (cropPicker?.classList.contains("open")) {
      renderCropOptions(CROPS_DATA);
      setTimeout(() => cropSearchInput?.focus(), 0);
    }
  });

  // Search μέσα στο panel
  cropSearchInput?.addEventListener("input", () => {
    filterCropOptions(cropSearchInput.value);
  });

  // Επιλογή crop
  cropDropdown?.addEventListener("click", (e) => {
    const option = e.target.closest(".crop-select-option");
    if (!option) return;

    const value = option.getAttribute("data-value") || "";
    const item = CROPS_DATA.find((x) => x.value === value);
    selectCrop(item);
  });

  // Κλικ έξω από το panel -> κλείσιμο
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#cropPicker")) {
      cropPicker?.classList.remove("open");
    }
  });


  buildMonthOptions(harvestStartEl, null, 24);
  buildMonthOptions(harvestEndEl, null, 24);

  // hide variety initially
  if (varietyGroup) varietyGroup.style.display = "none";


  varietySelect?.addEventListener("change", () => updateLivePreview());

  updateLivePreview();
});
