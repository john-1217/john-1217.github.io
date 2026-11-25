# blog-source

易中的博客源码工程（Hexo + Stellar 主题），发布到 [john-1217.github.io](https://john-1217.github.io/)。

## 写新文章

文章放在 `source/_posts/<slug>.md`，文件名即 URL slug（`/posts/<slug>/`）：

```markdown
---
title: 文章标题
date: 2026-11-25 10:00:00
categories:
  - 分类
tags:
  - 标签
description: 一句话摘要（展示在首页卡片与 SEO 描述中）
---

正文，支持标准 Markdown。
```

可选字段：

- `collection: { profile: topic, id: writing }` — 归入专栏（`source/_data/topic/` 中定义）
- `updated: 2026-11-25 10:00:00` — 更新时间

## 发布

```bash
git add -A && git commit -m "new post" && git -c http.version=HTTP/1.1 push origin main
```

推送到 `main` 后 [GitHub Actions](.github/workflows/deploy.yml) 自动构建部署，约 1 分钟上线。
注意 push 需要 `http.version=HTTP/1.1`（HTTP/2 会有帧错误）。

## 本地预览

```bash
npm install
npx hexo server        # http://localhost:4000
npx hexo generate      # 产物输出到 public/
```

## 目录结构

| 路径 | 说明 |
| --- | --- |
| `source/_posts/` | 文章 |
| `source/about/`、`source/friends/` | 独立页面 |
| `source/wiki/projects/` | wiki 项目文档页 |
| `source/_data/wiki/` | wiki 项目元数据（卡片名称/封面/路由） |
| `source/_data/topic/` | 专栏定义 |
| `source/assets/`、`source/images/` | 图片资源 |
| `source/notes/`、`source/search.json` | 自定义页面 / 搜索索引 |
| `_config.yml` | 站点配置（标题、URL、永久链接等） |
| `_config.stellar.yml` | Stellar 主题配置（导航、侧栏、页脚等） |

## 其他

- 主题：[Stellar](https://github.com/xaoxuu/hexo-theme-stellar) 2.0.0，通过 npm 安装
- 旧版纯构建产物保留在 `master` 分支，仅用于回滚
- `tools/reverse.mjs` 是迁移时从旧构建产物逆向源码的一次性脚本，日常写作不需要
