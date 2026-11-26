// Usage: node capture.js <outDir>
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SITES = [
  ['01-kurisu', 'https://www.kurisu.com/'],
  ['02-putnicki', 'https://www.peteputnicki.com/'],
  ['03-mpkeane', 'https://www.mpkeane.com/'],
  ['04-studiolasso', 'https://www.studiolasso.co.uk/'],
  ['05-jgc-uk', 'https://www.buildajapanesegarden.com/'],
  ['06-ketchell', 'https://robertketchellgardencreator.com/'],
  ['07-yokoso', 'https://yokosojapanesegardens.com/en/'],
  ['08-niwaya', 'https://niwaya.piyolli.net/'],
  ['09-kihara', 'https://www.kiharalandscapes.com.au/'],
  ['10-ueda', 'https://www.fumioueda.com.au/'],
  ['11-jppark', 'https://www.jpgardennature.com/ja/'],
  ['12-masuno', 'https://www.kenkohji.jp/s/'],
  ['13-kazahana', 'https://kaza-hana.jp/'],
  ['14-1moku', 'https://www.1moku.co.jp/'],
  ['15-ueyakato', 'https://ueyakato.jp/en/garden-overseas/'],
];
const only = process.argv[3] ? process.argv[3].split(',') : null;
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });

const MAXH = 14000;

async function autoScroll(page) {
  await page.evaluate(async () => {
    const step = 600;
    for (let y = 0; y < Math.min(document.body.scrollHeight, 16000); y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 220));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 600));
  });
}

async function extract(page) {
  return page.evaluate(() => {
    const cs = el => getComputedStyle(el);
    const txt = el => (el.innerText || '').replace(/\s+/g, ' ').trim();
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const heads = [...document.querySelectorAll('h1,h2,h3')].filter(vis).slice(0, 45)
      .map(h => { const s = cs(h); return { tag: h.tagName, text: txt(h).slice(0, 90), font: s.fontFamily.split(',')[0], size: s.fontSize, weight: s.fontWeight, ls: s.letterSpacing, tt: s.textTransform, y: Math.round(h.getBoundingClientRect().top + scrollY) }; });
    const navEl = document.querySelector('header nav, nav, header');
    const nav = navEl ? [...navEl.querySelectorAll('a')].filter(vis).map(txt).filter(Boolean).slice(0, 25) : [];
    const ps = [...document.querySelectorAll('p')].filter(p => vis(p) && txt(p).length > 60).slice(0, 12);
    const pStyle = ps.map(p => { const s = cs(p); return { font: s.fontFamily.split(',')[0], size: s.fontSize, lh: s.lineHeight, ls: s.letterSpacing, color: s.color, w: Math.round(p.getBoundingClientRect().width) }; });
    // background bands down the page
    const bands = [];
    const H = document.documentElement.scrollHeight;
    for (let y = 0; y < Math.min(H, 16000); y += 400) {
      // sample via elementFromPoint after scroll is expensive; use block elements instead
    }
    const blocks = [...document.querySelectorAll('body *')].filter(el => {
      const r = el.getBoundingClientRect(); return r.width >= innerWidth * 0.95 && r.height > 150;
    });
    const bgSet = {};
    blocks.forEach(el => { const b = cs(el).backgroundColor; if (b && b !== 'rgba(0, 0, 0, 0)') bgSet[b] = (bgSet[b] || 0) + 1; });
    const imgs = [...document.images].filter(vis);
    const fullBleed = imgs.filter(i => i.getBoundingClientRect().width >= innerWidth * 0.9).length;
    const hero = (() => {
      const v = [...document.querySelectorAll('video, iframe')].filter(e => vis(e) && e.getBoundingClientRect().top < innerHeight);
      const bigImg = imgs.filter(i => i.getBoundingClientRect().top < innerHeight && i.getBoundingClientRect().width > innerWidth * 0.6);
      return { video: v.length, bigImgInFirstView: bigImg.length };
    })();
    const buttons = [...document.querySelectorAll('a,button')].filter(a => {
      if (!vis(a)) return false; const s = cs(a); return (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(s.borderWidth) > 0) && txt(a).length > 1 && txt(a).length < 40;
    }).map(txt).slice(0, 15);
    const gen = document.querySelector('meta[name=generator]');
    const html = document.documentElement.outerHTML;
    const platform = gen ? gen.content : (/squarespace/i.test(html) ? 'Squarespace' : /wix\.com|_wix/i.test(html) ? 'Wix' : /wp-content/.test(html) ? 'WordPress' : /webflow/i.test(html) ? 'Webflow' : /shopify/i.test(html) ? 'Shopify' : '?');
    const fontLinks = [...document.querySelectorAll('link[href]')].map(l => l.href).filter(h => /fonts\.googleapis|typekit|fonts\.com|use\.typekit/.test(h)).map(h => decodeURIComponent(h).slice(0, 160));
    const lang = document.documentElement.lang;
    const langLinks = [...document.querySelectorAll('a')].map(txt).filter(t => /^(EN|JP|JA|English|日本語|FR|NL|ES|Español|Français|Nederlands|中文|VN|Tiếng Việt)$/i.test(t)).slice(0, 8);
    const footer = document.querySelector('footer');
    return {
      title: document.title, desc: (document.querySelector('meta[name=description]') || {}).content || '',
      lang, platform, pageHeight: H, viewport: innerWidth,
      bodyFont: cs(document.body).fontFamily, bodyBg: cs(document.body).backgroundColor, bodyColor: cs(document.body).color,
      fontLinks, nav, langLinks, heads, pStyle, bgColors: bgSet, imgCount: imgs.length, fullBleed, hero, buttons,
      footer: footer ? txt(footer).slice(0, 300) : '', wordCount: txt(document.body).split(' ').length,
    };
  });
}

