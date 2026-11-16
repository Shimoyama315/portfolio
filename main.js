(() => {
  const list = document.getElementById("works");
  const works = window.WORKS || [];
  const COPIES = 3; // PCでは同じ並びを3つつなげて、端のない横スクロールにする

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const itemHTML = (w, hidden) => {
    const lines = [w.date, "", w.title, w.size, w.medium, "", w.memo];
    // 空の項目は行ごと詰めるが、区切りの空行は残す
    const info = lines
      .filter((l, i) => l !== "" || (i === 1 && w.date) || i === 5)
      .map((l) => `<p>${esc(l)}</p>`)
      .join("");
    const media = w.image
      ? `<img src="images/${esc(w.image)}" alt="${esc(w.title)}" loading="lazy">`
      : `<span class="ph" role="img" aria-label="${esc(w.title)}"></span>`;
    return `<li class="item"${hidden ? ' aria-hidden="true"' : ""}>
      <div class="info">${info}</div>
      <a class="card" href="#"${hidden ? ' tabindex="-1"' : ""}>${media}</a>
    </li>`;
  };

  let html = "";
  for (let c = 0; c < COPIES; c++) html += works.map((w) => itemHTML(w, c !== 1)).join("");
  list.innerHTML = html;

  const items = [...list.children];
  const n = works.length;
  const isPC = () => matchMedia("(min-width: 768px)").matches;

  // 1セット分の幅（真ん中のセットの先頭から最後のセットの先頭まで）
  const setWidth = () => items[n * 2].offsetLeft - items[n].offsetLeft;

  const recenter = () => {
    if (!isPC() || !n) return;
    const w = setWidth();
    if (list.scrollLeft < w * 0.5) list.scrollLeft += w;
    else if (list.scrollLeft > w * 1.5) list.scrollLeft -= w;
  };

  const start = () => {
    if (!isPC() || !n) return;
    // 真ん中のセットの先頭カードが、少し左寄りに来る位置から始める
    list.scrollLeft = items[n].offsetLeft - window.innerWidth * 0.27;
  };

  // 縦ホイールを横スクロールに
  list.addEventListener("wheel", (e) => {
    if (!isPC()) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      list.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  // スクロール後は、カーソルの下にあるカードを大きくし直す
  let mouse = null;
  addEventListener("mousemove", (e) => { mouse = [e.clientX, e.clientY]; });
  list.addEventListener("scroll", () => {
    recenter();
    if (!isPC() || !mouse) return;
    const hit = document.elementFromPoint(...mouse)?.closest(".item");
    setActive(hit && list.contains(hit) ? hit : null);
  });

  // カーソルを乗せたカードを大きくする
  const setActive = (el) => items.forEach((it) => it.classList.toggle("is-active", it === el));
  items.forEach((it) => {
    const card = it.querySelector(".card");
    card.addEventListener("mouseenter", () => isPC() && setActive(it));
    card.addEventListener("focus", () => isPC() && setActive(it));
    card.addEventListener("click", (e) => e.preventDefault()); // 作品ページは未定
  });
  list.addEventListener("mouseleave", () => setActive(null));

  // スマホでは常に情報を出す
  const applyMode = () => {
    if (!isPC()) setActive(null);
    start();
  };
  matchMedia("(min-width: 768px)").addEventListener("change", applyMode);
  applyMode();
})();
