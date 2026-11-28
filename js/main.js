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

  var lbLabelUpdate = null;  // 写真拡大の aria-label を言語に合わせて更新する
  function setLang(lang, save) {
    if (lang !== 'ja' && lang !== 'en') lang = 'ja';
    root.lang = lang;
    if (lbLabelUpdate) lbLabelUpdate();
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

    // 画面に入る少し前に、画像の読み込みを始める(loading="lazy" のままだと、入ってから読み込むため遅れる)
    var eagerImgs = function (root) {
      var im = root.querySelectorAll('img');
      for (var e = 0; e < im.length; e++) im[e].loading = 'eager';
    };
    var preIO = new IntersectionObserver(function (entries, obs) {
      for (var p = 0; p < entries.length; p++) {
        if (!entries[p].isIntersecting) continue;
        eagerImgs(entries[p].target);
        obs.unobserve(entries[p].target);
      }
    }, { rootMargin: '800px 0px' });
    var preTargets = doc.querySelectorAll('.js-reveal, .p-marquee, [data-slider], .p-plans__thumbs');  // 流れるギャラリーとスライダーは、中の画像をすべて
    for (var pt = 0; pt < preTargets.length; pt++) preIO.observe(preTargets[pt]);

    var fades = doc.querySelectorAll('.js-fade');
    var fadeIO = new IntersectionObserver(function (entries, obs) {
      var show = function (el) { el.classList.add('is-visible'); };
      for (var j = 0; j < entries.length; j++) {
        if (!entries[j].isIntersecting) continue;
        var el = entries[j].target;
        obs.unobserve(el);
        var img = el.classList.contains('js-reveal') ? el.querySelector('img') : null;
        if (img && img.decode) {
          // 写真は decode が終わってから現れる(最大 600ms 待つ)
          (function (target, im) {
            var done = false;
            var go = function () { if (!done) { done = true; show(target); } };
            im.decode().then(go, go);
            setTimeout(go, 600);
          })(el, img);
        } else {
          show(el);
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
  // FV のすぐ下のコラージュは、FV が表示されたあとに先読みする
  afterLoadAndPaint(function () {
    var cim = doc.querySelectorAll('.p-concept__collage img');
    for (var c = 0; c < cim.length; c++) cim[c].loading = 'eager';
  });

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

    var canPlay = function () { return !reduceMotion && sVisible && !sUserPaused && !sHover && !sFocus && !sTouch && !doc.querySelector('.p-lightbox[open]'); };
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
    // 写真拡大の開閉で、自動再生を止める / 戻す
    doc.addEventListener('lightboxchange', function () { schedule(); });
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

  /* ---------- 写真の拡大ポップアップ ---------- */
  var lb = doc.getElementById('lightbox');
  if (lb && typeof lb.showModal === 'function') {
    var lbImg = lb.querySelector('[data-lb-img]');
    var lbCap = lb.querySelector('[data-lb-cap]');
    var lbStage = lb.querySelector('[data-lb-stage]');
    var lbNow = lb.querySelector('[data-lb-now]');
    var lbTotal = lb.querySelector('[data-lb-total]');
    var lbMarquee = doc.querySelector('[data-marquee]');
    var lbTriggers = Array.prototype.slice.call(doc.querySelectorAll('.p-concept__photo, .p-location__photo, .p-marquee__item figure, .p-slider__frame, .p-residence__card-photo, .p-craft__shot, .p-plans__thumb, .p-words__photo'));
    var lbGroups = {};
    var lbOrig = new Map();   // 各写真 -> 送りの中で使う本物の写真(マーキーの複製は元の写真へ)
    var lbGroup = null, lbIndex = 0, lbOpener = null, lbSwiped = false, lbToken = 0;

    // グループは、既定ではセクションごと。間取りの各階の写真は、その階の写真だけ(data-lb-group)
    var lbKey = function (t) {
      var g = t.closest('[data-lb-group]');
      return g ? g.getAttribute('data-lb-group') : t.closest('.l-sec').id;
    };
    // グループ(セクションごと)を作る。マーキーの2回目の複製は元の写真に対応づける
    lbTriggers.forEach(function (t) {
      var dup = t.closest('[aria-hidden="true"]') && t.closest('.p-marquee__item');
      if (dup) return;
      var id = lbKey(t);
      (lbGroups[id] = lbGroups[id] || []).push(t);
      lbOrig.set(t, t);
    });
    var rows = doc.querySelectorAll('.p-marquee__track');
    for (var ri = 0; ri < rows.length; ri++) {
      var its = rows[ri].children, half = its.length / 2;
      for (var di = half; di < its.length; di++) lbOrig.set(its[di].querySelector('figure'), its[di - half].querySelector('figure'));
    }

    var lbAlt = function (t) { var im = t.querySelector('img'); return (t._lbAlt || (im && im.getAttribute('alt')) || (lbOrig.get(t) && lbOrig.get(t).querySelector('img').getAttribute('alt')) || ''); };
    var lbLabel = function (alt) { return (root.lang === 'en' ? 'Enlarge: ' : '拡大して見る：') + alt; };
    lbLabelUpdate = function () {
      lbTriggers.forEach(function (t) {
        if (t.hasAttribute('data-lb-trigger') && t.hasAttribute('tabindex')) t.setAttribute('aria-label', lbLabel(lbAlt(lbOrig.get(t) || t)));
      });
    };
    // 開く側: キーボードで開けるようにする(複製はフォーカス対象にしない)
    lbTriggers.forEach(function (t) {
      t.setAttribute('data-lb-trigger', '');
      var dup = lbOrig.get(t) !== t;
      if (!dup) {
        t.setAttribute('tabindex', '0');
        t.setAttribute('role', 'button');
      }
    });
    lbLabelUpdate();

    // 大きい画像: media の付かない webp の srcset(なければ img の src)
    var lbBigSrc = function (t) {
      var src = t.querySelector('source[type="image/webp"]:not([media])');
      var im = t.querySelector('img');
      var v = (src && (src.getAttribute('srcset') || src.getAttribute('data-lsrcset'))) || (im && (im.getAttribute('src') || im.getAttribute('data-lsrc'))) || '';
      return v.split(' ')[0];
    };
    var lbCaption = function (t) {
      var own = t.getAttribute('data-lb-cap-' + root.lang);  // 撮影年月などを足した拡大用のキャプション
      if (own) return own;
      var fc = t.querySelector('figcaption') || t.querySelector('.p-residence__card-note') || (t.parentNode && t.parentNode.querySelector && t.closest('.p-slider__slide') && t.closest('.p-slider__slide').querySelector('figcaption'));
      var out = '';
      if (fc) {
        var c = fc.cloneNode(true);
        var hidden = c.querySelectorAll('[data-lang]:not([data-lang="' + root.lang + '"])');
        for (var i = 0; i < hidden.length; i++) hidden[i].parentNode.removeChild(hidden[i]);
        out = c.innerHTML;
      }
      return out || '';
    };
    var lbShow = function (i) {
      var t = lbGroup[(i + lbGroup.length) % lbGroup.length];
      lbIndex = (i + lbGroup.length) % lbGroup.length;
      var im = t.querySelector('img');
      var token = ++lbToken;
      var small = (im && (im.currentSrc || im.getAttribute('src'))) || '';
      lbImg.alt = lbAlt(t);
      if (small) lbImg.src = small;   // 先に今の小さい画像を出し、大きい画像が届いたら差し替える
      var big = lbBigSrc(t);
      if (big && big !== small) {
        var pre = new Image();
        pre.onload = function () { if (token === lbToken) lbImg.src = big; };
        pre.src = big;
      }
      var cap = lbCaption(t);
      if (cap) lbCap.innerHTML = cap; else lbCap.textContent = lbImg.alt;  // キャプションが無ければ alt を出す
      lbCap.hidden = !lbCap.textContent;
      lbNow.textContent = lbIndex + 1;
      lbTotal.textContent = lbGroup.length;
    };
    var lbOpen = function (t) {
      if (doc.querySelector('.p-planmodal[open]')) return;
      var base = lbOrig.get(t) || t;
      lbGroup = lbGroups[lbKey(t)];
      lbOpener = base;
      lbShow(lbGroup.indexOf(base));
      if (lbMarquee) lbMarquee.classList.add('is-lightbox');
      lb.showModal();
      doc.dispatchEvent(new Event('lightboxchange'));
    };
    var lbClose = function () { lb.close(); };

    // 開く: クリック(ドラッグ後は開かない)と Enter / Space
    var lbDown = null;
    doc.addEventListener('pointerdown', function (e) { lbDown = { x: e.clientX, y: e.clientY }; });
    doc.addEventListener('click', function (e) {
      var t = e.target.closest('[data-lb-trigger]');
      if (!t) return;
      if (lbDown && Math.hypot(e.clientX - lbDown.x, e.clientY - lbDown.y) > 8) return;
      lbOpen(t);
    });
    doc.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-lb-trigger][role="button"]')) {
        e.preventDefault();
        lbOpen(e.target);
      }
    });

    // 送る / 閉じる
    lb.querySelector('[data-lb-prev]').addEventListener('click', function () { lbShow(lbIndex - 1); });
    lb.querySelector('[data-lb-next]').addEventListener('click', function () { lbShow(lbIndex + 1); });
    lb.querySelector('[data-lb-close]').addEventListener('click', lbClose);
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); lbShow(lbIndex + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); lbShow(lbIndex - 1); }
    });
    // 写真の外(背景)のクリックで閉じる
    lb.addEventListener('click', function (e) {
      if (lbSwiped) { lbSwiped = false; return; }
      var t = e.target;
      if (t === lb || t.hasAttribute('data-lb-inner') || t === lbStage || t.hasAttribute('data-lb-fig')) lbClose();
    });
    // スワイプ(左右)
    var sx = null, sy = null;
    lbStage.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
    lbStage.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dy) < 60) { lbSwiped = true; lbShow(lbIndex + (dx < 0 ? 1 : -1)); }
    });
    lbStage.addEventListener('pointercancel', function () { sx = null; });
    // 閉じたら、開く前の写真にフォーカスを戻す
    lb.addEventListener('close', function () {
      if (lbMarquee) lbMarquee.classList.remove('is-lightbox');
      doc.dispatchEvent(new Event('lightboxchange'));
      if (lbOpener) { lbOpener.focus({ preventScroll: true }); lbOpener = null; }
      lbImg.removeAttribute('src');
    });
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
  });

  /* ---------- 漢字エンブレムの筆文字: Adobe Fonts「KSO黒龍爽」(Web プロジェクト noo7vnz、動的サブセット) ---------- */
  // Typekit の読み込みと文字の走査は重いので、初回描画のあとすぐには読まない。
  // 最初のスクロール・操作、または漢字が画面に近づいたときに1回だけ読む。
  // 読み込み中は html に wf-loading、完了で wf-active、3秒で来なければ wf-inactive が付く
  var kanjiFontDone = false;
  var loadKanjiFont = function () {
    if (kanjiFontDone) return;
    kanjiFontDone = true;
    var h = doc.documentElement;
    var tkTimer = setTimeout(function () {
      h.className = h.className.replace(/\bwf-loading\b/g, '') + ' wf-inactive';
    }, 3000);
    h.className += ' wf-loading';
    var tk = doc.createElement('script');
    tk.src = 'https://use.typekit.net/noo7vnz.js';
    tk.async = true;
    tk.onload = function () {
      clearTimeout(tkTimer);
      try { window.Typekit.load({ kitId: 'noo7vnz', scriptTimeout: 3000, async: true }); } catch (e) {}
    };
    tk.onerror = function () { clearTimeout(tkTimer); h.className = h.className.replace(/\bwf-loading\b/g, '') + ' wf-inactive'; };
    doc.head.appendChild(tk);
  };
  afterLoadAndPaint(function () {
    var evs = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
    var onFirst = function () {
      for (var i = 0; i < evs.length; i++) removeEventListener(evs[i], onFirst, { passive: true });
      loadKanjiFont();
    };
    for (var i = 0; i < evs.length; i++) addEventListener(evs[i], onFirst, { passive: true });
    var firstEmblem = doc.querySelector('.c-emblem__kanji');
    if (firstEmblem && 'IntersectionObserver' in window) {
      var kio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { kio.disconnect(); loadKanjiFont(); }
      });
      kio.observe(firstEmblem);
    }
  });

  /* ---------- 動画(帯・Scenes の2本並び): 画面に近づいたら読み込んで再生、離れたら止める ---------- */
  var loopVideos = doc.querySelectorAll('.p-band__video, .p-clips__video');
  if (loopVideos.length && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var mqLoopSp = matchMedia('(max-width:767px)');
    var loopIO = new IntersectionObserver(function (entries) {
      for (var e = 0; e < entries.length; e++) {
        var v = entries[e].target.querySelector('video');
        if (!v) continue;
        if (entries[e].isIntersecting) {
          if (!v.getAttribute('src')) v.src = mqLoopSp.matches ? v.getAttribute('data-src-sp') : v.getAttribute('data-src-pc');
          var lp = v.play();
          if (lp && lp.catch) lp.catch(function () {});
        } else if (v.getAttribute('src')) {
          v.pause();
        }
      }
    }, { rootMargin: '200px 0px' });
    for (var lv = 0; lv < loopVideos.length; lv++) {
      loopVideos[lv].addEventListener('playing', function (ev) { ev.target.classList.add('is-playing'); }, { once: true });
      loopIO.observe(loopVideos[lv].closest('.p-band, .p-clips__item'));
    }
  }

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

  /* ---------- 間取りの「この階の写真」: 下のバーに加えて、写真そのものをドラッグ／スワイプして横に送れる ---------- */
  // タッチは横スクロールそのままで動く。マウスはドラッグで送り、ドラッグした直後のクリックでは拡大を開かない
  var dragStrips = doc.querySelectorAll('.p-plans__thumbs');
  for (var ds = 0; ds < dragStrips.length; ds++) (function (strip) {
    var startX = 0, startLeft = 0, down = false, moved = false;
    strip.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || strip.scrollWidth <= strip.clientWidth) return;
      down = true; moved = false; startX = e.clientX; startLeft = strip.scrollLeft;
    });
    strip.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) { moved = true; strip.classList.add('is-dragging'); try { strip.setPointerCapture(e.pointerId); } catch (err) {} }
      if (moved) { strip.scrollLeft = startLeft - dx; e.preventDefault(); }
    });
    var end = function (e) {
      if (!down) return;
      down = false; strip.classList.remove('is-dragging');
      try { strip.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    strip.addEventListener('pointerup', end);
    strip.addEventListener('pointercancel', end);
    strip.addEventListener('click', function (e) { if (moved) { moved = false; e.preventDefault(); e.stopPropagation(); } }, true);
    strip.addEventListener('dragstart', function (e) { e.preventDefault(); });
  })(dragStrips[ds]);

  /* ---------- 間の章: 背景の枯山水の揺れは、画面に入っている間だけ動かす ---------- */
  var maSec = doc.querySelector('.p-ma');
  if (maSec && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      for (var mi = 0; mi < entries.length; mi++) entries[mi].target.classList.toggle('is-inview', entries[mi].isIntersecting);
    }, { threshold: 0.2 }).observe(maSec);
  } else if (maSec) {
    maSec.classList.add('is-inview');
  }
})();
