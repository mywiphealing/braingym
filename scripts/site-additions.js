// Adds this repo's own pages to the mirrored WordPress site, which knows
// nothing about them:
//   - every page: "Our Impact" (/community.html) and "Impact Survey" (/bot/)
//     in the header menu (desktop + mobile drawer) and the footer, plus footer
//     links to the policy pages and the team login, which nothing linked to
//   - homepage: the community dashboard + survey sections after the hero
//     (scripts/home-sections.html)
//
//   node scripts/site-additions.js
//
// Idempotent: everything it adds is wrapped in <!--wip:add:NAME--> markers and
// replaced on each run. The mirror script runs it after every refresh.

const fs = require("fs");
const path = require("path");

const PUBLIC = path.join(__dirname, "..", "public");
const HOME_SECTIONS = path.join(__dirname, "home-sections.html");

// Pages the site owns but WordPress's menus do not list.
const NAV_ITEMS = [
  { href: "/community.html", label: "Our Impact" },
  { href: "/bot/", label: "Impact Survey" },
];
// The header only has room for one of them next to "For Education"; the
// survey stays reachable from the footer, the homepage and Our Impact.
const HEADER_ITEMS = NAV_ITEMS.filter((i) => i.href !== "/bot/");
// Headline figures WordPress states as exact counts, which disagree with the
// impact report. Keep them generic until there is one agreed source.
// Each count-up loses its "kb-count-up" class so Kadence's animation skips it.
const GENERIC_COUNTS = [
  { end: "10200", number: "Thousands", title: "of individuals reached through workshops, community sessions, and public programmes." },
  { end: "12500", number: "Thousands", title: "of hours of creative healing delivered in Kuala Lumpur, Shah Alam, Johor, and many more." },
  { end: "30", number: "Dozens", title: "of communities engaged across youth, B40s, women, working adults, and disabled community." },
];
const GENERIC_TEXT = [
  ["Trusted by 100+ of organizations throughout the years", "Trusted by organisations across Malaysia since 2021"],
  ['<mark true="true" class="kt-highlight">31,000+ people</mark>', '<mark true="true" class="kt-highlight">thousands of people</mark>'],
  // SHIPS page
  ['data-kb-block="kb-adv-heading5648_d987d7-91">10,000+</div>', 'data-kb-block="kb-adv-heading5648_d987d7-91">Thousands</div>'],
  ['data-kb-block="kb-adv-heading5648_bbe33b-1f">lives impacted by SHIPS</div>', 'data-kb-block="kb-adv-heading5648_bbe33b-1f">of lives touched by SHIPS</div>'],
  ['data-kb-block="kb-adv-heading5648_c9458c-bd">300+</div>', 'data-kb-block="kb-adv-heading5648_c9458c-bd">Hundreds</div>'],
  ['data-kb-block="kb-adv-heading5648_6328a3-64">sessions delivered</div>', 'data-kb-block="kb-adv-heading5648_6328a3-64">of sessions delivered</div>'],
];

const FOOTER_LEGAL = [
  { href: "/privacy-policy/", label: "Privacy Policy" },
  { href: "/ships-terms-of-service/", label: "SHIPS Terms of Service" },
  { href: "/admin.html", label: "Team login" },
];

// WordPress sized the desktop menu bar (900px) for its own seven items; widen
// it for the two added here, and tighten spacing on narrow desktops so the
// menu stays on one line. Below 1025px Kadence swaps in the mobile drawer.
const NAV_CSS = `<style>
@media (min-width:1025px){
.wp-block-kadence-header .kb-header-container:has(.wip-nav-item),
.wp-block-kadence-header-row .kadence-header-row-inner:has(.wip-nav-item){max-width:1180px}}
@media (min-width:1025px){.wp-block-kadence-header-row .kadence-header-row-inner:has(.wip-nav-item) .menu-container > .menu > .wp-block-kadence-navigation-link{margin:0 .3em}}
@media (min-width:1025px) and (max-width:1279px){.wp-block-kadence-header-row .kadence-header-row-inner:has(.wip-nav-item) .kb-nav-link-content{font-size:15px;--kb-nav-link-padding-left:.3em;--kb-nav-link-padding-right:.3em}
.wp-block-kadence-header-row .kadence-header-row-inner:has(.wip-nav-item) .menu-container > .menu > .wp-block-kadence-navigation-link{margin:0 .4em}}
</style>`;

const wrap = (name, html) => `<!--wip:add:${name}-->${html}<!--/wip:add:${name}-->`;

function strip(html) {
  return html
    .replace(/<!--wip:add:(\w[\w-]*)-->[\s\S]*?<!--\/wip:add:\1-->\n?/g, "")
    // Marker style used before this script covered more than the homepage.
    .replace(/<!-- wip:home-sections:start -->[\s\S]*?<!-- wip:home-sections:end -->\n?/g, "");
}

