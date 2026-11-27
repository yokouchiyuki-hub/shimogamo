(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  /* ---------- 共通: 初回描画のあとに実行 ---------- */
  function afterLoadAndPaint(cb) {
    function afterPaint() {
      var called = false;
      function once() { if (!called) { called = true; setTimeout(cb, 0); } }
      try {
        if (performance.getEntriesByName('first-contentful-paint').length) return once();
        new PerformanceObserver(function (list, obs) {
          if (list.getEntriesByName('first-contentful-paint').length) { obs.disconnect(); once(); }
        }).observe({ type: 'paint', buffered: true });
      } catch (e) { once(); }
    }
    if (doc.readyState === 'complete') afterPaint();
    else addEventListener('load', afterPaint, { once: true });
  }

  /* ---------- 言語切替 ---------- */
  var META = {
    ja: {
      title: '下鴨邸宅｜京都市左京区田中上柳町',
      desc: '京都・下鴨、高野川のほとりに誕生する三層の邸宅。鴨川デルタと糺の森にほど近い、田中上柳町の住まい。先着申込受付中。'
    },
    en: {
      title: 'SHIMOGAMO Residence | Tanaka Kamiyanagi-cho, Kyoto',
      desc: 'A three-storey residence on the banks of the Takano River in Shimogamo, Kyoto — close to the Kamo River Delta and Tadasu no Mori. Now accepting applications.'
    }
  };
  var langButtons = doc.querySelectorAll('[data-set-lang]');
  var metaDesc = doc.querySelector('meta[name="description"]');
  var ogTitle = doc.querySelector('meta[property="og:title"]');
  var ogDesc = doc.querySelector('meta[property="og:description"]');

  function setLang(lang, save) {
    if (lang !== 'ja' && lang !== 'en') lang = 'ja';
    root.lang = lang;
    doc.title = META[lang].title;
    if (metaDesc) metaDesc.setAttribute('content', META[lang].desc);
    if (ogTitle) ogTitle.setAttribute('content', META[lang].title);
    if (ogDesc) ogDesc.setAttribute('content', META[lang].desc);
    for (var i = 0; i < langButtons.length; i++) {
      langButtons[i].setAttribute('aria-pressed', langButtons[i].getAttribute('data-set-lang') === lang ? 'true' : 'false');
    }
    if (save) { try { localStorage.setItem('lang', lang); } catch (e) {} }
  }

  // 言語は <head> のインラインスクリプトが描画前に決めて root.lang に入れてある
  setLang(root.lang, false);
  for (var i = 0; i < langButtons.length; i++) {
    langButtons[i].addEventListener('click', function (e) {
      setLang(e.currentTarget.getAttribute('data-set-lang'), true);
    });
  }

  /* ---------- ハンバーガーメニュー ---------- */
  var header = doc.getElementById('header');
  var burger = doc.querySelector('.l-header__burger');
  var menu = doc.getElementById('menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.classList.toggle('is-open', open);
    header.classList.toggle('is-menu-open', open);
    doc.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger && menu) {
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('[data-menu-link]')) setMenu(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
    matchMedia('(min-width:1025px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- IntersectionObserver: ヘッダー / 追従CTA / フェード ---------- */
  var fv = doc.querySelector('.p-fv');
  var contact = doc.getElementById('contact');
  var cta = doc.querySelector('.p-floating-cta');
  var pagetop = doc.querySelector('.p-pagetop');
  var fvVisible = true;
  var contactVisible = false;

  function updateCta() {
    if (cta) cta.classList.toggle('is-show', !fvVisible && !contactVisible);
    if (pagetop) pagetop.classList.toggle('is-show', !fvVisible);  // ページトップは Contact でも出す
  }

  if ('IntersectionObserver' in window) {
    if (fv) {
      // ヘッダーの高さ(72px)より少し内側で判定する（アンカー移動でFVの下端がヘッダーに接したままになるのを防ぐ）
      new IntersectionObserver(function (entries) {
        fvVisible = entries[0].isIntersecting;
        header.classList.toggle('is-solid', !fvVisible);
        updateCta();
      }, { rootMargin: '-80px 0px 0px 0px' }).observe(fv);
    }
    if (contact) {
      new IntersectionObserver(function (entries) {
        contactVisible = entries[0].isIntersecting;
        updateCta();
      }).observe(contact);
    }

    // 砂紋: CSS のスクロール連動アニメーション非対応のブラウザ用(画面に15%入ったら引く)
    if (!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'))) {
      var rakes = doc.querySelectorAll('.c-rake');
      var rakeIO = new IntersectionObserver(function (entries, obs) {
        for (var r = 0; r < entries.length; r++) {
          if (entries[r].isIntersecting) { entries[r].target.classList.add('is-raked'); obs.unobserve(entries[r].target); }
        }
      }, { threshold: 0.15 });
      for (var q = 0; q < rakes.length; q++) rakeIO.observe(rakes[q]);
    }

    var fades = doc.querySelectorAll('.js-fade');
    var fadeIO = new IntersectionObserver(function (entries, obs) {
      for (var j = 0; j < entries.length; j++) {
        if (entries[j].isIntersecting) {
          entries[j].target.classList.add('is-visible');
          obs.unobserve(entries[j].target);
        }
      }
    }, { threshold: 0.15 });
    for (var k = 0; k < fades.length; k++) fadeIO.observe(fades[k]);
  } else {
    // 非対応ブラウザ: 最初から表示
    var all = doc.querySelectorAll('.js-fade');
    for (var m = 0; m < all.length; m++) all[m].classList.add('is-visible');
    if (cta) cta.classList.add('is-show');
    if (pagetop) pagetop.classList.add('is-show');
  }

  /* ---------- CONCEPT 写真の後読み ---------- */
  var lazyDone = false;
  function loadLazyPhotos() {
    if (lazyDone) return;
    lazyDone = true;
    var srcs = doc.querySelectorAll('[data-lsrcset]');
    for (var a = 0; a < srcs.length; a++) {
      srcs[a].setAttribute('srcset', srcs[a].getAttribute('data-lsrcset'));
      srcs[a].removeAttribute('data-lsrcset');
    }
    var imgs = doc.querySelectorAll('[data-lsrc]');
    for (var b = 0; b < imgs.length; b++) {
      imgs[b].setAttribute('src', imgs[b].getAttribute('data-lsrc'));
      imgs[b].removeAttribute('data-lsrc');
    }
  }
  addEventListener('scroll', loadLazyPhotos, { once: true, passive: true });
  afterLoadAndPaint(loadLazyPhotos);

  /* ---------- 間取り図: ラベルの位置(data-x / data-y → --x / --y) ---------- */
  var planLabels = doc.querySelectorAll('.c-plan__label');
  for (var pl = 0; pl < planLabels.length; pl++) {
    planLabels[pl].style.setProperty('--x', planLabels[pl].getAttribute('data-x'));
    planLabels[pl].style.setProperty('--y', planLabels[pl].getAttribute('data-y'));
    planLabels[pl].classList.add('is-placed');
  }

  /* ---------- 間取りポップアップ ---------- */
  var planModal = doc.getElementById('planmodal');
  if (planModal && typeof planModal.showModal === 'function') {
    var planTabs = Array.prototype.slice.call(planModal.querySelectorAll('[role="tab"]'));
    var planOpener = null;

    // 図の画像は、そのタブを初めて開くときに読み込む
    var loadPlanImages = function (panel) {
      var srcs = panel.querySelectorAll('[data-srcset]');
      for (var i = 0; i < srcs.length; i++) {
        srcs[i].setAttribute('srcset', srcs[i].getAttribute('data-srcset'));
        srcs[i].removeAttribute('data-srcset');
      }
      var imgs = panel.querySelectorAll('img[data-src]');
      for (var j = 0; j < imgs.length; j++) {
        imgs[j].setAttribute('src', imgs[j].getAttribute('data-src'));
        imgs[j].removeAttribute('data-src');
      }
    };
    // SP では図が横スクロールになるので、開いたときに中央を見せる（クリック後だけ読む）
    var mqPlanSp = matchMedia('(max-width:768px)');
    var centerPlan = function (panel) {
      if (!mqPlanSp.matches || !panel) return;
      var sc = panel.querySelector('.c-plan');
      if (sc) requestAnimationFrame(function () { sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2; });
    };
    var selectPlanTab = function (tab, focus) {
      for (var i = 0; i < planTabs.length; i++) {
        var on = planTabs[i] === tab;
        planTabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
        planTabs[i].tabIndex = on ? 0 : -1;
        var panel = doc.getElementById(planTabs[i].getAttribute('aria-controls'));
        panel.hidden = !on;
        if (on) { loadPlanImages(panel); if (planModal.open) centerPlan(panel); }
      }
      if (focus) tab.focus();
    };
    var openPlan = function (floor, opener) {
      planOpener = opener;
      var tab = doc.getElementById('plantab-' + floor) || planTabs[0];
      selectPlanTab(tab, false);
      planModal.showModal();
      centerPlan(doc.getElementById(tab.getAttribute('aria-controls')));
    };

    doc.addEventListener('click', function (e) {
      var o = e.target.closest('[data-plan-open]');
      if (o) { setMenu(false); openPlan(o.getAttribute('data-plan-open'), o); return; }
      var c = e.target.closest('[data-plan-close]');
      if (c) { if (c.tagName === 'A') planOpener = null; planModal.close(); }
    });
    // 背景(::backdrop)のクリックで閉じる
    planModal.addEventListener('click', function (e) {
      if (e.target === planModal) planModal.close();
    });
    planModal.addEventListener('close', function () {
      if (planOpener) { planOpener.focus(); planOpener = null; }
    });
    // タブ: 左右の矢印キー / Home / End
    planModal.querySelector('[role="tablist"]').addEventListener('keydown', function (e) {
      var i = planTabs.indexOf(doc.activeElement);
      if (i < 0) return;
      var n = null;
      if (e.key === 'ArrowRight') n = planTabs[(i + 1) % planTabs.length];
      else if (e.key === 'ArrowLeft') n = planTabs[(i + planTabs.length - 1) % planTabs.length];
      else if (e.key === 'Home') n = planTabs[0];
      else if (e.key === 'End') n = planTabs[planTabs.length - 1];
      if (n) { e.preventDefault(); selectPlanTab(n, true); }
    });
    for (var t = 0; t < planTabs.length; t++) {
      planTabs[t].addEventListener('click', function (e) { selectPlanTab(e.currentTarget, false); });
    }
  }

  /* ---------- ページトップ: 戻ったらヘッダーのロゴへフォーカス ---------- */
  if (pagetop) {
    pagetop.addEventListener('click', function () {
      var logo = doc.querySelector('.l-header__logo');
      var done = false;
      var focusLogo = function () {
        if (done) return;
        done = true;
        if (logo) logo.focus({ preventScroll: true });
      };
      addEventListener('scrollend', focusLogo, { once: true });
      setTimeout(focusLogo, 1500);
    });
  }

  /* ---------- Scenes: 流れるギャラリーの一時停止 / 画面外で停止 ---------- */
  var marquee = doc.querySelector('[data-marquee]');
  if (marquee) {
    var marqueeBtn = doc.querySelector('[data-marquee-toggle]');
    if (marqueeBtn) {
      marqueeBtn.addEventListener('click', function () {
        var paused = marqueeBtn.getAttribute('aria-pressed') !== 'true';
        marqueeBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        marquee.classList.toggle('is-paused', paused);
      });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        marquee.classList.toggle('is-offscreen', !entries[0].isIntersecting);
      }).observe(marquee);
    }
  }

  /* ---------- Residence: 室内スライダー ---------- */
  var slider = doc.querySelector('[data-slider]');
  if (slider) {
    var vp = slider.querySelector('[data-slider-viewport]');
    var slides = slider.querySelectorAll('.p-slider__slide');
    var nowEl = slider.querySelector('[data-slider-now]');
    var playBtn = slider.querySelector('[data-slider-toggle]');
    var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var sIdx = 0, sVisible = false, sUserPaused = false, sHover = false, sFocus = false, sTouch = false;
    var sTimer = null, sTouchTimer = null, sTick = false;

    var canPlay = function () { return !reduceMotion && sVisible && !sUserPaused && !sHover && !sFocus && !sTouch; };
    var goTo = function (i) {
      vp.scrollTo({ left: i * vp.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    var nextSlide = function () { goTo((sIdx + 1) % slides.length); };
    // 自動再生の予約(6秒ごと)。進み具合のバーは、クラスを切り替えて毎回やり直す
    var schedule = function () {
      clearTimeout(sTimer);
      slider.classList.remove('is-playing', 'tick-a', 'tick-b');
      if (!canPlay()) return;
      sTick = !sTick;
      slider.classList.add(sTick ? 'tick-a' : 'tick-b', 'is-playing');
      sTimer = setTimeout(nextSlide, 6000);
    };
    var setActive = function (i) {
      sIdx = i;
      for (var n = 0; n < slides.length; n++) slides[n].classList.toggle('is-active', n === i);
      nowEl.textContent = (i < 9 ? '0' : '') + (i + 1);
      schedule();
    };

    if ('IntersectionObserver' in window) {
      var slideIO = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          if (entries[e].isIntersecting) setActive(Array.prototype.indexOf.call(slides, entries[e].target));
        }
      }, { root: vp, threshold: 0.6 });
      for (var n = 0; n < slides.length; n++) slideIO.observe(slides[n]);
      new IntersectionObserver(function (entries) {
        sVisible = entries[0].isIntersecting;
        schedule();
      }, { threshold: 0.3 }).observe(slider);
    } else {
      slides[0].classList.add('is-active');
    }

    slider.querySelector('[data-slider-prev]').addEventListener('click', function () { goTo((sIdx + slides.length - 1) % slides.length); });
    slider.querySelector('[data-slider-next]').addEventListener('click', function () { nextSlide(); });
    playBtn.addEventListener('click', function () {
      sUserPaused = !sUserPaused;
      playBtn.setAttribute('aria-pressed', sUserPaused ? 'true' : 'false');
      playBtn.setAttribute('aria-label', sUserPaused ? '再生 / Play' : '一時停止 / Pause');
      schedule();
    });
    vp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); nextSlide(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo((sIdx + slides.length - 1) % slides.length); }
    });
    slider.addEventListener('mouseenter', function () { sHover = true; schedule(); });
    slider.addEventListener('mouseleave', function () { sHover = false; schedule(); });
    slider.addEventListener('focusin', function () { sFocus = true; schedule(); });
    slider.addEventListener('focusout', function () { sFocus = false; schedule(); });
    // タッチ操作の直後は止める(8秒後に再開)
    slider.addEventListener('touchstart', function () {
      sTouch = true;
      clearTimeout(sTouchTimer);
      schedule();
      sTouchTimer = setTimeout(function () { sTouch = false; schedule(); }, 8000);
    }, { passive: true });
  }

  /* ---------- 砂紋 SVG の後読み(初回描画・LCP を邪魔しない) ---------- */
  afterLoadAndPaint(function () {
    var uses = doc.querySelectorAll('.c-rake use[data-href]');
    for (var u = 0; u < uses.length; u++) {
      uses[u].setAttribute('href', uses[u].getAttribute('data-href'));
      uses[u].removeAttribute('data-href');
    }
  });

  /* ---------- Webフォント ---------- */
  afterLoadAndPaint(function () {
    var l = doc.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500&family=EB+Garamond:ital@0;1&display=swap';
    doc.head.appendChild(l);
    // 漢字エンブレムの筆文字(9文字だけ)
    var y = doc.createElement('link');
    y.rel = 'stylesheet';
    y.href = 'https://fonts.googleapis.com/css2?family=Yuji+Syuku&text=%E5%AE%B6%E5%B7%9D%E6%99%AF%E5%85%89%E9%96%93%E6%9C%A8%E8%A8%80%E9%81%93%E7%B8%81&display=swap';
    doc.head.appendChild(y);
  });

  /* ---------- FV 動画 ---------- */
  var video = doc.querySelector('.p-fv__video');
  if (video) {
    var mqSp = matchMedia('(max-width:767px)');
    var startVideo = function () {
      video.src = mqSp.matches ? video.getAttribute('data-src-sp') : video.getAttribute('data-src-pc');
      video.addEventListener('playing', function () { video.classList.add('is-playing'); }, { once: true });
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    };
    afterLoadAndPaint(function () {
      var go = function () { setTimeout(startVideo, 1200); };
      if (doc.visibilityState === 'visible') go();
      else {
        var onVis = function () {
          if (doc.visibilityState === 'visible') { doc.removeEventListener('visibilitychange', onVis); go(); }
        };
        doc.addEventListener('visibilitychange', onVis);
      }
    });
  }
})();
