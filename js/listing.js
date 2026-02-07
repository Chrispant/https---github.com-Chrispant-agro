// js/listing.js
// Single listing page logic: listing.html?id=...

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
    return l.priceNote ? l.priceNote : "Price not specified";
  }
  const n = Number(l.pricePerKg);
  if (Number.isNaN(n)) return "Price not specified";
  return `€${n.toFixed(2)} / kg`;
}
 //helpers 
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
  const titleText = `${l.cropType} • ${l.region}`;
  if (crumbCurrent) crumbCurrent.textContent = titleText;
  document.title = titleText;

  // Fill UI
  setText("listingTitle", titleText);
  setText("listingRegion", l.region);
  setText("listingHarvest", `${l.harvestStart ?? "?"} → ${l.harvestEnd ?? "?"}`);
  setText("listingQty", l.quantityTons !== undefined ? `${l.quantityTons} tons` : "—");
  setText("listingPrice", formatPrice(l));
  setText("listingDate", l.createdAt ?? "—");
  setText("sellerName", l.seller?.name ?? "—");

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
      email.href = `mailto:${l.seller.email}?subject=${encodeURIComponent(`Bulk inquiry: ${l.cropType}`)}`;
    } else {
      email.style.display = "none";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadListing();      // αν το έχεις έτσι ήδη
  initReportModal();  // 👈 πρόσθεσε αυτό
});