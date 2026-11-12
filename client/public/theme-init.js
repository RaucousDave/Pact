// Apply the saved/system theme before the app paints to avoid a light flash.
(() => {
  let saved;
  try {
    saved = localStorage.getItem("pact.theme");
  } catch {
    /* Private browsing can disable storage. */
  }
  const theme =
    saved === "dark" || saved === "light"
      ? saved
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#181c19" : "#f8f7f2");
})();
