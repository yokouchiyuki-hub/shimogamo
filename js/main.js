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

  var initial = 'ja';
  try {
    var q = new URLSearchParams(location.search).get('lang');
    var saved = null;
    try { saved = localStorage.getItem('lang'); } catch (e) {}
    if (q === 'en' || q === 'ja') initial = q;
    else if (saved === 'en' || saved === 'ja') initial = saved;
  } catch (e) {}
  setLang(initial, false);
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