async function sheet(file, outFile) {
  const meta = await sharp(file).metadata();
  const stripH = Math.round(meta.width * 1.6);
  const n = Math.min(Math.ceil(meta.height / stripH), 6);
  const strips = [];
  for (let i = 0; i < n; i++) {
    const top = i * stripH; const h = Math.min(stripH, meta.height - top);
    if (h < 50) break;
    strips.push(await sharp(file).extract({ left: 0, top, width: meta.width, height: h }).resize({ width: 520 }).png().toBuffer());
  }
  const W = 520, H = Math.round(stripH * 520 / meta.width);
  await sharp({ create: { width: W * strips.length + 12 * (strips.length - 1), height: H, channels: 3, background: '#ff00ff' } })
    .composite(strips.map((b, i) => ({ input: b, left: i * (W + 12), top: 0 })))
    .jpeg({ quality: 72 }).toFile(outFile);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = {};
  for (const [id, url] of SITES) {
    if (only && !only.includes(id)) continue;
    results[id] = { url };
    for (const [mode, vp, mobile] of [['pc', { width: 1440, height: 900 }, false], ['sp', { width: 390, height: 844 }, true]]) {
      const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, locale: 'en-US',
        userAgent: mobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : undefined });
      const page = await ctx.newPage();
      try {
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(3500);
        await autoScroll(page);
        await page.waitForTimeout(1500);
        results[id][mode] = { status: resp && resp.status(), finalUrl: page.url(), ...(await extract(page)) };
        const h = Math.min(await page.evaluate(() => document.documentElement.scrollHeight), MAXH);
        const f = path.join(out, `${id}-${mode}-full.png`);
        await page.screenshot({ path: f, clip: { x: 0, y: 0, width: vp.width, height: h }, fullPage: true, timeout: 60000 });
        await page.screenshot({ path: path.join(out, `${id}-${mode}-fv.jpg`), type: 'jpeg', quality: 70 });
        if (mode === 'pc') await sheet(f, path.join(out, `${id}-pc-sheet.jpg`));
        console.log('OK', id, mode, results[id][mode].pageHeight);
      } catch (e) {
        results[id][mode] = { error: String(e).slice(0, 300) };
        console.log('ERR', id, mode, String(e).slice(0, 200));
      }
      await ctx.close();
    }
  }
  await browser.close();
  const jf = path.join(out, only ? `data-${only.join('_')}.json` : 'data.json');
  fs.writeFileSync(jf, JSON.stringify(results, null, 2));
})();
