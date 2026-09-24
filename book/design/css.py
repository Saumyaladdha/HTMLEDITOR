# -*- coding: utf-8 -*-
"""
CSS — the stylesheet, lifted from the finalised reference edition.

SOURCE OF TRUTH: `Chapter 3 - Vidyut Dhara/Chapter 3 - Print A4.html`.
Both blocks below are the reference's own CSS, kept VERBATIM including its
comments. Those comments are not decoration — each one records a real
rendering bug and why the fix is shaped the way it is:

  * `.fr { align-items:stretch }` — centring shrink-wrapped each child, so a
    fraction like (u1+…+un)/n drew a 20px rule under a 99px numerator.
  * `sup, sub { line-height:0 }` — default leading grew the line box, and
    inside a radical that pushed `.sqb`'s overline off the radicand.
  * `.sqb` collapsed onto the text — `border-top` draws on the box edge, so
    any leading floated the bar up against the fraction rule above it.
  * `.flowwrap .u { padding:0.02px 0 }` — stops child margins collapsing
    through the wrapper, so a MEASURED height equals the height the block
    actually occupies. The packer depends on that being true.

Rewriting any of these from scratch would reintroduce the bug they fix, so
they are copied rather than paraphrased.

Two bundles:
    CSS_BASE   components AND the scroll edition's own shell (topbar, TOC,
               card pages) — shared by every output mode
    CSS_A4     page geometry, columns, float flow, print

Neither is what actually ships, and neither has been touched for the
newer `book/chapter-02.html` reference (real figures, the always-on page
footer, the redesigned part banner, per-page `--accent`/`--tint`) — those
additions live where every other post-archive change does, in each
element's own `extra.css` under `book/elements/<id>/`, layered on top by
`book/elements/bundle()`. See that module's docstring for why: splitting
CSS across files and re-joining by hand-picked index would silently
change which rule wins, so anything genuinely new never touches the
numbered `*.rules.json` files at all.
"""

