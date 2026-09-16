async function main() {
  const res = await fetch("content.json");
  const data = await res.json();

  document.title = data.title;

  const panel = document.getElementById("panel");
  const mapPane = document.getElementById("mapView");
  const imagePane = document.getElementById("imageView");

  data.sections.forEach((section, i) => {
    const el = document.createElement("section");
    el.className = "section";
    el.dataset.index = String(i);

    const titleEl = document.createElement("div");
    titleEl.className = "section-title";
    titleEl.innerHTML = section.title;

    const contentEl = document.createElement("div");
    contentEl.className = "section-content";
    contentEl.innerHTML = section.content;

    el.appendChild(titleEl);
    el.appendChild(contentEl);
    panel.appendChild(el);
  });

  // Set up the ArcGIS web map, reused across all webmap-type sections.
  let view = null;
  let Extent = null;
  let viewReady = false;

  require(["esri/views/MapView", "esri/WebMap", "esri/geometry/Extent"], (MapView, WebMap, ExtentClass) => {
    Extent = ExtentClass;
    const webmap = new WebMap({ portalItem: { id: data.webmapId } });
    view = new MapView({
      container: "mapView",
      map: webmap,
      ui: { components: ["zoom"] },
    });

    view.when(() => {
      viewReady = true;
      showSection(0);

      const sectionEls = Array.from(panel.querySelectorAll(".section"));
      // Sections vary wildly in height (some span multiple screens), so a
      // ratio-based threshold never fires for long ones. Instead watch a
      // thin band at the vertical center of the viewport and activate
      // whichever section is crossing it.
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const idx = Number(entry.target.dataset.index);
            showSection(idx);
          });
        },
        { root: null, rootMargin: "-45% 0px -45% 0px", threshold: 0 }
      );
      sectionEls.forEach((el) => observer.observe(el));
    });
  });

  function showSection(i) {
    const section = data.sections[i];
    if (!section) return;

    if (section.mediaType === "webmap" && section.extent) {
      mapPane.classList.add("active");
      imagePane.classList.remove("active");
      if (view && viewReady && Extent) {
        // view.goTo()'s animated transition never resolves in some
        // environments (an internal SDK animation-manager bug); setting
        // view.extent directly is a reliable, instant equivalent.
        view.extent = new Extent({
          xmin: section.extent.xmin,
          ymin: section.extent.ymin,
          xmax: section.extent.xmax,
          ymax: section.extent.ymax,
          spatialReference: section.extent.spatialReference,
        });
      }
    } else if (section.mediaType === "image" && section.image) {
      imagePane.src = section.image;
      imagePane.alt = section.imageAlt || "";
      imagePane.classList.add("active");
      mapPane.classList.remove("active");
    }
  }
}

main();
