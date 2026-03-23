// js/listing.js
// Single listing page logic: listing.html?id=...


// ---- Label maps (crop, region, variety) ----

let CROPS_LABELS = null;
let REGIONS_LABELS = null;
let VARIETIES_BY_CROP = null;


function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? "";
}

function showError(message) {
  const err = document.getElementById("listingError");
  if (!err) return;
  err.style.display = "block";
  err.textContent = message;
}

function hideError() {
  const err = document.getElementById("listingError");
  if (!err) return;
  err.style.display = "none";
  err.textContent = "";
}

function formatPrice(l) {
  if (l.pricePerKg === null || l.pricePerKg === undefined) {
    return l.priceNote ? l.priceNote : "Ζητήστε τιμή";
  }
  const n = Number(l.pricePerKg);
  if (Number.isNaN(n)) return "Ζητήστε τιμή";
  return `€${n.toFixed(2)} / kg`;
}
 //helpers 

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

async function loadLabelMaps() {
  if (CROPS_LABELS && REGIONS_LABELS && VARIETIES_BY_CROP) return;

  const [cropsJson, regionsJson, varietiesJson] = await Promise.all([
    fetch("data/crops.json").then(r => r.json()),
    fetch("data/regions.json").then(r => r.json()),
    fetch("data/varietyByCrop.json").then(r => r.json()).catch(() => ({}))
  ]);

  CROPS_LABELS = buildValueToLabelMapFromGroups(cropsJson);
  REGIONS_LABELS = buildValueToLabelMapFromGroups(regionsJson);
  VARIETIES_BY_CROP = varietiesJson || {};
}

function resolveCropLabel(v) {
  return CROPS_LABELS?.get(v) || v || "";
}

function resolveRegionLabel(v) {
  return REGIONS_LABELS?.get(v) || v || "";
}

function resolveVarietyLabel(cropValue, varietyValue) {
  if (!varietyValue) return "";
  const arr = VARIETIES_BY_CROP?.[cropValue];
  const found = Array.isArray(arr)
    ? arr.find(x => x.value === varietyValue)
    : null;
  return found?.label || varietyValue;
}


function openModal(modal) {
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function setReportStatus(msg, isError = false) {
  const el = document.getElementById("reportStatus");
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = isError ? "crimson" : "#555";
}

function getIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const id = params.get("id");
    return id ? String(id).trim() : "";
  } catch (e) {
    return "";
  }
}

function formatDateGR(dateStr) {
  if (!dateStr) return "—";

  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;

  const [year, month, day] = parts;

  return `${day}-${month}-${year}`;
}

function formatHarvestMonth(ym) {
  if (!ym || !String(ym).includes("-")) return "";
  const [y, m] = String(ym).split("-");
  if (!y || !m) return "";
  return `${m.padStart(2, "0")}-${y}`;
}

function buildHarvestText(start, end) {
  const s = formatHarvestMonth(start);
  const e = formatHarvestMonth(end);

  if (s && e) {
    if (s === e) {
      return {
        title: "Συγκομιδή",
        value: s,
        note: "Η συγκομιδή πραγματοποιείται στο διάστημα του μήνα αυτού."
      };
    }

    return {
      title: "Περίοδος συγκομιδής",
      value: `${s} έως ${e}`,
      note: "Η διαθεσιμότητα μπορεί να διαφέρει μέσα στην περίοδο αυτή."
    };
  }
  return null;
}


function initReportModal() {
  const modal = document.getElementById("reportModal");
  const openBtn = document.getElementById("reportOpenBtn");
  const closeBtn = document.getElementById("reportCloseBtn");
  const form = document.getElementById("reportForm");

  const listingIdEl = document.getElementById("reportListingId");
  const nameEl = document.getElementById("reporterName");
  const contactEl = document.getElementById("reporterContact");
  const descEl = document.getElementById("reportDescription");

 


  if (!modal || !openBtn || !closeBtn || !form) return;

  // put current listing id into hidden input
  const id = getIdFromUrl();
  if (!id) {
    showNotFound("Λείπει το id στο URL.");
    return;
  }
  if (listingIdEl) listingIdEl.value = id || "";

  openBtn.addEventListener("click", () => {
    setReportStatus("");
    openModal(modal);
    setTimeout(() => descEl?.focus(), 50);
  });

  closeBtn.addEventListener("click", () => closeModal(modal));

  // click outside closes
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal);
  });

  // ESC closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal(modal);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setReportStatus("Αποστολή…");

    const payload = {
      listingId: (listingIdEl?.value || "").trim(),
      name: (nameEl?.value || "").trim(),
      contact: (contactEl?.value || "").trim(),
      description: (descEl?.value || "").trim(),
    };

    if (!payload.listingId || !payload.description) {
      setReportStatus("Γράψε μια σύντομη περιγραφή.", true);
      return;
    }

    try {
      const res = await fetch("api/report.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || !data.ok) {
        setReportStatus(data?.error || "Σφάλμα αποστολής.", true);
        return;
      }

      setReportStatus("✅ Η αναφορά καταχωρήθηκε. Ευχαριστούμε!");
      form.reset();
      // κρατάμε ξανά το listing id
      if (listingIdEl) listingIdEl.value = id || "";
      setTimeout(() => closeModal(modal), 800);
    } catch (err) {
      setReportStatus("Σφάλμα δικτύου. Δοκίμασε ξανά.", true);
    }
  });
}