// Index just past the </div> that closes the <div> opening at `from`.
function closingDivEnd(html, from) {
  const tag = /<div\b[^>]*>|<\/div>/gi;
  tag.lastIndex = from;
  let depth = 0;
  let m;
  while ((m = tag.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return tag.lastIndex;
  }
  throw new Error("Unbalanced markup after the hero");
}

function navItems() {
  const items = HEADER_ITEMS.map(
    (i) =>
      `<li class="wp-block-kadence-navigation-link menu-item wip-nav-item"><div class="kb-link-wrap">` +
      `<a class="kb-nav-link-content" href="${i.href}">${i.label}</a></div></li>\n`
  ).join("\n");
  return wrap("nav", items + "\n");
}

// Returns [html, list of additions that could not be placed].
function addToPage(html, { home }) {
  const missed = [];
  html = strip(html);

  // Generic headline figures (in place, like the Resources rewrite below).
  for (const c of GENERIC_COUNTS) {
    const re = new RegExp(`<div class="wp-block-kadence-countup (kb-count-up-[\\w-]+) kb-count-up" data-start="[^"]*" data-end="${c.end}"[^>]*><div class="kb-count-up-process kb-count-up-number"></div><p class="kb-count-up-title">[^<]*</p>`);
    html = html.replace(re, (m, id) =>
      `<div class="wp-block-kadence-countup ${id}"><div class="kb-count-up-number">${c.number}</div><p class="kb-count-up-title">${c.title}</p>`);
  }
  for (const [from, to] of GENERIC_TEXT) html = html.split(from).join(to);

  // Header "Resources" dropdown holds only Peer Stories: make it a plain link.
  // Rewrites WordPress's markup in place (not marker-wrapped), so re-runs find
  // nothing to do.
  const resDrop = /<li class="wp-block-kadence-navigation-link[^"]*menu-item-has-children[^"]*"><div class="kb-link-wrap"><a class="kb-nav-link-content" role="button">Resources<\/a>[\s\S]*?<\/ul><\/li>/g;
  html = html.replace(resDrop,
    `<li class="wp-block-kadence-navigation-link menu-item"><div class="kb-link-wrap"><a class="kb-nav-link-content" href="/ships-peer-stories/">Peer Stories</a></div></li>`);

  // "For Education" sits next to "For Corporate", its sibling audience page.
  const corp = /<li class="wp-block-kadence-navigation-link[^"]*"><div class="kb-link-wrap"><a class="kb-nav-link-content" href="\/corporate\/">For Corporate<\/a><\/div><\/li>/g;
  html = html.replace(corp, (m) => m + wrap("nav-edu", `\n\n<li class="wp-block-kadence-navigation-link menu-item wip-nav-item"><div class="kb-link-wrap"><a class="kb-nav-link-content" href="/education/">For Education</a></div></li>`));

  // Header menus (desktop + mobile drawer share the markup): before "About".
  const about = /<li class="wp-block-kadence-navigation-link[^"]*"><div class="kb-link-wrap"><a class="kb-nav-link-content" href="\/about-us\/">/g;
  let navCount = 0;
  html = html.replace(about, (m) => (navCount++, navItems() + m));
  if (!navCount) missed.push("header menu (no About item)");
  else html = html.replace("</head>", wrap("head-style", NAV_CSS) + "\n</head>");

  // Footer "Resources" menu.
  const res = html.indexOf('id="menu-resources"');
  const resEnd = res === -1 ? -1 : html.indexOf("</ul>", res);
  if (resEnd === -1) missed.push("footer Resources menu");
  else {
    const lis = NAV_ITEMS.map((i) => `<li class="menu-item"><a href="${i.href}">${i.label}</a></li>\n`).join("");
    html = html.slice(0, resEnd) + wrap("footer-menu", lis) + html.slice(resEnd);
  }

  // Footer bottom bar, under the copyright line.
  const copy = /All Rights Reserved\.<\/p>/;
  if (!copy.test(html)) missed.push("footer copyright line");
  else {
    const links = FOOTER_LEGAL.map((l) => `<a href="${l.href}">${l.label}</a>`).join(" &middot; ");
    html = html.replace(copy, (m) => m + wrap("footer-legal", `<p class="wip-footer-legal" style="margin-top:6px;font-size:14px">${links}</p>`));
  }

  if (home) {
    // The hero is the first Kadence row inside the page content.
    const content = html.indexOf('<div class="entry-content');
    const hero = content === -1 ? -1 : html.indexOf('<div class="kb-row-layout-wrap', content);
    if (hero === -1) missed.push("homepage hero");
    else {
      const at = closingDivEnd(html, hero);
      const block = wrap("home-sections", "\n" + fs.readFileSync(HOME_SECTIONS, "utf8").trim() + "\n");
      html = html.slice(0, at) + "\n" + block + "\n" + html.slice(at);
    }
  }
  return [html, missed];
}

// Every mirrored WordPress page: public/index.html and public/**/index.html,
// except the survey, which is this repo's own page.
function wordpressPages(dir = PUBLIC, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!["bot", "img", "wp-content", "wp-includes"].includes(e.name)) wordpressPages(p, out);
    } else if (e.name === "index.html" && fs.readFileSync(p, "utf8").includes("/wp-content/")) {
      out.push(p);
    }
  }
  return out;
}

function run() {
  const home = path.join(PUBLIC, "index.html");
  for (const file of wordpressPages()) {
    const [html, missed] = addToPage(fs.readFileSync(file, "utf8"), { home: file === home });
    fs.writeFileSync(file, html);
    const rel = path.relative(PUBLIC, file).replace(/\\/g, "/");
    console.log(missed.length ? `${rel}: could not add ${missed.join(", ")}` : `${rel}: ok`);
  }
}

if (require.main === module) run();
module.exports = run;
