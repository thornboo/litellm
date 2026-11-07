# 多语言实施记录

更新日期为 2026-11-07。本文记录前两阶段的代码与验证进度，范围以[多语言实现方案](./i18n-plan.md)为准。

## 第一阶段代码

已新增 `zh-CN.json`，覆盖方案中约定的 16 个基础资源分组，共 681 个条目。比原定 680 个条目多一项语言切换刷新提示，英文资源中也增加了对应条目。

| 范围 | 当前实现 |
| --- | --- |
| 语言注册 | `LOCALES` 注册 `zh-CN` 异步加载器，界面显示为“简体中文” |
| 语言入口 | 账号菜单继续使用现有组件，登录页在凭据表单下方复用同一组件 |
| 语言偏好 | 沿用 `litellm_language`，首次保持英文，保存中文后由现有 Provider 恢复 |
| 回退 | 未覆盖的业务资源继续显示英文，资源加载失败时可明确选择英文并重置保存的偏好 |
| 刷新提示 | 中英文均提示切换会刷新页面并丢失未保存的输入 |
| 基础翻译 | 导航、页面简介、账号菜单、登录、初始化、修改密码、首页、通用组件、提示、主题和 API 参考 |
| 中文搜索 | 自动化测试证明命令面板可搜索中文导航，并保留实际路由和 AI/SI 术语处理 |
| 登录行为 | 自动化测试证明中英文提交参数相同，选择语言不会提交登录表单 |

13 个条目有意保持原值，包括 9 个格式模板、Lens 名称、两处 Ctrl K 快捷键以及 SSO 缩写。插值变量和富文本标签已与英文逐项比较。英文原有文案只新增刷新提示，没有替换成中文。

金额格式、币种、时区、API 字段、权限和登录请求内容均未修改。本次没有修改后端、Rust、依赖版本或生成的接口类型。

## 第一阶段自动化验证

检查在独立的临时 Docker 容器 `litellm-i18n-checks` 中串行执行，没有安装宿主机依赖。测试源文件显式复制到临时容器，因为现有开发同步规则排除了测试文件。

| 检查 | 结果 |
| --- | --- |
| i18n 与命令面板单元测试 | 4 个文件，56 项通过 |
| Provider、语言选择器及既有登录测试 | 3 个文件，23 项通过 |
| 登录表单集成测试 | 1 个文件，8 项通过 |
| 修改文件的 ESLint | 通过 |
| 修改文件的 Prettier | 已检查并格式化 |
| TypeScript 全项目生产配置检查 | 未完成，1.5 GiB 与 2.5 GiB 进程堆均超出内存上限 |
| 本次三个应用代码入口及依赖的类型检查 | 通过，继承生产配置，仅收窄入口范围 |

共 87 项运行时测试通过，包含实际中文加载、只读一次的标签、英文回退、复数计数、分页插值、中文必填校验、登录载荷、语言保存和刷新操作。测试保留了现有 Vitest 环境 API 的弃用提示。

测试过程中发现中文资源加载失败后，原有选择器会把“当前显示英文”视为无需操作，无法清除保存的中文偏好。本次修复同时比较显示语言和保存的偏好，并增加对应回归用例。

在临时检查容器中恢复原选择条件后，该回归用例失败，恢复本次代码后通过。这个对照没有修改宿主机源码或正在运行的开发服务。

收窄类型检查的入口为 `languages.ts`、`LanguageField.tsx` 和 `LoginPage.tsx`，其余编译选项继承 `tsconfig.production.json`，临时配置补充容器内的类型定义搜索路径。此结果不能代替尚未完成的全项目检查。

一次验证未与开发服务隔离，触发前端容器内存上限并导致退出，随后已恢复前端。后续检查改为独立容器串行执行，没有扩大 Colima 配额或修改现有服务的资源配置及全局工具链。

## 第二阶段代码

本批新增 5,866 个中文资源条目，累计 6,547 个条目、105 个顶层分组。第一阶段的 681 个条目保持原值。分组仍共用现有 `translation` 命名空间。

| 模块 | 新增分组 | 条目 |
| --- | --- | --- |
| 密钥列表、详情、创建、生命周期及权限 | 15 | 650 |
| 模型创建与部署定价 | 3 | 1,099 |
| 模型管理、凭据、定价与透传端点 | 24 | 724 |
| 用量、日志与相关设置 | 8 | 1,283 |
| 团队、项目、预算与访问组 | 10 | 993 |
| 用户、组织、通用选择器与成本管理 | 27 | 1,067 |
| Switchyard 配置与编辑表单 | 2 | 50 |

本批有 105 个资源条目刻意保持英文或技术模板原值，包括费用 CSV 报表的全部 21 个标题与列名、分类提示词、请求示例、协议缩写和计量单位。PDF 报告中的展示说明已翻译，币种、金额、单位和计算逻辑保持不变。

本批在英文资源中新增 52 个展示键，用于原来直接写在 Switchyard 组件中的文案、校验提示，以及密钥和团队的展示名。既有英文资源值保持不变。