CSS_BASE = r"""
* { box-sizing:border-box; }
body { margin:0; background:#e8e4da; color:#1f2430;
       font-family:'Kalam',cursive; -webkit-font-smoothing:antialiased; }

/* ---------- scroll progress + top bar ---------- */
.topbar { position:sticky; top:0; z-index:60; background:rgba(253,252,247,.94);
          backdrop-filter:blur(6px); border-bottom:1.5px solid #ded8c8;
          display:flex; align-items:center; gap:14px; padding:9px 22px; }
.topbar .tt { font-size:16.5px; font-weight:700; }
.topbar .ts { font-size:14px; color:#7a7466; margin-left:auto; }
.prog { position:absolute; left:0; bottom:-1.5px; height:3px; width:0;
        background:linear-gradient(90deg,#f6c945,#ef8e2a); }

/* ---------- shell ---------- */
.shell { display:grid; grid-template-columns:250px minmax(0,1fr); gap:30px;
         max-width:1240px; margin:0 auto; padding:26px 22px 70px; align-items:start; }
.toc { position:sticky; top:64px; max-height:calc(100vh - 90px); overflow-y:auto;
       background:#fdfcf7; border:2px solid #e3ddcc; border-radius:16px;
       padding:14px 12px 16px; font-size:14.5px; }
.toc h4 { margin:0 0 8px; font-size:15.5px; font-family:'Caveat',cursive;
          font-weight:700; color:#2b3a8f; letter-spacing:.4px; }
.toc a { display:block; color:#4a4636; text-decoration:none; padding:3px 8px;
         border-radius:7px; line-height:1.35; }
.toc a:hover { background:#f2eee1; }
.toc a.t2 { padding-left:16px; font-size:13.5px; color:#6c6656; }
.toc a.on { background:#fdf3b4; color:#1f2430; font-weight:700; }
.toc .grp { margin-top:10px; padding-top:8px; border-top:1.5px dashed #ded8c8; }
.page { background:#fdfcf7; border-radius:20px; box-shadow:0 8px 34px rgba(0,0,0,.13);
        padding:38px 48px 46px; }

/* ---------- headings ---------- */
.booktitle { font-size:41px; font-weight:700; color:#2b3a8f; line-height:1.25;
             text-align:center; }
.booksub { text-align:center; font-family:'Caveat',cursive; font-size:25.5px;
           color:#c2337a; font-weight:700; margin-top:4px; }
.hdu { position:relative; display:inline-block; padding:3px 4px 1px; }
.hdu>i { position:absolute; left:-2px; right:-2px; bottom:-4px; height:9px;
         background-size:100% 100%; background-repeat:no-repeat; }
.hdu>b { position:relative; }
.hd-pink>i{background-image:url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%20200%2012%27%20preserveAspectRatio=%27none%27%3E%3Cpath%20d=%27M3,7C40,3,80,10,120,6C155,3,180,9,197,5%27%20fill=%27none%27%20stroke=%27%23e23b6d%27%20stroke-width=%274.5%27%20stroke-linecap=%27round%27/%3E%3C/svg%3E);}
.hd-blue>i{background-image:url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%20200%2012%27%20preserveAspectRatio=%27none%27%3E%3Cpath%20d=%27M3,7C40,3,80,10,120,6C155,3,180,9,197,5%27%20fill=%27none%27%20stroke=%27%233b74d8%27%20stroke-width=%274.5%27%20stroke-linecap=%27round%27/%3E%3C/svg%3E);}
.hd-green>i{background-image:url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%20200%2012%27%20preserveAspectRatio=%27none%27%3E%3Cpath%20d=%27M3,7C40,3,80,10,120,6C155,3,180,9,197,5%27%20fill=%27none%27%20stroke=%27%233fae4e%27%20stroke-width=%274.5%27%20stroke-linecap=%27round%27/%3E%3C/svg%3E);}
.hd-orange>i{background-image:url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%20200%2012%27%20preserveAspectRatio=%27none%27%3E%3Cpath%20d=%27M3,7C40,3,80,10,120,6C155,3,180,9,197,5%27%20fill=%27none%27%20stroke=%27%23ef8e2a%27%20stroke-width=%274.5%27%20stroke-linecap=%27round%27/%3E%3C/svg%3E);}
.hd-purple>i{background-image:url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%20200%2012%27%20preserveAspectRatio=%27none%27%3E%3Cpath%20d=%27M3,7C40,3,80,10,120,6C155,3,180,9,197,5%27%20fill=%27none%27%20stroke=%27%239a5fd0%27%20stroke-width=%274.5%27%20stroke-linecap=%27round%27/%3E%3C/svg%3E);}
.hd-teal>i{background-image:url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%20200%2012%27%20preserveAspectRatio=%27none%27%3E%3Cpath%20d=%27M3,7C40,3,80,10,120,6C155,3,180,9,197,5%27%20fill=%27none%27%20stroke=%27%2318a8bf%27%20stroke-width=%274.5%27%20stroke-linecap=%27round%27/%3E%3C/svg%3E);}
.h2 { margin:24px 0 12px; font-size:28px; font-weight:700; }
.sechead { display:flex; align-items:center; gap:12px; flex-wrap:wrap; row-gap:8px;
           margin:22px 0 11px; scroll-margin-top:70px; }
.sechead .hdu>b { font-size:25.5px; font-weight:700; }
.secno { width:40px; height:40px; border:3px solid; border-radius:50% 46% 52% 48%;
         display:flex; align-items:center; justify-content:center; font-weight:700;
         font-size:18.5px; flex:none; }
.basetag { font-family:'Caveat',cursive; font-size:19.5px; font-weight:700; color:#8a8372; }

/* exam stamp chip (approved look: dark-red stamp + small yellow pin) */
#
# `.examchip` retired — the reference has none, and the seal it drew is
# now `.topic-frequency` in `elements/topic-frequency/`. The legibility
# note that lived here moved with it.
.starline { display:inline-flex; align-items:center; gap:8px; background:#fdf3b4;
            border:2px solid #e2b93b; border-radius:12px 16px 10px 14px;
            padding:3px 14px; font-weight:700; font-size:15.5px; margin:2px 0 10px; }

/* ---------- text ---------- */
p, .para { font-size:18px; line-height:1.62; margin:8px 0; }
.lead b:first-child { color:#1f2430; }
.m { font-family:Georgia,serif; font-style:italic; }
/* digits, operators and π inside maths. The container is italic because a
   variable should be; a number never should. Georgia's italic figures also sit
   on a slanted baseline, so a run like 2·0 × 10⁻¹⁹ reads as decoration. */
.up { font-style:normal; }
.k { font-family:'Kalam',cursive; font-style:normal; }
/* align-items must be STRETCH, not center. The bar is .dn's border-top, so it
   is only as wide as .dn's box; centring shrink-wraps each child to its own
   content, and a fraction like (u1 + u2 + ... + un)/n drew a 20px rule under a
   99px numerator — the bar looked like it covered a couple of terms instead of
   the whole sum. Stretch makes both children span the widest of the two, and
   text-align keeps the short one centred under the long one. */
.fr { display:inline-flex; flex-direction:column; align-items:stretch; text-align:center;
      line-height:1.14;
      vertical-align:middle; font-size:.86em; font-family:Georgia,serif; font-style:italic; }
/* 3px of air under the fraction bar. Without it a √ inside a denominator put
   its own overline within a hair of the fraction bar and the two read as one
   thick rule, so d/√(r²+d²) looked like a root with no bar at all. */
.fr>.dn { border-top:1.6px solid #1f2430; padding:3px 6px 0; }
.fr>span:first-child { padding-bottom:2px; }
.vec { position:relative; display:inline-block; }
.vec::after { content:"\2192"; position:absolute; left:0; right:0; top:-.66em;
              font-size:.6em; text-align:center; line-height:1; font-style:normal; }
/* A sup or sub with default leading GROWS the line box it sits in. That is
   invisible in prose and fatal inside a radical: `.sqb` draws its overline on
   the box's top edge, so the ² in √(r²+d²) pushed that edge up until the bar
   left the radicand entirely and sat against the fraction rule above it — the
   page showed a double line and a root with no bar. line-height:0 takes them
   out of the calculation; vertical-align still places them. */
sup, sub { line-height:0; }

/* The overline has to meet the √ glyph, not float 4px to its right: a gap there
   reads as a stray line above the radicand rather than part of the sign.
   The box must also collapse onto the text: `border-top` draws on the box edge,
   not on the glyphs, so any leading above them floats the bar off the radicand
   and, inside a denominator, up against the fraction rule. line-height:1 with no
   top padding puts the edge where the characters are. */
.sqb { border-top:1.4px solid #1f2430; padding:0 4px 0 1px; margin-left:-1px;
       display:inline-block; line-height:1; }
.ovl { border-top:1.4px solid #1f2430; }
.dm { font-family:Georgia,serif; font-style:italic; font-size:19.5px; text-align:center;
      margin:10px 0; line-height:1.5; overflow-x:auto; }
.work { font-family:Georgia,serif; font-style:italic; font-size:18px; line-height:1.7;
        margin:9px 0; }
.def { font-size:18px; line-height:1.7; margin:9px 0; padding-left:14px;
       border-left:3px solid #e6dfcc; }
.deflead { font-size:18px; margin:10px 0 3px; }
.dl { color:#2b3a8f; }
.hlp { background:#fbdce8; padding:0 5px; border-radius:6px 8px 5px 7px;
       -webkit-box-decoration-break:clone; box-decoration-break:clone; }
.hlb { background:#d9e8fb; padding:0 5px; border-radius:7px 5px 8px 6px;
       -webkit-box-decoration-break:clone; box-decoration-break:clone; }
ul.bl { margin:7px 0; padding:0; list-style:none; }
ul.bl>li { display:flex; gap:11px; font-size:18px; line-height:1.65; margin:7px 0; }
ul.bl>li::before { content:""; width:9px; height:9px; border-radius:50%; flex:none;
                   margin-top:11px; background:var(--acc,#2fa356); }
ol.nl { margin:7px 0 7px 4px; padding-left:22px; font-size:18px; line-height:1.6; }
ol.nl>li { margin:7px 0; padding-left:4px; }

/* ---------- cards ---------- */
.fcard { border:2.5px solid #9b6fd8; background:#faf7fe; border-radius:16px;
         padding:12px 18px; margin:14px 0; }
.fcard>.ft { font-family:'Caveat',cursive; font-size:22.5px; font-weight:700;
             color:#6b3fb0; margin-bottom:6px; }
.frow { display:flex; gap:10px; align-items:baseline; font-size:17px; line-height:1.6;
        padding:6px 0; border-top:1.5px dashed #ded8f0; }
.frow:first-of-type { border-top:none; }
.frow>.fx { font-family:Georgia,serif; font-style:italic; font-size:18.5px; flex:none;
            background:#fff; border:1.5px solid #d9cff0; border-radius:9px; padding:2px 11px; }
.cond { background:#f4eefc; border-radius:7px; padding:0 7px; font-size:15.5px; }
.trio { font-size:16.5px; background:#f6f3ea; border:1.5px solid #d8d2c0; border-radius:11px;
        padding:6px 14px; margin:10px 0; display:inline-block; }

.callout { border:2.5px solid; border-radius:18px; padding:10px 18px 12px; margin:13px 0; }
.callout>.ch { font-family:'Caveat',cursive; font-size:25.5px; font-weight:700;
               display:flex; align-items:center; gap:9px; margin-bottom:8px; }
.callout>div.ci { font-size:17px; line-height:1.62; margin:6px 0; display:flex; gap:10px; }
.callout>div.ci>span.b { flex:none; font-weight:700; }

.po { display:flex; align-items:flex-start; gap:11px; border:2px solid; border-radius:15px;
      padding:10px 15px; font-size:16.5px; line-height:1.55; margin:9px 0; }
.po>.ic { font-size:19.5px; flex:none; line-height:1.35; }
.po b.t { color:#d32f2f; }
.po-mark { background:#fdecef; border-color:#ec9baa; } .po-mark b.t{color:#c2185b;}
.po-warn { background:#fdecef; border-color:#ec9baa; }
.po-trap { background:#fef3e2; border-color:#f0b96b; } .po-trap b.t{color:#c26a00;}
.po-write{ background:#eef4fd; border-color:#8fb4e8; } .po-write b.t{color:#2456c9;}
.po-num  { background:#eef4fd; border-color:#8fb4e8; } .po-num b.t{color:#2456c9;}
.po-opt  { background:#eef4fd; border-color:#8fb4e8; } .po-opt b.t{color:#2456c9;}
.po-save { background:#e8f8f8; border-color:#79c8d4; } .po-save b.t{color:#0e7c8c;}
.po-key  { background:#e8f8f8; border-color:#79c8d4; } .po-key b.t{color:#0e7c8c;}
.po-line { background:#f4eefc; border-color:#b899ec; } .po-line b.t{color:#7b3fd0;}
.po-turn { background:#f4eefc; border-color:#b899ec; } .po-turn b.t{color:#7b3fd0;}
.po-link { background:#eefaee; border-color:#8fd18f; } .po-link b.t{color:#1f6e3c;}
.po-step { background:#eefaee; border-color:#8fd18f; } .po-step b.t{color:#1f6e3c;}
.po-conf { background:#fdf6d8; border-color:#e2c93b; } .po-conf b.t{color:#8a6d00;}
.po-tip  { background:#fdf6d8; border-color:#e2c93b; } .po-tip b.t{color:#8a6d00;}
.po-ratt { background:#fdf3b4; border-color:#e2b93b; } .po-ratt b.t{color:#8a6d00;}
.po-rep  { background:#fdf3b4; border-color:#e2b93b; font-weight:700; } .po-rep b.t{color:#8a6d00;}
.po-calc { background:#fdeef3; border-color:#e78aa8; } .po-calc b.t{color:#c2337a;}
.po-fig  { background:#f7f5ee; border-color:#cfc7b2; font-size:16px; } .po-fig b.t{color:#6b6450;}
.po-sim  { background:#f6f3ea; border:1.5px dashed #c9c3b4; color:#5a5343; }
.po-sim b.t { color:#5a5343; }
.srcnote { background:#faf8f1; border:1.5px dashed #b9b3a4; border-radius:12px;
           padding:7px 14px; font-size:15.5px; color:#6b6450; margin:9px 0; }

.figcard { border:2.5px dashed #7ba7d4; background:#f4f8fd; border-radius:16px;
           padding:12px 18px; margin:16px 0; }
.figcard>.fh { display:flex; align-items:center; gap:9px; font-weight:700; font-size:17px;
               color:#23558f; margin-bottom:5px; }
.figcard>.fd { font-size:16px; line-height:1.6; color:#4d5666; }

/* ---------- part banners, years, questions ---------- */
.partbanner { margin:28px 0 18px; border-radius:22px; padding:22px 28px; text-align:center;
              background:linear-gradient(100deg,#fdf3b4,#fde7c8); border:2.5px solid #e2b93b; }
.partbanner .pt { font-size:30px; font-weight:700; color:#8a5a00; letter-spacing:.5px; }
.partbanner .ps { font-family:'Caveat',cursive; font-size:23.5px; font-weight:700;
                  color:#c2337a; margin-top:2px; }
.yearhead { display:flex; align-items:center; gap:16px; flex-wrap:wrap; row-gap:8px;
            margin:26px 0 14px; padding-top:8px; border-top:3px dashed #d9d2bf;
            scroll-margin-top:70px; }
.yearhead .yr { position:relative; display:inline-block; padding:4px 24px; }
.yearhead .yr>i { position:absolute; top:0; left:-6px; right:-6px; bottom:0;
    background-size:100% 100%;
    background-image:url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%20200%2040%27%20preserveAspectRatio=%27none%27%3E%3Cpath%20d=%27M6,9C40,3,70,13,100,7C130,2,160,12,194,7L196,22C188,28,168,35,138,31C108,37,68,29,38,34C22,37,8,32,5,27Z%27%20fill=%27%23f6c945%27%20fill-opacity=%27.62%27/%3E%3Cpath%20d=%27M10,12C45,7,80,15,115,10C145,6,175,14,192,11L194,24C180,30,150,36,120,32C90,36,55,31,25,34C14,35,8,30,8,26Z%27%20fill=%27%23f6c945%27%20fill-opacity=%27.4%27/%3E%3C/svg%3E"); }
.yearhead .yr>b { position:relative; font-size:39px; font-weight:700; color:#2b3a8f; }
.marktag { background:#fdf3b4; border:2.5px solid #e2b93b; border-radius:13px;
           padding:3px 17px; font-size:18.5px; font-weight:700; display:inline-block; }
.banner { background:linear-gradient(97deg,rgba(150,220,150,0) .5%,rgba(160,225,160,.5) 4%,
          rgba(190,235,190,.45) 96%,rgba(150,220,150,0) 99.5%); border-radius:16px 24px 18px 26px;
          padding:12px 24px; font-size:18.5px; font-weight:700; margin:20px 0 8px; }

.qcard { border:2px solid #e6dfcc; background:#fffdf8; border-radius:18px;
         padding:16px 22px 18px; margin:18px 0; scroll-margin-top:70px; }
.qhead { display:flex; align-items:center; gap:11px; flex-wrap:wrap; row-gap:6px;
         margin-bottom:9px; }
.qnum { position:relative; display:inline-block; padding:2px 16px; }
.qnum>i { position:absolute; top:0; left:-5px; right:-5px; bottom:0; background-size:100% 100%;
    background-image:url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%20200%2040%27%20preserveAspectRatio=%27none%27%3E%3Cpath%20d=%27M6,9C40,3,70,13,100,7C130,2,160,12,194,7L196,22C188,28,168,35,138,31C108,37,68,29,38,34C22,37,8,32,5,27Z%27%20fill=%27%23ee7fa8%27%20fill-opacity=%27.62%27/%3E%3Cpath%20d=%27M10,12C45,7,80,15,115,10C145,6,175,14,192,11L194,24C180,30,150,36,120,32C90,36,55,31,25,34C14,35,8,30,8,26Z%27%20fill=%27%23ee7fa8%27%20fill-opacity=%27.4%27/%3E%3C/svg%3E"); }
.qnum>b { position:relative; font-size:22.5px; font-weight:700; }
.chip { background:#eef4fc; border:1.5px solid #a9c3e2; border-radius:8px; padding:2px 11px;
        font-size:14.5px; }
.stars { color:#c2337a; font-weight:700; font-size:15.5px; }
.starnote { font-family:'Caveat',cursive; font-size:18.5px; color:#c2337a; font-weight:700; }
.q { font-size:18.5px; line-height:1.65; margin:8px 0; }
.qmarks { background:#fdf3b4; border:1.5px solid #e2b93b; border-radius:8px; padding:1px 9px;
          font-size:14px; font-weight:700; white-space:nowrap; margin-left:6px;
          display:inline-block; }
.marksrow { text-align:right; margin:2px 0 4px; }
p.work { font-family:Georgia,serif; font-style:italic; font-size:18px; line-height:1.7;
         margin:9px 0; padding-left:6px; }
.opts { display:grid; grid-template-columns:1fr 1fr; gap:7px 20px; font-size:17.5px;
        margin:10px 0 4px; padding-left:4px; }
.opts.one { grid-template-columns:1fr; }
.ansrow { display:flex; align-items:flex-start; gap:12px; margin:10px 0 6px; }
.anslabel { position:relative; display:inline-block; padding:2px 14px; flex:none; }
.anslabel>i { position:absolute; top:0; left:-5px; right:-5px; bottom:0; background-size:100% 100%;
    background-image:url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%20200%2040%27%20preserveAspectRatio=%27none%27%3E%3Cpath%20d=%27M6,9C40,3,70,13,100,7C130,2,160,12,194,7L196,22C188,28,168,35,138,31C108,37,68,29,38,34C22,37,8,32,5,27Z%27%20fill=%27%232fa356%27%20fill-opacity=%27.95%27/%3E%3Cpath%20d=%27M10,12C45,7,80,15,115,10C145,6,175,14,192,11L194,24C180,30,150,36,120,32C90,36,55,31,25,34C14,35,8,30,8,26Z%27%20fill=%27%232fa356%27%20fill-opacity=%27.6%27/%3E%3C/svg%3E"); }
.anslabel>b { position:relative; font-size:17.5px; font-weight:700; color:#fff; }
.anstext { font-size:18px; line-height:1.68; font-weight:700; }
.givenlabel { color:#e5326e; font-size:18.5px; font-weight:700; }
.given { background:#fdf7f9; border-left:4px solid #f0a9c2; border-radius:0 12px 12px 0;
         padding:8px 16px; margin:10px 0; font-size:17.5px; line-height:1.6; }

.tbl { border-collapse:collapse; width:100%; font-size:16.5px; line-height:1.5; margin:14px 0; }
.tbl th, .tbl td { border:1.5px solid #ded8c8; padding:7px 13px; text-align:left; }
.tbl th { background:#fdf3b4; font-weight:700; }
.tbl tr:nth-child(even) td { background:#faf8f1; }
.tblwrap { overflow-x:auto; }

.note { background:#fffbe9; border:2px solid #e8dca8; border-radius:14px; padding:11px 18px;
        font-size:17px; line-height:1.6; margin:14px 0; }
.night { border:2.5px dashed #2b3a8f; background:#eef1fb; border-radius:20px;
         padding:18px 24px; margin:26px 0; }
.night .nh { display:flex; align-items:center; gap:11px; font-family:'Caveat',cursive;
             font-size:29px; font-weight:700; color:#2b3a8f; margin-bottom:8px; }
.mirror { border:2.5px solid #b899ec; background:#f8f4fd; border-radius:20px;
          padding:18px 24px; margin:26px 0; }
.mirror .nh { display:flex; align-items:center; gap:11px; font-family:'Caveat',cursive;
              font-size:29px; font-weight:700; color:#6b3fb0; margin-bottom:8px; }
.farewell { text-align:center; font-family:'Caveat',cursive; font-size:31px; font-weight:700;
            color:#c2337a; margin:30px 0 6px; }
.rule { height:9px; border-radius:6px; background:linear-gradient(90deg,#f6c945,#ef8e2a);
        margin:12px 0 4px; }
hr.sep { border:none; border-top:2px dashed #e2dccb; margin:24px 0; }

/* ---------- responsive + print ---------- */
@media (max-width:1100px) {
  .shell { grid-template-columns:minmax(0,1fr); }
  .toc { display:none; }
  .page { padding:26px 22px 34px; }
  .booktitle { font-size:31px; }
  .opts { grid-template-columns:1fr; }
}
@media print {
  body { background:#fff; }
  .topbar, .toc { display:none; }
  .shell { display:block; max-width:none; padding:0; }
  .page { box-shadow:none; border-radius:0; padding:0 6mm; }
  .qcard, .callout, .figcard, .fcard { break-inside:avoid; }
  .sechead, .yearhead { break-after:avoid; }
}
"""

