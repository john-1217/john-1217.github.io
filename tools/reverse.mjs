#!/usr/bin/env node
/**
 * 从 john-1217.github.io 构建产物逆向还原 Hexo/Stellar 源码。
 * 产物路径通过环境变量 SITE 指定。
 */
import fs from 'node:fs';
import path from 'node:path';
import TurndownService from 'turndown';
import * as gfm from 'turndown-plugin-gfm';

const SITE = process.env.SITE || '/Users/zhangyizhong/Mirror/john-1217.github.io';
const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'source');

const td = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
});
td.use(gfm.gfm);

// 内容清理：去掉渲染器自动生成的 headerlink 锚点和外链图标
function cleanArticle(html) {
  return html
    .replace(/<a href="#[^"]*" class="headerlink"[^>]*><\/a>/g, '')
    .replace(/<span class="md-link-icon ui-icon" aria-hidden="true">[\s\S]*?<\/span>/g, '')
    .replace(/ data-md-link=""/g, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>\s*(?=[\u4e00-\u9fffA-Za-z])/g, '');
}

// 标题若带非 slug 化的显式 id（如 what/phases），保留原生 HTML
const CJK = /[\u4e00-\u9fff]/;
td.addRule('keepCustomIdHeading', {
  filter: (node) => {
    if (!/^H[1-6]$/.test(node.nodeName)) return false;
    const id = node.getAttribute('id');
    if (!id) return false;
    const text = node.textContent.trim();
    if (!CJK.test(text)) return false;
    // slug 化后会保留中文，显式英文 id 一定不带中文
    return !/[a-z0-9]/.test(id) === false && !id.includes(encodeURIComponent(text.slice(0, 2)));
  },
  replacement: (content, node) => {
    return `\n${node.outerHTML}\n`;
  },
});

// 已知 Stellar 标签插件：从 HTML 还原为标签语法（用占位符防止 turndown 转义）
function restoreTags(html, sink) {
  const stash = (tagMd) => {
    sink.push(tagMd);
    return `\n\n%%STELLARTAG${sink.length - 1}%%\n\n`;
  };
  // {% box title %}…{% endbox %}（标题 markdown 渲染，包裹 strong）
  html = html.replace(
    /<div class="tag-plugin colorful note"( color="([^"]+)")?><div class="title"><strong>([\s\S]*?)<\/strong><\/div><div class="body">([\s\S]*?)<\/div><\/div>/g,
    (m, _c, color, title, body) => {
      const t = title.replace(/<\/?p>/g, '').trim();
      const md = td.turndown(body).trim();
      return stash(`{% box ${color ? `color:${color} ` : ''}${t} %}\n${md}\n{% endbox %}`);
    }
  );
  // {% note color:x title content %}（标题为原文单 token）
  html = html.replace(
    /<div class="tag-plugin colorful note"([^>]*)><div class="title">([^<]+)<\/div><div class="body">([\s\S]*?)<\/div><\/div>/g,
    (m, attrs, title, body) => {
      const color = attrs.match(/color="([^"]+)"/)?.[1];
      const md = td.turndown(body).trim();
      return stash(`{% note ${color ? `color:${color} ` : ''}${title.trim()} ${md} %}`);
    }
  );
  // 无标题 note
  html = html.replace(
    /<div class="tag-plugin colorful note"([^>]*)><div class="body">([\s\S]*?)<\/div><\/div>/g,
    (m, attrs, body) => {
      const color = attrs.match(/color="([^"]+)"/)?.[1];
      const md = td.turndown(body).trim();
      return stash(`{% note ${color ? `color:${color} ` : ''}${md} %}`);
    }
  );
  // {% friends %}
  html = html.replace(
    /<div class="tag-plugin users-posts-wrap"><div class="data-service ds-friends_and_posts" data-api="([^"]+)"><div class="grid-box"><\/div><\/div><\/div>/g,
    (m, api) => stash(`{% friends posts:true api:${api} %}`)
  );
  // {% md src %}
  html = html.replace(
    /<div class="data-service ds-mdrender" src="([^"]+)"[^>]*><\/div>/g,
    (m, src) => stash(`{% md ${src} %}`)
  );
  return html;
}

function htmlToMd(html) {
  const sink = [];
  const h = restoreTags(cleanArticle(html), sink);
  let md = td.turndown(h)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  md = md.replace(/%%STELLARTAG(\d+)%%/g, (m, i) => sink[Number(i)]);
  return md;
}

function articleOf(file) {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<article class="md-text[^"]*"[^>]*>([\s\S]*?)<\/article>/);
  if (!m) throw new Error('no article in ' + file);
  return { html: m[1], full: html };
}

function fmYaml(key, val) {
  if (val == null) return '';
  if (Array.isArray(val)) return `${key}:\n${val.map(v => `  - ${v}`).join('\n')}\n`;
  return `${key}: ${val}\n`;
}

// ---------- 7 篇文章 ----------
const posts = [
  ['a-short-walk', '2026-08-31'],
  ['reading-without-a-list', '2026-09-01'],
  ['keep-your-tools-within-reach', '2026-09-02'],
  ['a-reusable-publishing-checklist', '2026-09-03'],
  ['one-paragraph-before-the-title', '2026-09-04'],
  ['welcome-to-suye', '2026-09-05'],
  ['introducing-test-case-generator', '2026-11-24'],
];

