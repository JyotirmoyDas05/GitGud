/* Git Gud site interactions: sticky-nav state, GitHub star count,
 * and download-page wiring to the GitGud releases API.
 * Release logic mirrors the T3 Code marketing site (MIT): resolve every
 * asset link against the latest release, fall back to the releases page. */
(function () {
  "use strict";

  var REPO = "JyotirmoyDas05/GitGud";
  var RELEASES_URL = "https://github.com/" + REPO + "/releases";
  var LATEST_API_URL = "https://api.github.com/repos/" + REPO + "/releases/latest";
  var REPO_API_URL = "https://api.github.com/repos/" + REPO;

  /* Sticky nav border past a few pixels of scroll. */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* Star count in the nav pill. Real data; hides the count if unreachable. */
  var starsLabel = document.getElementById("stars-label");
  function formatStars(n) {
    if (n >= 1000) {
      var k = n / 1000;
      return (k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")) + "k+";
    }
    return String(n);
  }
  if (starsLabel) {
    fetch(REPO_API_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && typeof data.stargazers_count === "number") {
          starsLabel.innerHTML =
            "<strong>" + formatStars(data.stargazers_count) + "</strong>&nbsp;GitHub stars";
        }
      })
      .catch(function () { /* pill keeps its static "Star on GitHub" label */ });
  }

  /* Download page: version label + per-asset links + this-device highlight. */
  var page = document.getElementById("download-page");
  if (!page) return;

  var versionLabel = document.getElementById("version-label");
  var changelogLink = document.getElementById("changelog-link");
  var cards = page.querySelectorAll("a[data-asset]");

  function markThisDevice() {
    var ua = navigator.userAgent || "";
    var platform = navigator.platform || "";
    var guess = null;
    if (/Win/i.test(ua) || /Win/i.test(platform)) guess = "windows";
    else if (/Mac/i.test(ua) || /Mac/i.test(platform)) guess = "macos";
    else if (/Linux/i.test(ua) || /Linux/i.test(platform)) guess = "linux";
    if (!guess) return;
    var section = page.querySelector('[data-platform="' + guess + '"]');
    if (section) {
      section.classList.add("is-you");
      section.scrollIntoView({ block: "nearest" });
    }
    /* Point same-page CTAs at the visitor's platform section. */
    document.querySelectorAll('[data-dl]').forEach(function (el) {
      var map = { windows: "windows", macos: "macos", linux: "linux" };
      if (map[el.getAttribute("data-dl")] === guess) el.classList.add("btn-primary");
    });
  }

  function load() {
    var cacheKey = "gitgud-latest-release";
    var cached = null;
    try { cached = sessionStorage.getItem(cacheKey); } catch (e) { /* private mode */ }
    if (cached) { apply(JSON.parse(cached)); return; }

    cards.forEach(function (card) { card.href = RELEASES_URL; });
    fetch(LATEST_API_URL)
      .then(function (r) { return r.json(); })
      .then(function (release) {
        if (!release || !release.tag_name) throw new Error("no release");
        try { sessionStorage.setItem(cacheKey, JSON.stringify(release)); } catch (e) { /* private mode */ }
        apply(release);
      })
      .catch(function () {
        if (versionLabel) versionLabel.textContent = "Releases";
      });
  }

  function apply(release) {
    if (versionLabel) versionLabel.textContent = release.tag_name;
    if (changelogLink && release.html_url) changelogLink.href = release.html_url;
    cards.forEach(function (card) {
      /* data-asset may list several suffixes, newest naming first; the
       * first one present in the release wins (e.g. x86_64 now, amd64
       * on older releases). */
      var suffixes = (card.getAttribute("data-asset") || "").split(",");
      var match = null;
      for (var i = 0; i < suffixes.length && !match; i++) {
        var suffix = suffixes[i];
        match = (release.assets || []).find(function (a) {
          return a.name && a.name.endsWith(suffix);
        });
      }
      card.href = (match && match.browser_download_url) || RELEASES_URL;
    });
  }

  markThisDevice();
  load();
})();
