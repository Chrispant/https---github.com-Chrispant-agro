export function initCTA() {
  const button = document.getElementById("cta");

  if (!button) return;

  button.addEventListener("click", () => {
    alert("JavaScript modules are working!");
  });
}