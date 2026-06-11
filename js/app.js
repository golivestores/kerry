/* 科瑞 KR-8 影院单页交互 */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 进场揭示 ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });

  /* ---------- 语言（默认英文）---------- */
  var currentLang = 'en';
  function sfx(el) {
    return (currentLang === 'zh' && el.dataset.suffixZh != null) ? el.dataset.suffixZh : (el.dataset.suffix || '');
  }

  /* ---------- 数字滚动（进入视口时 0 → 目标值）---------- */
  function countUp(el) {
    var to = parseFloat(el.dataset.to) || 0;
    var dur = 1700, start = 0;
    el.classList.add('counted');
    function frame(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);           // easeOutCubic
      var val = Math.round(to * eased);
      el.textContent = val.toLocaleString('en-US') + sfx(el);
      if (p < 1) requestAnimationFrame(frame);
    }
    if (reduce) { el.textContent = to.toLocaleString('en-US') + sfx(el); return; }
    requestAnimationFrame(frame);
  }
  var numIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { countUp(e.target); numIO.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.figures__num').forEach(function (el) { numIO.observe(el); });

  /* ---------- 导航吸顶变实 ---------- */
  var nav = document.getElementById('nav');
  addEventListener('scroll', function () {
    nav.classList.toggle('solid', scrollY > 40);
  }, { passive: true });

  /* ---------- 中英切换（默认英文，内联文本=英文，data-zh=中文）---------- */
  function applyLang(lang) {
    currentLang = lang;
    // 普通文本元素：首次缓存英文 innerHTML，再按语言切换
    document.querySelectorAll('[data-zh]').forEach(function (el) {
      if (el._en == null) el._en = el.innerHTML;
      el.innerHTML = (lang === 'zh') ? el.dataset.zh : el._en;
    });
    // 已滚动过的数字：用当前语言后缀重渲染终值
    document.querySelectorAll('.figures__num.counted').forEach(function (el) {
      el.textContent = (parseFloat(el.dataset.to) || 0).toLocaleString('en-US') + sfx(el);
    });
    // 切换板块：把当前激活 tab 的标题/文案按语言重渲染
    document.querySelectorAll('.feature--swap').forEach(function (sec) {
      var li = sec.querySelector('.feature__tabs li.on'); if (!li) return;
      var ttl = sec.querySelector('.copy__title');
      var txt = sec.querySelector('.copy__body');
      if (ttl && li.dataset.title) ttl.textContent = (lang === 'zh') ? li.dataset.titleZh : li.dataset.title;
      if (txt && li.dataset.body) txt.textContent = (lang === 'zh') ? li.dataset.bodyZh : li.dataset.body;
    });
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
  }

  var navLang = document.getElementById('navLang');
  if (navLang) {
    navLang.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b || b.classList.contains('on')) return;
      navLang.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      applyLang(b.dataset.lang);
    });
  }
  applyLang('en');   // 初始：英文（缓存英文原文，设定 currentLang）

  /* ---------- 特性标签：点击 + 移动端滑动切换 ---------- */
  function setTab(ul, li) {
    if (!li || li.classList.contains('on')) return;
    ul.querySelectorAll('li').forEach(function (x) { x.classList.remove('on'); });
    li.classList.add('on');
    // 让激活 tab 在移动端横滚行内居中可见
    try { li.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (e) {}

    var sec = ul.closest('.feature--swap');
    if (sec && li.dataset.img) {
      var base = sec.querySelector('.media__el');
      var ttl = sec.querySelector('.copy__title');
      var txt = sec.querySelector('.copy__body');
      // 文案淡出→换字→淡入
      if ((ttl && li.dataset.title) || (txt && li.dataset.body)) {
        sec.classList.add('swapping');
        setTimeout(function () {
          if (ttl && li.dataset.title) ttl.textContent = (currentLang === 'zh') ? li.dataset.titleZh : li.dataset.title;
          if (txt && li.dataset.body) txt.textContent = (currentLang === 'zh') ? li.dataset.bodyZh : li.dataset.body;
          sec.classList.remove('swapping');
        }, 400);
      }
      // 图片：叠一张新图淡入（全程不透出底层），完成后落地、移除叠层
      if (base && base.getAttribute('src') !== li.dataset.img) {
        var ov = document.createElement('img');
        ov.className = 'media__el media__el--swap';
        ov.alt = li.textContent.trim();
        ov.src = li.dataset.img;
        base.parentNode.insertBefore(ov, base.nextSibling);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { ov.style.opacity = '1'; });
        });
        var settle = function () {
          base.src = li.dataset.img; base.alt = ov.alt;
          if (ov.parentNode) ov.parentNode.removeChild(ov);
        };
        ov.addEventListener('transitionend', settle, { once: true });
        setTimeout(settle, 800);
      }
    }
  }
  function stepTab(ul, dir) {
    var lis = ul.querySelectorAll('li');
    var cur = ul.querySelector('li.on');
    var i = Array.prototype.indexOf.call(lis, cur);
    var ni = (i + dir + lis.length) % lis.length;   // 循环
    setTab(ul, lis[ni]);
  }
  document.querySelectorAll('.feature__tabs').forEach(function (ul) {
    ul.addEventListener('click', function (ev) {
      var li = ev.target.closest('li'); if (li) setTab(ul, li);
    });
  });
  // 移动端：在板块图/文案区左右滑动切换 tab（起点落在 tab 行则不接管）
  document.querySelectorAll('.feature').forEach(function (sec) {
    var ul = sec.querySelector('.feature__tabs'); if (!ul) return;
    var sx = 0, sy = 0, on = false;
    sec.addEventListener('touchstart', function (e) {
      if (e.target.closest('.feature__tabs')) { on = false; return; }
      var t = e.touches[0]; sx = t.clientX; sy = t.clientY; on = true;
    }, { passive: true });
    sec.addEventListener('touchend', function (e) {
      if (!on) return; on = false;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;  // 仅横向意图
      stepTab(ul, dx < 0 ? 1 : -1);
    }, { passive: true });
  });

  /* ---------- 移动端汉堡菜单 ---------- */
  var navMenu = document.querySelector('.nav__menu');
  if (navMenu && nav) {
    navMenu.addEventListener('click', function () { nav.classList.toggle('menu-open'); });
    nav.querySelectorAll('.nav__links a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('menu-open'); });
    });
  }

  /* ---------- 机型切换器（参数屏：整屏内容左右滑动）---------- */
  (function () {
    var track = document.getElementById('psliderTrack');
    var vp = document.getElementById('psliderVp');
    if (!track || !vp) return;
    var n = track.children.length, idx = 0;
    var prev = document.querySelector('.pslider__arrow--prev');
    var next = document.querySelector('.pslider__arrow--next');
    function go(k) {                         // 循环：首尾相接
      idx = (k % n + n) % n;
      track.style.transform = 'translateX(' + (-idx * 100) + '%)';
    }
    if (prev) prev.addEventListener('click', function () { go(idx - 1); });
    if (next) next.addEventListener('click', function () { go(idx + 1); });
    // 触摸滑动
    var tx = null;
    vp.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    vp.addEventListener('touchend', function (e) {
      if (tx == null) return;
      var dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) go(dx < 0 ? idx + 1 : idx - 1);
      tx = null;
    }, { passive: true });
    // 触控板双指横滑（wheel deltaX；纵向滚动仍翻页）
    var wheelLock = false;
    vp.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 12) return;
      e.preventDefault();
      if (wheelLock) return;
      wheelLock = true;
      go(e.deltaX > 0 ? idx + 1 : idx - 1);
      setTimeout(function () { wheelLock = false; }, 600);
    }, { passive: false });
    // 鼠标拖拽
    var mx = null;
    vp.addEventListener('mousedown', function (e) { mx = e.clientX; e.preventDefault(); });
    addEventListener('mouseup', function (e) {
      if (mx == null) return;
      var dx = e.clientX - mx;
      if (Math.abs(dx) > 50) go(dx < 0 ? idx + 1 : idx - 1);
      mx = null;
    });
  })();

  /* ---------- Hero 钉住式「K」logo 遮罩转场 ----------
     Hero 是 240vh 轨道，stage 被 sticky 钉在视口；
     一个粗体几何「K」作 mask（居中、不平铺），mask-size 由超大缩到最终：
     静止(p=0) → 不应用遮罩（干净整图）
     一开始下滚 → K 以超大尺寸浮现，越滚越小
     p=1 → K 缩到最终大小居中（完整 K 悬于黑底，画面从镂空透出）。*/
  var hero = document.getElementById('hero');
  var media = document.getElementById('heroMedia');
  var top = document.getElementById('heroTop');
  var bottom = document.getElementById('heroBottom');

  // 「K」字形 SVG（白=可见，透明=遮黑）：竖干 + 上斜臂 + 下斜腿，viewBox 紧贴字形
  var K_POLYS =
    "%3Cpolygon points='6,0 30,0 30,120 6,120'/%3E" +              // 竖干
    "%3Cpolygon points='30,46 78,0 104,0 30,66'/%3E" +            // 上斜臂
    "%3Cpolygon points='30,54 30,74 104,120 78,120'/%3E";         // 下斜腿
  var K_VBW = 104, K_VBH = 120;
  var SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 "
    + K_VBW + " " + K_VBH + "'%3E%3Cg fill='%23fff'%3E" + K_POLYS + "%3C/g%3E%3C/svg%3E\")";

  var START_W = 9;               // 起始：K 宽度 = 9×屏宽（超大，竖干铺满）
  var END_H = 0.5;               // 最终：K 字形高度 = 0.5×屏高
  var ANCHOR0 = 17, ANCHOR1 = 52; // 锚点 x（viewBox 单位）：起始对准竖干 → 终点对准 K 几何中心
  var CY = 60;                    // 锚点 y：始终 K 垂直中线
  var maskOn = false;

  function setMask(p) {
    var wStart = START_W * innerWidth;
    var wEnd = END_H * innerHeight * K_VBW / K_VBH;  // 由最终字高反推宽度
    var w = wEnd + (wStart - wEnd) * Math.pow(1 - p, 1.7);
    var unit = w / K_VBW;                          // viewBox 1 单位 = unit px
    var anchorX = ANCHOR0 + (ANCHOR1 - ANCHOR0) * p;
    var posX = innerWidth / 2 - anchorX * unit;    // 把锚点贴到屏幕中心
    var posY = innerHeight / 2 - CY * unit;
    media.style.webkitMaskSize = media.style.maskSize = w.toFixed(0) + 'px auto';
    media.style.webkitMaskPosition = media.style.maskPosition =
      posX.toFixed(0) + 'px ' + posY.toFixed(0) + 'px';
  }
  function maskOff() {
    media.style.webkitMaskImage = media.style.maskImage = 'none';
    maskOn = false;
  }
  function maskApply() {
    media.style.webkitMaskImage = media.style.maskImage = SVG;
    maskOn = true;
  }

  function onScroll() {
    var rect = hero.getBoundingClientRect();
    var travel = hero.offsetHeight - innerHeight;
    var p = Math.min(Math.max(-rect.top / travel, 0), 1);
    if (!reduce) {
      if (p <= 0.001) {            // 静止/最顶：无遮罩，干净整图
        if (maskOn) maskOff();
      } else {                     // 一旦下滚：K 遮罩浮现并随进度缩小
        if (!maskOn) maskApply();
        setMask(p);
      }
    }
    // 文案全程保留（不随转场淡出）
  }

  if (media && !reduce) {
    var ticking = false;
    addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { onScroll(); ticking = false; });
    }, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }
})();
