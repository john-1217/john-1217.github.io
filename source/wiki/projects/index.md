---
title: 测试用例智能体
collection:
  profile: wiki
  id: projects
updated: 2026-11-24 08:00:00
description: "这里收录我做过的代表性项目，包含项目背景、我的角色与技术实现，持续补充中。 提示这是项目文档的起始页，后续可以把每个项目拆成单独页面，在左侧目录树中组织阅读顺序。"
---

<h2 id="tcg">Test Case Generator · 用例生成智能体</h2>

一个把「读需求、写用例、整理 Excel」自动化掉的开源平台：上传需求文档，LangGraph 工作流自动完成需求分析、测试策略、用例生成和覆盖总结，产出结构化 Markdown 用例表与 Excel 文件。

-   **四阶段工作流**：需求分析 → 测试策略 → 用例生成 → 覆盖总结，每阶段产物独立可审计
-   **人机澄清（HITL）**：需求信息不足时进入待澄清状态，补充说明后继续，而不是硬编用例
-   **知识库 RAG**：业务规则文档向量化后按需求模块检索注入，附检索测试页验证知识质量（BM25 + LLM 引用溯源）
-   **多模型接入**：OpenAI / Gemini / DeepSeek / Kimi / OpenRouter，界面化配置与连接测试

{% note color:cyan 我的角色 独立完成架构设计与全部开发：LangGraph 工作流编排、文档解析、知识库检索、Vue 3 管理界面与 Docker 部署。 %} {% note color:purple 技术栈 FastAPI · LangGraph · ChromaDB · Vue 3 + Element Plus · LangSmith 可观测 · Docker %}

开源地址：[github.com/john-1217/test\_case\_generator](https://github.com/john-1217/test_case_generator)　·　设计思路见文章 [《用例生成智能体：从需求文档到测试用例的开源实践》](/posts/introducing-test-case-generator/)