CSS_A4 = r"""
body { background:#cfcabd; margin:0; padding:0; }
.page { width:1080px; height:1527px; overflow:hidden; position:relative;
        background:#fdfcf7; border-radius:0; margin:22px auto;
        box-shadow:0 6px 30px rgba(0,0,0,.25);
        padding:40px 68px 55px; }
.acols { display:flex; }
.acol  { flex:1; min-width:0; display:flex; flex-direction:column; }
.acol:first-child { padding-right:22px; border-right:2.5px dashed #5b8dd6; }
.acol:last-child  { padding-left:21px; }
.acol .u { display:flow-root; }
.acol  > .u:first-child > *:first-child { margin-top:0 !important; }
.qsep { border-top:2.5px dashed #e5a8bc; margin:6px 0 9px; }

/* ---- Part 1: sticky notes float right, body text wraps around them ----
   Nothing in the body may establish a BFC, or it would sit BESIDE the float
   as one solid block instead of letting its lines narrow and then widen
   again underneath. .u is a plain block; the hair-thin padding is only there
   to stop its child's margins collapsing through it, so the measured height
   stays exactly the height it occupies on the page. */
.flowwrap { display:block; }
.flowwrap .u { display:block; padding:0.02px 0; }
.flowwrap > .u:first-of-type > *:first-child { margin-top:0 !important; }
.flowwrap ul.bl > li { display:block; padding-left:20px; text-indent:-20px; }
.flowwrap ul.bl > li::before { display:inline-block; margin-top:0; margin-right:11px;
                               vertical-align:2px; }
.flowwrap ul.bl > li > span, .flowwrap .fr, .flowwrap .vec { text-indent:0; }
/* …but a block with its OWN background or border must not slide under the
   note; giving it a BFC makes it narrow to the space beside the float
   instead. Plain text blocks stay out of this list so their lines keep
   wrapping around the note. */
.flowwrap .partbanner, .flowwrap .callout:not(.sticky), .flowwrap .figcard,
.flowwrap .fcard, .flowwrap .note, .flowwrap .night, .flowwrap .mirror,
.flowwrap .banner, .flowwrap .given, .flowwrap .srcnote { display:flow-root; }
.stickycol { float:right; width:300px; margin:2px 0 16px 20px; }
/* the notes' own margins (.callout.sticky, .po) are more specific than a
   sibling selector, so the stacking gap has to force its way through */
.stickycol > *       { margin:0 !important; }
.stickycol > * + *   { margin-top:26px !important; }

/* a 📌 callout becomes a pinned, slightly rotated note in that column */
.callout.sticky { box-shadow:2px 5px 14px rgba(0,0,0,.18); border-radius:16px;
                  padding:14px 17px 16px; position:relative; margin:0; }
.callout.sticky:nth-child(odd)  { transform:rotate(-1.3deg); }
.callout.sticky:nth-child(even) { transform:rotate(1.4deg); }
.callout.sticky > .pin { position:absolute; top:-9px; right:38px; width:17px; height:17px;
                         border-radius:50%; box-shadow:0 3px 5px rgba(0,0,0,.35); }
.pin.red  { background:radial-gradient(circle at 35% 30%,#ff7b6e,#c81e1e); }
.pin.blue { background:radial-gradient(circle at 35% 30%,#7ec4ff,#1e56c8); }

/* the scroll edition's rhythm is too airy for a printed sheet */
.sechead    { margin:14px 0 8px; }
.h2         { margin:15px 0 9px; }
/* the dashed .qsep already separates the years here */
.yearhead   { margin:10px 0 9px; padding-top:0; border-top:none; }
.partbanner { margin:4px 0 11px; padding:12px 24px; }
.callout    { margin:9px 0; }
.night, .mirror { margin:11px 0; }
.figcard, .fcard, .note, .tbl { margin:8px 0; }
.po { margin:6px 0; }
hr.sep { margin:11px 0; }
.booktitle { margin:4px 0 2px; }

/* questions are not boxed here; they are separated by the dashed .qsep rule,
   exactly like the html/ A4 edition, so a question can flow across columns */
.qcard { border:none; background:none; border-radius:0; padding:0; margin:0; }
.qhead { margin-bottom:8px; }

/* narrow column tuning */
.acol .dm  { font-size:18.5px; margin:8px 0; overflow-x:hidden; }
.acol .tbl { font-size:14.5px; }
.acol .tbl th, .acol .tbl td { padding:4px 7px; }
.acol .opts { gap:6px 12px; }
.acol .figcard, .acol .fcard { padding:10px 14px; }

/* empty plate the figure gets drawn / pasted into */
.figbox { background:#fbfcfe; }
.figbox > .fh { margin-bottom:8px; }
.figspace { border:1.5px dashed #c3d6ea; border-radius:11px; background:#fff; }
/* A REAL PICTURE DOES NOT SIT IN A BOX BUILT FOR AN EMPTY ONE.
   `.is-photo` is set the moment `ref` resolves to an actual URL — see
   `components/figure.figure`. The dashed border and white fill exist to
   make a RESERVED, empty plate read as intentional; a photo already reads
   as intentional on its own, and the dashed line drawn over it looked like
   a printing defect. `object-fit:contain` keeps a wide or tall photo from
   being cropped or stretched to whatever height the (now-unused) reserved
   space guessed at — the image sets its OWN height, and the layout pass
   measures what actually rendered, the same way it measures everything
   else on the page. */
.figbox.is-photo .figspace { border:0; background:none; border-radius:0; }
.figspace img { display:block; width:100%; height:auto; max-height:340px;
     object-fit:contain; border-radius:4px; }
.figrow { display:flex; gap:12px; align-items:flex-start; margin:5px 0; }
.figrow > .figcard { flex:1; min-width:0; margin:0; }
.fig-solo { width:66%; margin-left:auto; margin-right:auto; }

/* ---- Part-1 summary: full-size type, only the whitespace is tightened ---- */
.flowwrap:not(.cover) p, .flowwrap:not(.cover) .para,
.flowwrap:not(.cover) .def, .flowwrap:not(.cover) .deflead,
.flowwrap:not(.cover) ul.bl > li,
.flowwrap:not(.cover) ol.nl { line-height:1.55; font-size:18px; }
.flowwrap:not(.cover) p, .flowwrap:not(.cover) .para { margin:5px 0; }
.flowwrap:not(.cover) .def { margin:4px 0; }
.flowwrap:not(.cover) .deflead { margin:6px 0 2px; }
.flowwrap:not(.cover) ul.bl { margin:4px 0; }
.flowwrap:not(.cover) ul.bl > li { margin:5px 0; }
.flowwrap:not(.cover) .sechead { margin:13px 0 8px; gap:9px; }
/* सूत्र card runs two formulas side by side when there is room. `columns`
   with a minimum width does this by itself: ~944px of page gives two, the
   588px beside a floated note or a 450px question column gives one, with no
   layout switch to maintain. */
.flowwrap:not(.cover) .fcard { padding:9px 15px 10px; margin:8px 0;
                               columns:370px; column-gap:26px;
                               column-rule:2px dashed #ddd0f2; }
.flowwrap:not(.cover) .fcard > .ft { column-span:all; }

/* one idea per line inside a सूत्र row */
.frow { display:block; break-inside:avoid; padding:7px 0 8px; }
.frow > .fx { display:inline-block; margin:0 0 4px; border-width:2px; }
.frow > .fd { display:block; line-height:1.45; }
.frow > .fc { display:block; margin-top:4px; padding:1px 0 1px 9px;
              border-left:3px solid; background:#faf7fe; border-radius:0 8px 8px 0;
              line-height:1.4; }
.frow > .fc > b { color:#6b3fb0; }
.flowwrap:not(.cover) .fcard > .ft { margin-bottom:3px; }
.flowwrap:not(.cover) .frow { padding:4px 0; gap:8px; line-height:1.45; }
.flowwrap:not(.cover) .trio { margin:7px 0; padding:5px 12px; }
.flowwrap:not(.cover) .po { margin:7px 0; padding:8px 12px; line-height:1.5; }
.flowwrap:not(.cover) .note { margin:8px 0; padding:8px 13px; line-height:1.5; }
.flowwrap:not(.cover) .srcnote { margin:6px 0; padding:5px 12px; }
.flowwrap:not(.cover) .dm { margin:8px 0; }
.flowwrap:not(.cover) hr.sep { margin:10px 0; }
.flowwrap:not(.cover) .figcard { margin:8px 0; }
.flowwrap:not(.cover) .partbanner { padding:13px 18px; margin:2px 0 12px; }
.flowwrap:not(.cover) .night, .flowwrap:not(.cover) .mirror { padding:13px 18px; margin:10px 0; }
.flowwrap:not(.cover) ol.nl { margin:6px 0 6px 2px; }
.flowwrap:not(.cover) ol.nl > li { margin:5px 0; }
.flowwrap:not(.cover) .starline { margin:1px 0 6px; }
/* unboxed pointer: emoji + highlighter-marked label, no card */
.flowwrap:not(.cover) .poflat { font-size:18px; line-height:1.55; margin:8px 0; }
.poflat > .ic { font-size:18.5px; margin-right:7px; }
.poflat b.t { padding:1px 7px; border-radius:7px 10px 6px 9px;
              -webkit-box-decoration-break:clone; box-decoration-break:clone; }
.pf-warn b.t { background:#fbd0da; color:#9c1330; }
.pf-tip  b.t { background:#fdefa4; color:#7d5200; }


/* ---------------- designed opening page ---------------- */
.cover { font-size:18px; }
.cvhero { display:flex; align-items:center; gap:24.5px;
          border-bottom:3px dashed #ded8c8; padding-bottom:18.5px; }
.cvtitle { flex:1; min-width:0; }
.cvch { display:inline-block; background:#2b3a8f; color:#fff; font-weight:700;
        font-size:17px; letter-spacing:.6px; border-radius:9px 13px 8px 12px;
        padding:2px 13px; transform:rotate(-1deg); }
.cvname { position:relative; font-size:56px; font-weight:700; color:#2b3a8f;
          line-height:1.15; margin-top:5px; padding-bottom:6px; }
.cvswipe { position:absolute; left:0; bottom:0; width:min(100%,470px); height:14.5px; }
.cvlead { font-size:21px; margin-top:11.5px; }
.cvseal { flex:none; width:130px; height:130px; border-radius:50% 47% 53% 48%;
          background:radial-gradient(circle at 34% 28%,#fdf3b4,#f6c945);
          border:3px solid #e2b93b; display:flex; flex-direction:column;
          align-items:center; justify-content:center; transform:rotate(-4deg);
          box-shadow:2px 5px 14px rgba(0,0,0,.18); }
.cvsn { font-size:53px; font-weight:700; color:#8a5a00; line-height:1; }
.cvsl { font-size:20px; font-weight:700; color:#8a5a00; margin-top:-2px; }

.cvgrid { display:flex; gap:22.5px; margin-top:20.5px; align-items:flex-start; }
.cvcol { flex:1; min-width:0; display:flex; flex-direction:column; gap:16.5px; }
.cvcard { border:2.5px solid; border-radius:18px; padding:16.5px 20px 18px; }
.cvc-pink  { border-color:#e78aa8; background:#fdeef3; }
.cvc-gold  { border-color:#e2b93b; background:#fdf6d8; }
.cvc-green { border-color:#8fd18f; background:#eefaee; }
.cvc-plain { border-color:#c9c3b4; background:#faf8f1; margin-top:20.5px; }
.cvh { font-family:'Caveat',cursive; font-weight:700; font-size:31px; color:#2b3a8f;
       margin-bottom:11px; line-height:1.1; }

/* cover-card column headers (टॉपिक / कितनी बार / …) are reading text —
   14.5px prints at 10.6px, under the 11px floor, same as `.chip` and
   `.acol .tbl` above. 15.2px prints at 11.2px. */
.cvhead { display:flex; justify-content:space-between; gap:12.5px; font-size:15.2px;
          font-weight:700; color:#8a8372; border-bottom:2px solid currentColor;
          padding-bottom:3px; margin-bottom:5px; opacity:.85; }
.cvrow { font-size:18px; line-height:1.4; padding:8px 0;
         border-top:1.5px dashed #e9cdd8; }
.cvrow:first-of-type { border-top:none; padding-top:2px; }
.cvrl { display:flex; align-items:baseline; gap:10.5px; justify-content:space-between; }
.cvtopic { min-width:0; }
.cvtrack { height:13.5px; border-radius:7px; background:#f7dfe8; margin-top:6px; }
.cvbar { display:block; height:100%; border-radius:7px; }
.cvmk { flex:none; white-space:nowrap; font-size:17px; }
.cvtotal { display:flex; justify-content:space-between; align-items:center;
           margin-top:9.5px; padding-top:9px; border-top:2.5px solid #e78aa8;
           font-size:19.5px; font-weight:700; color:#c2337a; }

.cvnote { display:flex; gap:12.5px; border:2px solid; border-radius:16px;
          padding:13.5px 17px; font-size:17.5px; line-height:1.55; }
.cvnote .cvi { flex:none; font-size:22px; line-height:1.3; }
.cvn-red  { border-color:#ec9baa; background:#fdecef; }
.cvn-blue { border-color:#8fb4e8; background:#eef4fd; }

.cvformula { text-align:center; font-family:Georgia,serif; font-style:italic;
             font-size:38px; font-weight:700; color:#8a5a00; background:#fffdf3;
             border:2px dashed #e2b93b; border-radius:14px; padding:9.5px 0; }
.cvchips { display:flex; gap:7px; flex-wrap:wrap; justify-content:center; margin-top:11.5px; }
.cvchip { background:#fff; border:1.5px solid #d9c88a; border-radius:9px;
          padding:3px 13px; font-size:16.5px; font-weight:700; white-space:nowrap; }
.cvchip-hot { background:#c0392b; color:#fff; border-color:#a5301f; }
.cvtxt { font-size:17.5px; line-height:1.6; margin-top:11.5px; }

.cvsteps { display:flex; flex-direction:column; gap:9.5px; }
.cvstep { display:flex; gap:11.5px; font-size:17.5px; line-height:1.45; }
.cvstep .cvn { flex:none; width:28px; height:28px; border-radius:50% 45% 52% 47%;
               background:#3fae4e; color:#fff; font-size:16px; font-weight:700;
               display:flex; align-items:center; justify-content:center; margin-top:1px; }

.cvstats { display:flex; gap:22.5px; align-items:flex-start; }
.cvflex { flex:1; min-width:0; margin-top:0; }
.cvtiles { flex:none; display:flex; gap:11.5px; flex-wrap:wrap; width:329.5px; }
.cvtile { flex:1; background:#fff; border:2px solid #ded8c8; border-radius:14px;
          padding:9.5px 5px; text-align:center; }
.cvtv { font-size:34px; font-weight:700; line-height:1.1; }
.cvtu { font-size:15px; font-weight:700; margin-left:3px; }
.cvty { font-size:13.5px; font-weight:700; margin-top:3px; padding-top:3px;
        border-top:1.5px dashed #e6e0d0; white-space:nowrap; }
.cvtl { font-size:14px; color:#6b6450; line-height:1.25; margin-top:1px; }
.cvtcap { width:100%; text-align:center; font-size:14.5px; color:#8a8372;
          font-weight:700; margin-bottom:1px; }

pre#OVERFLOW { display:none; }



@media print {
  @page { size: A4; margin: 0; }
  body { background:#fff; }
  /* PRINT_ZOOM must leave the page box strictly SMALLER than the sheet.
     At 0.7352 the 1080x1527 box scaled to 794.016 x 1122.650 against A4's
     793.701 x 1122.520, over on BOTH axes by a fraction of a pixel. Each page
     then spilled that sliver onto the next sheet, and because every .page also
     carries break-before:page, the result was a blank sheet after every printed
     one. The ceiling is 793.701/1080 = 0.734908; 0.734 keeps about a pixel of
     slack for sub-pixel rounding, at a fifth of a percent smaller print. */
  .page { margin:0 auto; box-shadow:none; break-before:page; zoom:0.734; }
  body > .page:first-child { break-before:auto; }
}

/* ------------------------------------------------------------------ */
/* ADDED BY THE PIPELINE — not in the reference file.                   */
/* Without this, every background colour drops on most printers: the    */
/* callout fills, the exam stamps, the सूत्र panel and the table headers */
/* all print white. The reference works around it by telling the reader */
/* in its README to switch "Background graphics" on by hand. This rule  */
/* makes that unnecessary, which is the difference between a book that  */
/* prints correctly and one that prints correctly IF you remember.      */
/* (old NIYAM #16)                                                      */
@media print {
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
"""


def stylesheet(mode="a4", chrome=False):
    """Full stylesheet for one output mode, assembled from `book/elements/`.

    CSS_BASE / CSS_A4 above remain the ARCHIVE of the reference's own
    stylesheet — the comments in them record real rendering fixes and are
    the source the per-element files were split from. The live bundle is
    built from `book/elements/<id>/*.rules.json`, each rule carrying the
    index it had here, so editing one element's CSS changes that element
    and nothing else while the cascade stays byte-identical.

    Set VIDYUT_CSS=monolith to fall back to the archive."""
    import os
    if os.environ.get("VIDYUT_CSS") == "monolith":
        return CSS_BASE + (CSS_A4 if mode == "a4" else "")
    from ..elements import bundle
    return bundle(mode)