`SwitchyardConfigFields` 与 `SwitchyardRouterForm` 的标签、占位提示、校验和保存状态现已使用翻译键。实际的 `efficient_first`、`capable_first`、`llm`、`decision`、`json_schema`、`json_object` 等枚举不变，管理员填写的分类提示词、决策指令和工具名称仍按原值保存。

同时修复 `estimateTooltips` 将原始 `key`、`team` 标识直接插入中文句子的问题。用量页面、空筛选说明、导出范围和节省金额空状态也改为插入翻译后的实体名称。函数输入类型和 API、查询、筛选、导出范围等业务值不变。

英文回退测试改为使用明确的部分翻译样本，避免把某个真实业务分组尚未翻译写成永久假设。新增测试覆盖核心页面中文文案、CSV 导出名、密钥创建载荷、Switchyard 配置与提示词保存。

## 第二阶段自动化验证

检查使用独立临时容器 `litellm-i18n-phase2-checks` 串行执行，不在正在运行的开发容器内执行测试，也不修改现有服务配置。

| 检查 | 当前结果 |
| --- | --- |
| i18n、命令面板、Switchyard 配置和 Token 估算单元测试 | 6 个文件，92 项通过 |
| 密钥创建集成测试 | 88 项通过，1 项既有 expected fail |
| 自动路由编辑集成测试 | 69 项通过 |
| 自动路由创建集成测试 | 119 项通过 |
| 用量页面和导出控件组件测试 | 3 个文件，86 项通过 |
| 修改文件的 ESLint | 0 个错误，32 个既有代码位置的警告 |
| 修改文件的 Prettier | 通过 |
| Switchyard、估算提示及语言入口依赖的类型检查 | 通过，继承生产配置并限定入口 |
| 追加的用量与导出显示修复的类型检查 | 通过，继承生产配置并限定入口 |

本轮共 454 项测试通过，另有 1 项源码中原有的 `it.fails` 用例，涉及打开但未填写的可选设置字段。没有修改其预期、抑制规则或检查阈值。测试仍包含既有 Vitest 弃用提示、部分旧测试的 React act 提示和模拟异常输出。

实体名插值回归用例还在临时容器中做了前后对照，原版 `estimateTooltips` 令两项中文回归失败，本次代码令两项通过。未在宿主机源码或运行中的开发服务上恢复旧实现。

自动路由测试依赖仓库中的 `litellm/proxy/public_endpoints/autorouter_presets.json`。临时容器只复制了 Dashboard，首次收集因缺少该目录而失败，补充这份真实测试输入后继续检查，没有修改测试预期或业务代码。

附加的用量类型检查需要 Next 的图片模块声明，临时配置通过 `files` 显式纳入已安装的 `next/image-types/global.d.ts`，对应正常项目中由 `next-env.d.ts` 引入的声明。使用 `files` 避免声明被生产配置对 `node_modules` 的排除规则过滤。没有向项目添加类型抑制、替代图片类型或修改编译配置。

两组入口及其依赖的类型检查均已通过，全项目类型检查仍保留第一阶段记录的内存限制，没有重试完整检查。关键运行时命令如下，均在上述临时容器的 `/workspace` 内执行。

```sh
npx vitest run --project unit --maxWorkers=1 src/i18n/languages.test.ts src/i18n/locales.test.ts src/i18n/formats.test.ts src/components/CommandPalette/utils.test.ts src/components/add_model/switchyard_config.test.ts src/components/templates/estimatedOutputTokens.test.ts
npx vitest run --project integration --maxWorkers=1 src/components/add_model/add_auto_router_tab.integration.test.tsx src/components/edit_auto_router/edit_auto_router_modal.integration.test.tsx src/components/organisms/create_key_button.integration.test.tsx
npx vitest run --project component --maxWorkers=1 'src/app/(dashboard)/usage/_components/components/EntityUsage/EntityUsage.test.tsx' src/components/EntityUsageExport/ExportTypeSelector.test.tsx src/components/EntityUsageExport/UsageExportHeader.test.tsx
```

## 手动查看与未完成范围

用户已明确要求只修改代码，页面效果自行查看。因此本次不继续操作浏览器，不执行生产构建或部署，真实浏览器效果与生产产物尚未验收。

登录页可在凭据表单下方选择 Language，切换到“简体中文”后页面刷新。已登录时可从侧栏底部的账号菜单选择语言。选择会在当前浏览器中保存，切换回 English 使用同一个入口。

核心管理模块的第二批中文资源已补齐，第三、第四阶段仍未完成。Chat、Playground、MCP、Guardrails、Agents、策略和部分管理设置等高级页面仍会按缺失键机制回退英文。资源条目数不能代替实际页面覆盖率，当前阶段不代表全站汉化完成。

后续推进高级页面、固定英文遗漏以及遗留的日期和数字展示。视觉布局、实际退出登录后的语言恢复、浏览器加载失败表现与生产构建，保留为后续手动或发布验收项。

已确认的日期展示遗漏包括 `costOptimizationUtils.ts` 中固定 en-US 的月份，以及 `advanced_date_picker.tsx` 的 Moment 英文月份和 `at` 字样。后续单独处理显示语言，并验证既有本地时间、UTC 汇总和请求日期边界，本批不改变这些行为。
