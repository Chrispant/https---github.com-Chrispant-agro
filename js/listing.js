// js/listing.js
// Single listing page logic: listing.html?id=...

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

async function loadListing() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const returnTo = params.get("return") || "listings.html";
  const backLink = document.getElementById("backToResults");

  // Breadcrumbs: make "Listings" crumb return to the filtered results if available
  const crumbListings = document.getElementById("crumbListings");
  if (crumbListings) crumbListings.href = returnTo;

  if (backLink) backLink.href = returnTo;



  if (!id) {
    showError("Missing listing id.");
    return;
  }

  let data;
  try {
    const res = await fetch("data/listings.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    console.error(e);
    showError("Could not load listings data.");
    return;
  }

  const l = data.find((x) => x.id === id);
  if (!l) {
    showError("Listing not found.");
    return;
  }

  // Breadcrumb current label
const crumbCurrent = document.getElementById("crumbCurrent");
if (crumbCurrent) {
  crumbCurrent.textContent = `${l.cropType} • ${l.region}`;
}


  document.title = `${l.cropType} • ${l.region}`;

  setText("listingTitle", `${l.cropType} • ${l.region}`);
  setText("listingRegion", l.region);
  setText("listingHarvest", `${l.harvestStart ?? "?"} → ${l.harvestEnd ?? "?"}`);
  setText("listingQty", l.quantityTons !== undefined ? `${l.quantityTons} tons` : "—");
  setText("listingPrice", formatPrice(l));
  setText("listingDate", l.createdAt ?? "—");
  setText("sellerName", l.seller?.name ?? "—");

  const img = document.getElementById("listingImage");
  if (img) {
    img.src = l.image || "images/listings/placeholder.jpg";
    img.alt = l.cropType || "Listing";
  }

  // Description: optional field in JSON (recommended to add later)
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
      email.href = `mailto:${l.seller.email}?subject=${encodeURIComponent(
        `Bulk inquiry: ${l.cropType}`
      )}`;
    } else {
      email.style.display = "none";
    }
  }
}

loadListing();