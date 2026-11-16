// Year band tracks the reader; the rail stud inks in as each year arrives.
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll(".years a"));
  var targets = links
    .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
    .filter(Boolean);
  if (!targets.length || !("IntersectionObserver" in window)) return;

  function setCurrent(id) {
    links.forEach(function (a) {
      if (a.getAttribute("href") === "#" + id) {
        a.setAttribute("aria-current", "true");
        var band = a.parentNode;
        var left = a.offsetLeft - (band.clientWidth - a.offsetWidth) / 2;
        band.scrollTo({ left: Math.max(0, left), behavior: "auto" });
      } else {
        a.removeAttribute("aria-current");
      }
    });
  }

  var visible = {};
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      visible[entry.target.id] = entry.isIntersecting;
      if (entry.isIntersecting) entry.target.classList.add("arrived");
    });
    refresh();
  }, { rootMargin: "-25% 0px -60% 0px" });

  function atEnd() {
    return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  }

  function refresh() {
    if (atEnd()) { setCurrent(targets[targets.length - 1].id); return; }
    var hits = targets.filter(function (t) { return visible[t.id]; });
    var current = hits[hits.length - 1];
    if (current) setCurrent(current.id);
    else links.forEach(function (a) { a.removeAttribute("aria-current"); });
  }

  targets.forEach(function (t) { observer.observe(t); });

  // Fade the band's right edge while more years are off-screen to the right.
  var band = links[0].parentNode;
  function edge() {
    var more = band.scrollLeft + band.clientWidth < band.scrollWidth - 8;
    band.classList.toggle("more", more);
  }
  band.addEventListener("scroll", edge, { passive: true });
  window.addEventListener("resize", edge);
  edge();

  // The footer is too short to reach the reading line, so it is marked at the page end.
  window.addEventListener("scroll", function () {
    if (atEnd() || links[links.length - 1].hasAttribute("aria-current")) refresh();
  }, { passive: true });
})();
