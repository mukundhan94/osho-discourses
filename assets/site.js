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
    var hits = targets.filter(function (t) { return visible[t.id]; });
    var current = hits[hits.length - 1];
    if (current) setCurrent(current.id);
    else links.forEach(function (a) { a.removeAttribute("aria-current"); });
  }, { rootMargin: "-25% 0px -60% 0px" });

  targets.forEach(function (t) { observer.observe(t); });

  // The footer is too short to reach the reading line, so mark it at the page end.
  window.addEventListener("scroll", function () {
    var atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atEnd) setCurrent(targets[targets.length - 1].id);
  }, { passive: true });
})();