// search.json 是手工维护的描述来源：path → { title, content(即 description) }
const SEARCH = Object.fromEntries(
  JSON.parse(fs.readFileSync(path.join(SITE, 'search.json'), 'utf8')).map(e => [e.path, e])
);
function quote(v) { return JSON.stringify(String(v)); }
// 从目标页 <meta name="description"> 提取原文 front-matter 描述
function metaDescription(fullHtml) {
  const m = fullHtml.match(/<meta name="description" content="([^"]*)"/);
  if (!m) return '';
  return m[1]
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

const TOPICS = {
  'one-paragraph-before-the-title': 'writing',
  'keep-your-tools-within-reach': 'writing',
};

fs.mkdirSync(path.join(SRC, '_posts'), { recursive: true });

for (const [slug] of posts) {
  const { html, full } = articleOf(path.join(SITE, 'posts', slug, 'index.html'));
  const time = html.match(/<time datetime="([^"]+)"/)?.[1]
    || full.match(/<time datetime="([^"]+)"/)?.[1];
  const title = full.match(/<h1 class="text title">\s*<span>([^<]+)<\/span>/)?.[1]
    || full.match(/<h1 class="text title">\s*([^<]+)\s*<\/h1>/)?.[1];
  const date = new Date(time);
  // 北京时间
  const bj = new Date(date.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const tagsAll = [...full.matchAll(/class="tag" href="\/tags\/[^"]*"><svg[\s\S]*?<\/svg>([^<]+)<\/a>/g)].map(m => m[1]);
  const cats = [...full.matchAll(/class="cap breadcrumb-link" href="\/categories\/[^"]*">([^<]+)<\/a>/g)]
    .map(m => m[1]).filter(t => t !== '分类');
  const tags = [...new Set(tagsAll)];
  const md = htmlToMd(html);
  const fm = [
    '---\n',
    fmYaml('title', title),
    fmYaml('date', bj),
    fmYaml('updated', bj),
    cats.length ? fmYaml('categories', cats) : '',
    fmYaml('tags', tags),
    TOPICS[slug] ? 'collection:\n  profile: topic\n  id: writing\n' : '',
    metaDescription(full) ? `description: ${quote(metaDescription(full))}\n` : '',
    '---\n\n',
  ].join('');
  fs.writeFileSync(path.join(SRC, '_posts', `${slug}.md`), fm + md + '\n');
  console.log('post:', slug, '|', bj, '| cats:', cats.join(','), '| tags:', tags.join(','));
}

// ---------- 独立页面 ----------
fs.mkdirSync(path.join(SRC, 'about'), { recursive: true });
{
  const { html, full } = articleOf(path.join(SITE, 'about/index.html'));
  const md = htmlToMd(html);
  const desc = metaDescription(full);
  fs.writeFileSync(path.join(SRC, 'about/index.md'),
    `---\ntitle: 关于\ndate: 2026-11-23 22:22:29\nupdated: 2026-11-23 22:22:29\ntags:\n  - 前端\n  - 技术博客\n  - 易中\n  - 美团\nkeywords: ${quote('易中,前端,技术博客,美团')}\n${desc ? `description: ${quote(desc)}\n` : ''}---\n\n${md}\n`);
  console.log('page: about');
}
fs.mkdirSync(path.join(SRC, 'friends'), { recursive: true });
{
  const { html, full } = articleOf(path.join(SITE, 'friends/index.html'));
  const md = htmlToMd(html);
  const desc = metaDescription(full);
  fs.writeFileSync(path.join(SRC, 'friends/index.md'),
    `---\ntitle: 友链\ndate: 2022-09-14 16:40:00\nupdated: 2022-09-14 16:40:00\n${desc ? `description: ${quote(desc)}\n` : ''}---\n\n${md}\n`);
  console.log('page: friends');
}

// wiki 项目文档页
{
  const { html, full } = articleOf(path.join(SITE, 'wiki/projects/index.html'));
  const md = htmlToMd(html);
  const desc = metaDescription(full);
  fs.mkdirSync(path.join(SRC, 'wiki/projects'), { recursive: true });
  fs.writeFileSync(path.join(SRC, 'wiki/projects/index.md'),
    `---\ntitle: 测试用例智能体\ncollection:\n  profile: wiki\n  id: projects\nupdated: 2026-11-24 08:00:00\n${desc ? `description: ${quote(desc)}\n` : ''}---\n\n${md}\n`);
  console.log('page: wiki/projects/index.md');
}

// ---------- 原样拷贝的静态内容 ----------
const verbatim = [
  ['assets', 'assets'],
  ['images', 'images'],
  ['notes', 'notes'],
  ['search.json', 'search.json'],
];
for (const [from, to] of verbatim) {
  const src = path.join(SITE, from);
  const dst = path.join(SRC, to);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dst, { recursive: true });
    console.log('verbatim:', to);
  } else {
    console.log('MISSING verbatim:', from);
  }
}

// ---------- scaffolds ----------
fs.mkdirSync(path.join(SRC, '..', 'scaffolds'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'scaffolds/post.md'), '---\ntitle: {{ title }}\ndate: {{ date }}\ntags:\ncategories:\n---\n');
fs.writeFileSync(path.join(ROOT, 'scaffolds/page.md'), '---\ntitle: {{ title }}\ndate: {{ date }}\n---\n');
console.log('scaffolds done');
