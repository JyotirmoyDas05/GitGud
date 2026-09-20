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

  /* Hero floating marks: drift only while visible, parallax against the
   * pointer on fine pointers. Ported from the T3 Code homepage motion
   * (MIT): marks-only gating, rAF-throttled, reduced-motion aware. */
  (function homeMotion() {
    var hero = document.querySelector(".hero");
    var field = document.querySelector(".hero-float");
    if (!hero || !field || typeof IntersectionObserver === "undefined") return;
    var marks = Array.prototype.slice.call(field.querySelectorAll(".hero-float-mark"));
    if (!marks.length) return;
    var visible = false;
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var finePointer = window.matchMedia("(pointer: fine)");
    var pointerFrame = undefined;
    var pointer = null;

    function canMove() {
      return visible && document.visibilityState === "visible" && !reducedMotion.matches;
    }
    function update() {
      for (var i = 0; i < marks.length; i++) {
        marks[i].style.setProperty("--home-motion-state", canMove() ? "running" : "paused");
      }
      var parallax = finePointer.matches && canMove();
      field.style.setProperty("--parallax-duration", parallax ? "0.7s" : "0s");
      if (!parallax) {
        if (pointerFrame !== undefined) cancelAnimationFrame(pointerFrame);
        pointerFrame = undefined;
        pointer = null;
        field.style.setProperty("--px", "0px");
        field.style.setProperty("--py", "0px");
      }
    }
    new IntersectionObserver(function (entries) {
      visible = entries.some(function (e) { return e.isIntersecting; });
      update();
    }).observe(hero);
    hero.addEventListener("pointermove", function (event) {
      if (!finePointer.matches || !canMove()) return;
      pointer = { x: event.clientX, y: event.clientY };
      if (pointerFrame === undefined) {
        pointerFrame = requestAnimationFrame(function () {
          pointerFrame = undefined;
          if (!pointer || !finePointer.matches || !canMove()) return;
          var bounds = hero.getBoundingClientRect();
          if (!bounds.width || !bounds.height) return;
          field.style.setProperty("--px", (((pointer.x - bounds.left) / bounds.width - 0.5) * 36).toFixed(1) + "px");
          field.style.setProperty("--py", (((pointer.y - bounds.top) / bounds.height - 0.5) * 28).toFixed(1) + "px");
        });
      }
    });
    hero.addEventListener("pointerleave", update);
    document.addEventListener("visibilitychange", update);
    update();
  })();

  /* Homepage CTAs follow the visitor's OS: icon, label, and a direct link
   * to the right asset (same pattern as the T3 Code homepage). */
  (function platformCtas() {
    var ua = navigator.userAgent || "";
    var os = /Win/i.test(ua) ? "win" : /Mac/i.test(ua) ? "mac" : /Linux/i.test(ua) ? "linux" : null;
    if (!os) return;
    document.documentElement.dataset.platform = os;
    var labels = {
      win: "Download for Windows",
      mac: "Download for macOS",
      linux: "Download for Linux"
    };
    var suffixes = {
      win: ["_x64-setup.exe"],
      mac: ["_universal.dmg"],
      linux: ["_x86_64.AppImage", "_amd64.AppImage"]
    };
    var pairs = [
      ["download-btn", "download-label"],
      ["cta-download-btn", "cta-download-label"]
    ];
    pairs.forEach(function (pair) {
      var label = document.getElementById(pair[1]);
      if (label) label.textContent = labels[os];
    });
    fetch(LATEST_API_URL)
      .then(function (r) { return r.json(); })
      .then(function (release) {
        var url = null;
        var list = suffixes[os];
        for (var i = 0; i < list.length && !url; i++) {
          var match = (release.assets || []).find(function (a) {
            return a.name && a.name.endsWith(list[i]);
          });
          if (match) url = match.browser_download_url;
        }
        if (!url) return;
        pairs.forEach(function (pair) {
          var btn = document.getElementById(pair[0]);
          if (btn) btn.href = url;
        });
      })
      .catch(function () { /* buttons keep pointing at download.html */ });
  })();

  if (!page) return;
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
