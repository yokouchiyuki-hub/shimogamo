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
  var fvVisible = true;
  var contactVisible = false;

  function updateCta() {
    if (cta) cta.classList.toggle('is-show', !fvVisible && !contactVisible);
  }

  if ('IntersectionObserver' in window) {
    if (fv) {
      // ヘッダーの高さ分だけ内側で判定する
      new IntersectionObserver(function (entries) {
        fvVisible = entries[0].isIntersecting;
        header.classList.toggle('is-solid', !fvVisible);
        updateCta();
      }, { rootMargin: '-72px 0px 0px 0px' }).observe(fv);
    }
    if (contact) {
      new IntersectionObserver(function (entries) {
        contactVisible = entries[0].isIntersecting;
        updateCta();
      }).observe(contact);
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

  /* ---------- Webフォント ---------- */
  afterLoadAndPaint(function () {
    var l = doc.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500&family=EB+Garamond:ital@0;1&display=swap';
    doc.head.appendChild(l);
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
