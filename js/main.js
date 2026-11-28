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
  var formLangUpdate = null;  // フォームの選択肢・入力例を言語に合わせて更新する
  function setLang(lang, save) {
    if (lang !== 'ja' && lang !== 'en') lang = 'ja';
    root.lang = lang;
    if (lbLabelUpdate) lbLabelUpdate();
    if (formLangUpdate) formLangUpdate();
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
    // SP・iPad: 図の大きさを「縮小・拡大・全体」ボタンで変える(100%〜300%)。拡大・縮小しても見ている中心を保つ
    var PLAN_ZOOMS = [1, 1.5, 2, 2.5, 3];
    var planZoomI = 0;
    var zoomVal = planModal.querySelector('[data-plan-zoom-val]');
    var zoomHint = planModal.querySelector('[data-plan-hint]');
    var zoomOut = planModal.querySelector('[data-plan-zoom="-1"]');
    var zoomIn = planModal.querySelector('[data-plan-zoom="1"]');
    var visiblePlan = function () { var p = planModal.querySelector('.p-planmodal__panel:not([hidden]) .c-plan'); return p; };
    var setPlanZoom = function (i) {
      var sc = visiblePlan();
      var cx = 0.5, cy = 0.5;
      if (sc && sc.scrollWidth > sc.clientWidth) cx = (sc.scrollLeft + sc.clientWidth / 2) / sc.scrollWidth;
      if (sc && sc.scrollHeight > sc.clientHeight) cy = (sc.scrollTop + sc.clientHeight / 2) / sc.scrollHeight;
      planZoomI = Math.max(0, Math.min(PLAN_ZOOMS.length - 1, i));
      planModal.style.setProperty('--plan-zoom', PLAN_ZOOMS[planZoomI]);
      zoomVal.textContent = Math.round(PLAN_ZOOMS[planZoomI] * 100) + '%';
      zoomOut.disabled = planZoomI === 0;
      zoomIn.disabled = planZoomI === PLAN_ZOOMS.length - 1;
      zoomHint.hidden = planZoomI === 0;
      if (sc) requestAnimationFrame(function () {
        sc.scrollLeft = cx * sc.scrollWidth - sc.clientWidth / 2;
        sc.scrollTop = cy * sc.scrollHeight - sc.clientHeight / 2;
      });
    };
    planModal.querySelector('.p-planmodal__zoom').addEventListener('click', function (e) {
      var b = e.target.closest('[data-plan-zoom]');
      if (!b) return;
      var d = +b.getAttribute('data-plan-zoom');
      setPlanZoom(d === 0 ? 0 : planZoomI + d);
    });
    var centerPlan = function () {};  // 開いたときは全体表示(100%)から
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
      setPlanZoom(0);
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

  /* ---------- Scenes: 流れるギャラリー(JS で流し、指やマウスで横に送れる) ---------- */
  // 写真は2回並べてあり、位置を「半分の幅」で折り返すので、どれだけ流しても送っても継ぎ目は出ない。
  // 止める: マウスを乗せている間 / フォーカス中 / 一時停止ボタン / 拡大表示中 / 画面外。送った直後のタップでは拡大を開かない
  var mqBox = doc.querySelector('[data-marquee]');
  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (mqBox && !mqReduce) {  // 動きを減らす設定では、CSS のとおり止めて横スクロールで見せる
    var mqRowsArr = Array.prototype.slice.call(mqBox.querySelectorAll('.p-marquee__row'));
    var mqState = mqRowsArr.map(function (row) {
      var track = row.querySelector('.p-marquee__track');
      var rev = row.classList.contains('p-marquee__row--r');
      return { row: row, track: track, x: rev ? -1 : 0, half: 0, speed: rev ? 1 / 85 : -1 / 70, down: false, moved: false, sx: 0, sxPos: 0, pid: null };
    });
    var mqWrap = function (st) { if (!st.half) return; while (st.x > 0) st.x -= st.half; while (st.x <= -st.half) st.x += st.half; };
    var mqMeasure = function () { mqState.forEach(function (st) { st.half = st.track.scrollWidth / 2; if (st.x === -1) st.x = -st.half; mqWrap(st); st.track.style.transform = 'translateX(' + st.x + 'px)'; }); };
    mqBox.classList.add('is-js');
    mqMeasure();
    addEventListener('resize', mqMeasure);
    addEventListener('load', mqMeasure);
    var mqLast = 0, mqRaf = 0;
    var mqTick = function (t) {
      mqRaf = 0;
      var dt = mqLast ? Math.min(t - mqLast, 100) / 1000 : 0;
      mqLast = t;
      var stopAll = mqReduce || mqBox.classList.contains('is-paused') || mqBox.classList.contains('is-lightbox');
      mqState.forEach(function (st) {
        if (!st.half) st.half = st.track.scrollWidth / 2;
        var stop = stopAll || st.down || st.row.matches(':hover') || st.row.matches(':focus-within');
        if (!stop) { st.x += st.speed * st.half * dt; mqWrap(st); st.track.style.transform = 'translateX(' + st.x + 'px)'; }
      });
      if (!mqBox.classList.contains('is-offscreen')) mqRaf = requestAnimationFrame(mqTick);
      else mqLast = 0;
    };
    var mqStart = function () { if (!mqRaf) { mqLast = 0; mqRaf = requestAnimationFrame(mqTick); } };
    mqStart();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) mqStart(); }).observe(mqBox);
    }
    mqState.forEach(function (st) {
      var row = st.row;
      row.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        st.down = true; st.moved = false; st.sx = e.clientX; st.sxPos = st.x; st.pid = e.pointerId;
      });
      row.addEventListener('pointermove', function (e) {
        if (!st.down || e.pointerId !== st.pid) return;
        var dx = e.clientX - st.sx;
        if (!st.moved && Math.abs(dx) > 6) { st.moved = true; row.classList.add('is-dragging'); try { row.setPointerCapture(st.pid); } catch (err) {} }
        if (st.moved) { st.x = st.sxPos + dx; mqWrap(st); st.track.style.transform = 'translateX(' + st.x + 'px)'; }
      });
      var end = function () {
        if (!st.down) return;
        st.down = false; row.classList.remove('is-dragging');
        try { row.releasePointerCapture(st.pid); } catch (err) {}
      };
      row.addEventListener('pointerup', end);
      row.addEventListener('pointercancel', end);
      row.addEventListener('click', function (e) { if (st.moved) { st.moved = false; e.preventDefault(); e.stopPropagation(); } }, true);
      row.addEventListener('dragstart', function (e) { e.preventDefault(); });
    });
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
      if (own) {
        // 「写真名（説明）」は、写真名と説明の2段に分けて見せる(リンクなどを含むものはそのまま)
        var m = own.indexOf('<') < 0 && (own.match(/^(.+?)（(.+)）$/) || own.match(/^(.+?) \((.+)\)$/));
        if (m) return '<span class="p-lightbox__cap-title">' + m[1] + '</span><span class="p-lightbox__cap-desc">' + m[2] + '</span>';
        return own;
      }
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

  /* ---------- 内覧予約・お問い合わせのフォーム(ポップアップ) ---------- */
  // 開く: SP の追従 CTA / お問い合わせの「内覧予約」「カタログ請求」。1 入力 → 2 確認 の順に進む。
  // 送信の仕組みはまだ入れていない(確認画面の「送信する」は押せない)
  var formModal = doc.getElementById('formmodal');
  if (formModal && typeof formModal.showModal === 'function') {
    var fForm = formModal.querySelector('form');
    var fViewing = fForm.querySelector('[data-form-viewing]');
    var fCountry = fForm.querySelector('[name="country"]');
    var fCountryOther = fForm.querySelector('[data-form-country-other]');
    var fEmail = fForm.querySelector('[name="email"]');
    var fEmail2 = fForm.querySelector('[data-form-email-confirm]');
    var fReview = fForm.querySelector('[data-form-review]');
    var mqFormSp = matchMedia('(max-width:768px)');
    var en = function () { return root.lang === 'en'; };

    // 言語: 選択肢の文字と入力例を切り替える
    formLangUpdate = function () {
      var k = en() ? 'data-en' : 'data-ja', kp = en() ? 'data-ph-en' : 'data-ph-ja';
      Array.prototype.forEach.call(fForm.querySelectorAll('option[data-ja]'), function (o) { o.textContent = o.getAttribute(k); });
      Array.prototype.forEach.call(fForm.querySelectorAll('[data-ph-ja]'), function (el) { el.setAttribute('placeholder', el.getAttribute(kp)); });
    };
    formLangUpdate();

    var setStep = function (n) {
      fForm.setAttribute('data-form-step', String(n));
      Array.prototype.forEach.call(fForm.querySelectorAll('[data-form-panel]'), function (p) { p.hidden = p.getAttribute('data-form-panel') !== String(n); });
      formModal.scrollTop = 0;
    };
    var openForm = function (type) {
      if (type) { var r = fForm.querySelector('input[name="type"][value="' + type + '"]'); if (r) r.checked = true; }
      syncForm();
      setStep(1);
      formModal.showModal();
    };
    var ctaLink = doc.querySelector('.p-floating-cta');
    if (ctaLink) {
      ctaLink.setAttribute('aria-haspopup', 'dialog');
      ctaLink.addEventListener('click', function (e) { if (!mqFormSp.matches) return; e.preventDefault(); openForm('viewing'); });
    }
    Array.prototype.forEach.call(doc.querySelectorAll('[data-form-open]'), function (btn) {
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.addEventListener('click', function (e) { e.preventDefault(); openForm(btn.getAttribute('data-form-open')); });
    });
    formModal.querySelector('[data-form-close]').addEventListener('click', function () { formModal.close(); });
    formModal.addEventListener('click', function (e) { if (e.target === formModal) formModal.close(); });  // シートの外を押したら閉じる

    // 希望日は「内覧予約」のときだけ / 国「その他」のときは入力欄を出す
    var syncForm = function () {
      var t = fForm.querySelector('input[name="type"]:checked');
      fViewing.hidden = !(t && t.value === 'viewing');
      fCountryOther.hidden = fCountry.value !== 'OTHER';
    };
    fForm.addEventListener('change', syncForm);

    // 入力の確認
    var mark = function (el, ok) {
      if (el.type === 'checkbox') el.closest('label').classList.toggle('is-invalid', !ok);
      else el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    };
    var validate = function () {
      var bad = null;
      Array.prototype.forEach.call(fForm.querySelectorAll('[data-form-panel="1"] [required]'), function (el) {
        var ok = el.type === 'checkbox' ? el.checked : (el.value.trim() !== '' && el.checkValidity());
        if (!mark(el, ok) && !bad) bad = el;
      });
      if (!fCountryOther.hidden && !mark(fCountryOther, fCountryOther.value.trim() !== '') && !bad) bad = fCountryOther;
      if (fEmail2.value && !mark(fEmail2, fEmail2.value.trim() === fEmail.value.trim()) && !bad) bad = fEmail2;
      return bad;
    };
    fForm.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid') === 'true') mark(e.target, e.target.value.trim() !== ''); });

    // 確認画面の一覧を作る
    var esc = function (t) { var d = doc.createElement('div'); d.textContent = t; return d.innerHTML; };
    var optText = function (sel) { var o = sel.options[sel.selectedIndex]; return o && o.value ? o.textContent : ''; };
    var buildReview = function () {
      var rows = [];
      var add = function (ja, enl, v) { if (v) rows.push('<div><dt>' + (en() ? enl : ja) + '</dt><dd>' + esc(v) + '</dd></div>'); };
      var t = fForm.querySelector('input[name="type"]:checked');
      add('ご用件', 'Enquiry', t ? t.getAttribute(en() ? 'data-en' : 'data-ja') : '');
      if (!fViewing.hidden) {
        [1, 2, 3].forEach(function (n) {
          var m = optText(fForm.querySelector('[name="date' + n + '_month"]'));
          var d = fForm.querySelector('[name="date' + n + '_day"]').value;
          var tm = fForm.querySelector('input[name="date' + n + '_time"]:checked');
          var tt = tm ? (tm.value === 'am' ? (en() ? 'A.M.' : '午前') : (en() ? 'P.M.' : '午後')) : '';
          var v = m ? (en() ? m + (d ? ' ' + d : '') : m + (d ? d + '日' : '')) + (tt ? ' ' + tt : '') : '';
          add('第' + n + '希望', ['1st', '2nd', '3rd'][n - 1] + ' choice', v);
        });
      }
      add('ご質問・ご要望', 'Message', fForm.querySelector('[name="message"]').value.trim());
      add('お名前', 'Name', (fForm.querySelector('[name="family"]').value + ' ' + fForm.querySelector('[name="given"]').value).trim());
      add('お住まいの国・地域', 'Country', fCountry.value === 'OTHER' ? fCountryOther.value.trim() : optText(fCountry));
      add('メールアドレス', 'Email', fEmail.value.trim());
      add('電話番号', 'Phone', fForm.querySelector('[name="tel"]').value.trim());
      fReview.innerHTML = rows.join('');
    };
    fForm.querySelector('[data-form-next]').addEventListener('click', function () {
      var bad = validate();
      if (bad) { bad.focus(); return; }
      buildReview();
      setStep(2);
    });
    fForm.querySelector('[data-form-back]').addEventListener('click', function () { setStep(1); });
    fForm.addEventListener('submit', function (e) { e.preventDefault(); });  // 送信の仕組みは未設定
  }

  /* ---------- SP: iOS Safari の下のツールバーに追従 CTA が隠れないよう持ち上げる(pr-h.net/catalog/ と同じ方法) ---------- */
  // 見えている範囲(visualViewport)の下端と、ページの枠の下端との差を --vv-bottom に入れる。
  // 120px を超える差はキーボードなどなので持ち上げない
  if (window.visualViewport) {
    var vv = window.visualViewport, vvRaf = 0;
    var updateVv = function () {
      vvRaf = 0;
      var gap = 0;
      if (window.innerWidth <= 768) {
        gap = Math.round(doc.documentElement.clientHeight - (vv.offsetTop + vv.height));
        if (gap < 0 || gap > 120) gap = 0;
      }
      if (root.style.getPropertyValue('--vv-bottom') !== gap + 'px') root.style.setProperty('--vv-bottom', gap + 'px');
    };
    var queueVv = function () { if (!vvRaf) vvRaf = requestAnimationFrame(updateVv); };
    vv.addEventListener('resize', queueVv);
    vv.addEventListener('scroll', queueVv);
    addEventListener('scroll', queueVv, { passive: true });
    updateVv();
  }

  /* ---------- 操作の種類: キーボードのときだけフォーカスの枠を出す(タップ・クリック後に枠を残さない) ---------- */
  doc.addEventListener('keydown', function (e) { if (e.key === 'Tab') root.classList.add('is-kbd'); });
  doc.addEventListener('pointerdown', function () { root.classList.remove('is-kbd'); });

  /* ---------- 間取りの「この階の写真」: 常に見える進み具合のバーと、前後の矢印 ---------- */
  // 端末のスクロールバーは iPhone・Mac では普段見えないので、スライドできることが分かるよう自前で出す。
  // バーのつまみをドラッグ / バーを押す / 矢印 / 写真のスワイプ(ドラッグ) のどれでも送れる
  Array.prototype.forEach.call(doc.querySelectorAll('.p-plans__thumbs'), function (strip) {
    var ui = doc.createElement('div');
    ui.className = 'p-plans__strip-ui';
    var arrow = function (d) { return '<svg viewBox="0 0 8 14" aria-hidden="true" focusable="false"><path d="' + (d < 0 ? 'M7 1 1 7l6 6' : 'M1 1l6 6-6 6') + '" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>'; };
    ui.innerHTML = '<button class="p-plans__strip-btn" type="button" data-dir="-1" aria-label="前の写真 / Previous">' + arrow(-1) + '</button>' +
      '<div class="p-plans__strip-track" aria-hidden="true"><span class="p-plans__strip-thumb"></span></div>' +
      '<button class="p-plans__strip-btn" type="button" data-dir="1" aria-label="次の写真 / Next">' + arrow(1) + '</button>';
    strip.parentNode.insertBefore(ui, strip.nextSibling);
    var track = ui.querySelector('.p-plans__strip-track');
    var thumb = ui.querySelector('.p-plans__strip-thumb');
    var prev = ui.querySelector('[data-dir="-1"]');
    var next = ui.querySelector('[data-dir="1"]');
    var update = function () {
      var max = strip.scrollWidth - strip.clientWidth;
      ui.hidden = max <= 2;
      if (ui.hidden) return;
      var ratio = strip.clientWidth / strip.scrollWidth;
      thumb.style.width = (ratio * 100) + '%';
      thumb.style.left = ((strip.scrollLeft / strip.scrollWidth) * 100) + '%';
      prev.disabled = strip.scrollLeft <= 2;
      next.disabled = strip.scrollLeft >= max - 2;
    };
    strip.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    addEventListener('resize', update);
    addEventListener('load', update);
    Array.prototype.forEach.call(strip.querySelectorAll('img'), function (im) { im.addEventListener('load', update); });
    update();
    ui.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dir]');
      if (b) strip.scrollBy({ left: (+b.getAttribute('data-dir')) * strip.clientWidth * 0.8, behavior: 'smooth' });
    });
    // バー: 押した位置へ / つまみをドラッグ
    var dragging = false, grabX = 0;
    var moveTo = function (clientX) {
      var r = track.getBoundingClientRect();
      var tw = thumb.getBoundingClientRect().width;
      var x = Math.max(0, Math.min(r.width - tw, clientX - r.left - grabX));
      strip.style.scrollBehavior = 'auto';
      strip.scrollLeft = (x / (r.width - tw || 1)) * (strip.scrollWidth - strip.clientWidth);
      strip.style.scrollBehavior = '';
    };
    track.addEventListener('pointerdown', function (e) {
      var tr = thumb.getBoundingClientRect();
      grabX = (e.target === thumb) ? e.clientX - tr.left : tr.width / 2;
      dragging = true; track.classList.add('is-dragging');
      try { track.setPointerCapture(e.pointerId); } catch (err) {}
      moveTo(e.clientX);
      e.preventDefault();
    });
    track.addEventListener('pointermove', function (e) { if (dragging) moveTo(e.clientX); });
    var stop = function () { dragging = false; track.classList.remove('is-dragging'); };
    track.addEventListener('pointerup', stop);
    track.addEventListener('pointercancel', stop);
  });
})();