function ensureThumbsContainer() {
  // Adds a simple thumbnails row under the main image if not already present
  let el = document.getElementById("listingThumbs");
  if (el) return el;

  const gallery = document.querySelector(".listing-gallery");
  if (!gallery) return null;

  el = document.createElement("div");
  el.id = "listingThumbs";
  el.style.display = "flex";
  el.style.gap = "10px";
  el.style.flexWrap = "wrap";
  el.style.marginTop = "10px";

  gallery.appendChild(el);
  return el;
}

function renderGallery(images) {
  const img = document.getElementById("listingImage");
  if (!img) return;

  const safe = Array.isArray(images) ? images.filter(Boolean) : [];
  const cover = safe[0] || "images/listings/placeholder.webp";
  img.src = cover;
  img.alt = "Listing image";

  const thumbs = ensureThumbsContainer();
  if (!thumbs) return;
  thumbs.innerHTML = "";

  if (safe.length <= 1) return;

  safe.forEach((src, idx) => {
    const t = document.createElement("img");
    t.src = src;
    t.alt = `photo ${idx + 1}`;
    t.style.width = "70px";
    t.style.height = "70px";
    t.style.objectFit = "cover";
    t.style.borderRadius = "10px";
    t.style.cursor = "pointer";
    t.style.border = idx === 0 ? "2px solid #333" : "1px solid #ddd";

    t.addEventListener("click", () => {
      img.src = src;
      [...thumbs.querySelectorAll("img")].forEach((imgEl) => (imgEl.style.border = "1px solid #ddd"));
      t.style.border = "2px solid #333";
    });

    thumbs.appendChild(t);
  });
}

async function loadListing() {
  await loadLabelMaps();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const returnTo = params.get("return") || "listings.html";
  const backLink = document.getElementById("backToResults");
  const crumbListings = document.getElementById("crumbListings");

  if (crumbListings) crumbListings.href = returnTo;
  if (backLink) backLink.href = returnTo;

  if (!id) {
    showError("Missing listing id.");
    return;
  }

  hideError();

  let payload;
  try {
    const res = await fetch(`api/listing.php?id=${encodeURIComponent(id)}`);
    payload = await res.json();
    if (!res.ok || !payload || payload.ok !== true) {
      showError("Listing not found.");
      return;
    }
  } catch (e) {
    console.error(e);
    showError("Could not load listing from server.");
    return;
  }

  const l = payload.listing;



  // Breadcrumb current label + title
  const crumbCurrent = document.getElementById("crumbCurrent");
  const cropLabel = resolveCropLabel(l.cropType);
  const regionLabel = resolveRegionLabel(l.region);
  const varietyLabel = resolveVarietyLabel(l.cropType, l.variety);
  const varietyRow = document.getElementById("listingVarietyRow");

if (varietyLabel) {
  setText("listingVariety", varietyLabel);
  if (varietyRow) varietyRow.style.display = "block";
}

  const titleText = `${cropLabel}`;
  if (crumbCurrent) crumbCurrent.textContent = titleText;
  document.title = titleText;

  // Fill UI
  setText("listingTitle", titleText);
  setText("listingRegion", regionLabel);



  setText("listingQty", l.quantityTons !== undefined ? `${l.quantityTons} tons` : "—");
  setText("listingPrice", formatPrice(l));
  setText("listingDate", formatDateGR(l.createdAt) ?? "—");
  setText("sellerName", l.seller?.name ?? "—");

  setText("listingDescriptionFull", l.description || "Δεν υπάρχει περιγραφή.");
  setText("listingDetailCrop", cropLabel || "—");
  setText("listingDetailRegion", regionLabel || "—");
  setText("listingDetailDate", formatDateGR(l.createdAt));

    // Harvest box
  const harvestBox = document.getElementById("harvestBox");
  const harvestLabelEl = harvestBox?.querySelector(".harvest-box-label");
  const harvestValueEl = document.getElementById("listingHarvestPretty");
  const harvestNoteEl = document.getElementById("listingHarvestNote");

  const harvestInfo = buildHarvestText(l.harvestStart, l.harvestEnd);

  if (harvestInfo && harvestBox && harvestLabelEl && harvestValueEl && harvestNoteEl) {
    harvestLabelEl.textContent = harvestInfo.title;
    harvestValueEl.textContent = harvestInfo.value;
    harvestNoteEl.textContent = harvestInfo.note;
    harvestBox.hidden = false;
  } else if (harvestBox) {
    harvestBox.hidden = true;
  }

  const detailVarietyRow = document.getElementById("listingDetailVarietyRow");
  if (varietyLabel) {
    setText("listingDetailVariety", varietyLabel);
    if (detailVarietyRow) detailVarietyRow.style.display = "list-item";
  }

  // Images
  const images = Array.isArray(l.images) && l.images.length ? l.images : (l.image ? [l.image] : []);
  renderGallery(images);

  // Description
  const desc =
    l.description ||
    "Contact the seller for full details about this bulk listing (specs, delivery, timing).";
  const descEl = document.getElementById("listingDescription");
  if (descEl) descEl.innerHTML = escapeHtml(desc);

  // Contact links
  const call = document.getElementById("sellerCall");
  if (call) {
    if (l.seller?.phone) call.href = `tel:${l.seller.phone}`;
    else call.style.display = "none";
  }

  const email = document.getElementById("sellerEmail");
  if (email) {
    if (l.seller?.email) {
      email.href = `mailto:${l.seller.email}?subject=${encodeURIComponent(`Bulk inquiry: ${cropLabel}`)}`;
    } else {
      email.style.display = "none";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadListing();      // αν το έχεις έτσι ήδη
  initReportModal();  // 👈 πρόσθεσε αυτό
});