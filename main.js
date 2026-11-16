(() => {
  const list = document.getElementById("works");
  const works = window.WORKS || [];
  const COPIES = 3; // PCでは同じ並びを3つつなげて、端のない横スクロールにする

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const workId = (i) => "work-" + String(i + 1).padStart(2, "0");

  const itemHTML = (w, i, hidden) => {
    const lines = [w.date, "", w.title, w.size, w.medium, "", w.memo];
    // 空の項目は行ごと詰める。日付のあとの空行は日付があるときだけ残す
    const info = lines
      .filter((l, j) => l !== "" || (j === 1 && w.date) || j === 5)
      .map((l) => `<p>${esc(l)}</p>`)
      .join("");
    const media = w.image
      ? `<img src="images/${esc(w.image)}" alt="${esc(w.title)}" loading="lazy">`
      : `<span class="ph" role="img" aria-label="${esc(w.title)}"></span>`;
    return `<li class="item"${hidden ? ' aria-hidden="true"' : ""}>
      <div class="info">${info}</div>
      <a class="card" href="#${workId(i)}" data-index="${i}"${hidden ? ' tabindex="-1"' : ""}>${media}</a>
    </li>`;
  };

  let html = "";
  for (let c = 0; c < COPIES; c++) html += works.map((w, i) => itemHTML(w, i, c !== 1)).join("");
  list.innerHTML = html;

  const items = [...list.children];
  const n = works.length;
  const isPC = () => matchMedia("(min-width: 768px)").matches;

  /* ---------- 横スクロール（PC） ---------- */

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

  // カーソルを乗せたカードを大きくする
  const setActive = (el) => items.forEach((it) => it.classList.toggle("is-active", it === el));
  items.forEach((it) => {
    const card = it.querySelector(".card");
    card.addEventListener("mouseenter", () => isPC() && setActive(it));
    // キーボードで選んだときだけ大きくする（作品ページを閉じて戻ったときは大きくしない）
    card.addEventListener("focus", () => isPC() && card.matches(":focus-visible") && setActive(it));
    card.addEventListener("mouseleave", () => it.classList.remove("is-active"));
    card.addEventListener("blur", () => it.classList.remove("is-active"));
  });

  // スクロール後は、カーソルの下にあるカードを大きくし直す
  let mouse = null;
  addEventListener("mousemove", (e) => { mouse = [e.clientX, e.clientY]; });
  list.addEventListener("scroll", () => {
    recenter();
    if (!isPC() || !mouse || isOpen()) return;
    const hit = document.elementFromPoint(...mouse)?.closest(".card")?.parentElement;
    setActive(hit && list.contains(hit) ? hit : null);
  });

  // PCだけ、3秒ごとにカード1枚分、右から左へ流す
  // カーソルがカードに乗っている間、ホイールで動かした直後、作品ページを開いている間は止める
  const AUTO_MS = 3000;
  let lastUser = 0;
  list.addEventListener("wheel", () => { lastUser = Date.now(); }, { passive: true });
  setInterval(() => {
    if (!isPC() || !n || document.hidden || isOpen()) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (list.querySelector(".is-active")) return;
    if (Date.now() - lastUser < AUTO_MS) return;
    const step = items[n + 1].offsetLeft - items[n].offsetLeft;
    // なめらかに動いている途中で巻き戻しが起きないよう、先に位置を戻しておく
    const w = setWidth();
    if (list.scrollLeft + step > w * 1.4) list.scrollLeft -= w;
    list.scrollBy({ left: step, behavior: "smooth" });
  }, AUTO_MS);

  /* ---------- 作品ページ ---------- */

  const detail = document.getElementById("detail");
  const media = document.getElementById("detail-media");
  const slideBody = document.getElementById("detail-slide");
  const prevBtn = document.getElementById("detail-prev");
  const nextBtn = document.getElementById("detail-next");
  const countEl = document.getElementById("detail-count");
  const detailInfo = document.getElementById("detail-info");
  const closeBtn = document.getElementById("detail-close");
  const isOpen = () => !detail.hidden;
  let returnFocus = null;
  let current = -1; // 開いている作品
  let slideAt = 0;  // 何枚目か

  const slidesOf = (w) => (w.slides && w.slides.length ? w.slides : w.image ? [{ image: w.image, thumb: true }] : []);
  const srcOf = (s) => (s.thumb ? `images/${s.image}` : `images/large/${s.image}`);

  const showSlide = (k) => {
    const w = works[current];
    const slides = slidesOf(w);
    if (!slides.length) { slideBody.innerHTML = ""; countEl.hidden = true; prevBtn.hidden = nextBtn.hidden = true; return; }
    slideAt = (k + slides.length) % slides.length; // 最後の次は最初に戻る
    const s = slides[slideAt];
    slideBody.innerHTML = s.embed
      ? `<iframe src="${esc(s.embed)}" title="${esc(w.title)}" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe>`
      : `<img src="${esc(srcOf(s))}" alt="${esc(w.title)}（${slideAt + 1}/${slides.length}）">`;
    media.classList.toggle("is-embed", !!s.embed);
    const many = slides.length > 1;
    prevBtn.hidden = nextBtn.hidden = !many;
    countEl.hidden = !many;
    countEl.textContent = `${slideAt + 1} / ${slides.length}`;
    // 次の画像を先に読み込んでおく
    const nx = slides[(slideAt + 1) % slides.length];
    if (many && nx.image) new Image().src = srcOf(nx);
  };

  prevBtn.addEventListener("click", () => showSlide(slideAt - 1));
  nextBtn.addEventListener("click", () => showSlide(slideAt + 1));
  addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "ArrowLeft") showSlide(slideAt - 1);
    if (e.key === "ArrowRight") showSlide(slideAt + 1);
  });

  // スマホは左右スワイプでも切り替え
  let touchX = null;
  media.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  media.addEventListener("touchend", (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 40) {
      e.preventDefault(); // スワイプのあとにタップ扱いで二重に進まないように
      showSlide(slideAt + (dx < 0 ? 1 : -1));
    }
  });

  const indexFromHash = () => {
    const m = location.hash.match(/^#work-(\d+)$/);
    const i = m ? Number(m[1]) - 1 : -1;
    return i >= 0 && i < n ? i : -1;
  };

  const render = () => {
    const i = indexFromHash();
    if (i < 0) {
      if (!isOpen()) return;
      detail.hidden = true;
      document.body.classList.remove("is-detail-open");
      slideBody.innerHTML = ""; // 動画を止める
      current = -1;
      returnFocus?.focus({ preventScroll: true });
      returnFocus = null;
      return;
    }
    const w = works[i];
    if (i !== current) { current = i; showSlide(0); }
    const rows = [
      `<p id="detail-title">${esc(w.title)}</p>`,
      w.size && `<p>${esc(w.size)}</p>`,
      w.medium && `<p>${esc(w.medium)}</p>`,
      w.text && `<p></p><p class="text">${esc(w.text)}</p>`,
    ];
    detailInfo.innerHTML = rows.filter(Boolean).join("");
    setActive(null);
    detail.hidden = false;
    detail.scrollTop = 0;
    detailInfo.scrollTop = 0;
    document.body.classList.add("is-detail-open");
    closeBtn.focus({ preventScroll: true });
  };

  list.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    e.preventDefault();
    returnFocus = card;
    history.pushState({ detail: true }, "", "#" + workId(Number(card.dataset.index)));
    render();
  });

  const close = () => {
    if (history.state?.detail) history.back(); // 一覧から開いたときは、ブラウザの「戻る」と同じ動き
    else {
      history.replaceState(null, "", location.pathname + location.search);
      render();
    }
  };

  closeBtn.addEventListener("click", close);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && isOpen()) close(); });
  addEventListener("popstate", render);
  addEventListener("hashchange", render);

  /* ---------- 起動 ---------- */

  const applyMode = () => {
    if (!isPC()) setActive(null);
    start();
  };
  matchMedia("(min-width: 768px)").addEventListener("change", applyMode);
  applyMode();
  render(); // URLに #work-05 などが付いていれば、その作品ページを開く
})();
