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

// Series search: filters the page's own rows by title and jumps to the chosen one.
(function () {
  var form = document.querySelector(".find");
  if (!form) return;
  form.hidden = false;
  var input = form.querySelector("input");
  var list = form.querySelector(".find-results");
  var count = form.querySelector(".find-count");
  function titleText(el) {
    if (!el) return "";
    var copy = el.cloneNode(true);
    copy.querySelectorAll(".lang").forEach(function (n) { n.remove(); });
    return copy.textContent.replace(/\s+/g, " ").trim();
  }
  var index = Array.prototype.map.call(document.querySelectorAll(".year tbody tr[id]"), function (tr) {
    var section = tr.closest(".year");
    var title = tr.querySelector(".title");
    return {
      id: tr.id,
      title: titleText(title),
      when: (section.querySelector("h2 .num") || {}).textContent + ", " + tr.querySelector(".dates").textContent.trim(),
    };
  });
  function norm(s) { return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); }
  index.forEach(function (r) { r.key = norm(r.title); });

  function render() {
    var q = norm(input.value);
    list.innerHTML = "";
    if (q.length < 2) { count.textContent = ""; return; }
    var hits = index.filter(function (r) { return r.key.indexOf(q) !== -1; });
    count.textContent = hits.length ? hits.length + " found" + (hits.length > 12 ? ", showing the first 12" : "") : "Nothing found";
    hits.slice(0, 12).forEach(function (r) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + r.id;
      a.innerHTML = "<b></b><span></span>";
      a.firstChild.textContent = r.title;
      a.lastChild.textContent = r.when;
      li.appendChild(a);
      list.appendChild(li);
    });
  }
  function go(href) {
    var row = document.getElementById(href.slice(1));
    if (!row) return;
    history.pushState(null, "", href);
    // Jump straight there: a smooth scroll across tens of thousands of pixels is slow and disorienting.
    row.scrollIntoView({ block: "center", behavior: "instant" });
    document.querySelectorAll("tr.found").forEach(function (r) { r.classList.remove("found"); });
    row.classList.add("found");
    list.innerHTML = "";
    count.textContent = "";
  }
  input.addEventListener("input", render);
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var first = list.querySelector("a");
    if (first) go(first.getAttribute("href"));
  });
  list.addEventListener("click", function (ev) {
    var a = ev.target.closest("a");
    if (!a) return;
    ev.preventDefault();
    go(a.getAttribute("href"));
  });
})();

// Four-card tour: one card at a time, lighting up the part of the example rows it describes.
(function () {
  var tour = document.querySelector("[data-tour]");
  if (!tour) return;
  var cards = tour.querySelectorAll(".tcard");
  var nav = tour.querySelector(".tnav");
  var back = tour.querySelector(".tback");
  var next = tour.querySelector(".tnext");
  var dots = tour.querySelectorAll(".tdots i");
  var at = 0;
  tour.classList.add("js");
  nav.hidden = false;
  function show(n) {
    at = n;
    cards.forEach(function (c, k) { c.classList.toggle("active", k === n); });
    dots.forEach(function (d, k) { d.classList.toggle("on", k === n); });
    tour.dataset.step = cards[n].dataset.focus;
    back.disabled = n === 0;
    next.textContent = n === cards.length - 1 ? "Start again" : "Next";
    next.setAttribute("aria-label", n === cards.length - 1 ? "Start the tour again" : "Next card, " + (n + 2) + " of " + cards.length);
  }
  next.addEventListener("click", function () { show(at === cards.length - 1 ? 0 : at + 1); });
  back.addEventListener("click", function () { if (at > 0) show(at - 1); });
  tour.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowRight" && at < cards.length - 1) { show(at + 1); ev.preventDefault(); }
    if (ev.key === "ArrowLeft" && at > 0) { show(at - 1); ev.preventDefault(); }
  });
  show(0);
})();
