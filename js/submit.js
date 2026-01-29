const form = document.getElementById("submitForm");
const statusEl = document.getElementById("formStatus");
const imagesInput = document.getElementById("images");
const previewEl = document.getElementById("imagePreview");

const fields = {
  cropType: document.getElementById("cropType"),
  region: document.getElementById("region"),
  quantityTons: document.getElementById("quantityTons"),
  pricePerKg: document.getElementById("pricePerKg"),
  sellerName: document.getElementById("sellerName"),
  sellerPhone: document.getElementById("sellerPhone"),
  sellerEmail: document.getElementById("sellerEmail"),
};

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg;
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

function validateOne(name) {
  const v = getVal(name);

  // required
  if (name === "cropType") {
    if (isEmpty(v)) return "Γράψε την καλλιέργεια (π.χ. Πατάτες).";
  }

  if (name === "region") {
    if (isEmpty(v)) return "Γράψε την περιοχή (π.χ. Κεντρική Μακεδονία).";
  }

  if (name === "sellerName") {
    if (isEmpty(v)) return "Γράψε το όνομά σου.";
  }

  if (name === "quantityTons") {
    if (isEmpty(v)) return "Βάλε ποσότητα σε τόνους.";
    const n = Number(v);
    if (Number.isNaN(n)) return "Η ποσότητα πρέπει να είναι αριθμός.";
    if (n <= 0) return "Η ποσότητα πρέπει να είναι μεγαλύτερη από 0.";
    if (n > 100000) return "Η ποσότητα φαίνεται υπερβολικά μεγάλη. Έλεγξέ την.";
  }

  // optional numeric
  if (name === "pricePerKg") {
    if (!isEmpty(v)) {
      const n = Number(v);
      if (Number.isNaN(n)) return "Η τιμή πρέπει να είναι αριθμός.";
      if (n < 0) return "Η τιμή δεν μπορεί να είναι αρνητική.";
      if (n > 1000) return "Η τιμή φαίνεται υπερβολικά μεγάλη. Έλεγξέ την.";
    }
  }

  // optional email
  if (name === "sellerEmail") {
    if (!isEmpty(v)) {
      // simple email check
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (!ok) return "Το email δεν φαίνεται σωστό.";
    }
  }

  // optional phone
  if (name === "sellerPhone") {
    if(isEmpty(v)) return "Γράψε το τηλέφωνο σου";
    if (!isEmpty(v)) {
      // allow digits, spaces, +, -, ()
      const ok = /^[0-9+\-() ]{6,}$/.test(v);
      if (!ok) return "Το τηλέφωνο δεν φαίνεται σωστό.";
    }
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
      // only clear errors while typing (don’t spam)
      const msg = validateOne(name);
      if (!msg) setFieldError(name, "");
    });
  });
}

function renderPreview(files) {
  if (!previewEl) return;
  previewEl.innerHTML = "";
  const list = Array.from(files || []).slice(0, 6);

  for (const f of list) {
    const url = URL.createObjectURL(f);
    const img = document.createElement("img");
    img.src = url;
    img.alt = f.name;
    img.style.width = "90px";
    img.style.height = "90px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "10px";
    img.style.border = "1px solid #ddd";
    previewEl.appendChild(img);
  }
}

imagesInput?.addEventListener("change", () => {
  renderPreview(imagesInput.files);
});

attachLiveValidation();

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");

  const v = validateAll();
  if (!v.ok) {
    setStatus("Διόρθωσε τα πεδία με κόκκινο χρώμα.", true);
    fields[v.firstBad]?.scrollIntoView({ behavior: "smooth", block: "center" });
    fields[v.firstBad]?.focus();
    return;
  }

  setStatus("Αποστολή αγγελίας…");

  const fd = new FormData(form);

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
    setStatus("Σφάλμα δικτύου. Δοκίμασε ξανά.", true);
  }
});