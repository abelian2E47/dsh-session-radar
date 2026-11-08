# dsh-session-radar

[中文](#中文) · [English](#english)

把并行会话收进一条常驻雷达：实时状态、当前步骤、等待时长、卡住告警、token 与上下文；点进会话能展开对话树，逐轮看清这一轮 AI 干了什么、改了哪些文件，还能切到全屏、跳到任意一轮、从任意一轮分叉出新会话，并在可折叠的会话树里顺着分叉与子代理走动；统计信息页的区间可以任意自定义，token 只统计区间内真正花掉的部分，还能只挑几个工作区或会话来看；时长按「并行只算一次」的总耗时计算。

<img alt="会话雷达总览" src="docs/screenshots/overview.png" width="900" />

## 中文

### 功能

- **右侧雷达与快捷栏**：右侧边缘常驻一枚雷达按钮，显示运行中与等待中的会话数；下方快捷栏自动收纳运行中、待验收和已钉住的会话与工作区，鼠标靠近即展开，点一下直接切到那个会话——快捷栏只负责切换会话，不会顺手把雷达面板打开。
- **左侧工作区栏置顶**：正在运行、已固定以及你当前正在看的那个会话会顶到左侧工作区栏最上面，点标题即可收起或展开，收起时只留一行摘要；换到别的会话后，那个不再运行的会话会自己掉出去。它和右侧快捷栏一样能在设置里一键关掉。
- **实况矩阵**：进行中与最近会话以卡片矩阵展示，每张卡片带轮次 / 步数 / 工具 / 产物四格仪表、token 与上下文占用、本轮与总计耗时；支持按状态、时间、工作区、模型筛选，以及按最近活动 / 最耗时 / token 最多排序。
- **异常一眼看到**：等待审批或回答的会话标出「已等了多久」；一次工具调用跑过安全区间（默认 5 分钟，可在设置里自填 1–120 分钟）才会标为「疑似卡住」，长构建和大改动不再动不动就报警，运行时静默同样按这个区间判定。卡片还给出本轮 token 吞吐与最耗时间的工具。
- **对话树**：点进会话即成树，**全部轮次都在**——不再只给最近十几轮，长会话也能从头看到尾。每轮一行摘要：这一轮改了几处代码、执行了几次、读了哪些文件、有没有失败；展开某轮可看完整的用户指令、AI 回复与 thinking 原文（长消息先给一段，点「展开全文」再看完整原文，不再被截断），以及本轮改动的文件清单。树顶有轮次轨道，点数字直接跳到那一轮，也可以用上一轮 / 下一轮逐个翻；一键全部展开，或把整棵树复制成 Markdown 报告。万一还没读到轮次，这一栏不会消失，会说明原因并给一个「重新读取」按钮。
- **任意一轮分叉**：展开某一轮，底部的「从这一轮分叉」会在该轮日志末尾切开一条新会话——新会话继承到这里为止的全部对话，标题自动带后缀，可以接着换一条思路往下走；分叉完成后详情留在原会话，会话树里立刻多出一条带「新」标记的分支，点「打开新会话」即跳过去。
- **点一下开侧栏，点两下弹全屏**：在实况页的会话卡片（或列表行）上单击一次，详情就在右侧栏打开；在同一处双击则直接弹出全屏浮层（会先把那个会话选到侧栏），也可以点详情右上角的展开按钮切换。按 Esc 退出全屏回到侧栏。面板与小卡片带一点点淡入和缩放的动效，并尊重系统的「减少动态效果」设置。
- **会话树**：详情里的会话树从最早的祖先会话铺到最下游，分叉与子代理各带标签、按最近活动排序、可逐层折叠；每一行都能直接打开或固定到快捷栏，正在看的那个会话会高亮。分叉关系直接读 DSH 自己记录的来源会话（不只是子代理的归属），所以从某轮分叉出来的副本也会如实挂进树里；没有分叉的会话不会再让这一栏凭空消失，而是写一句「还没有分叉或子代理」并提示怎么造一条。
- **统计信息**：活跃度账本按当日 / 日 / 周 / 月聚合，区间可以任意自定义（起止日期 + 小时 / 天 / 周 / 月粒度）。token 花费只算区间内的花费——按每一轮实际发生的时间归属，跨天或跨出区间的轮次只计入落在区间内的部分，不拿会话总量凑数；统计范围也可以手动勾选，只统计某几个工作区或某几个会话，「工作区」页签每张卡片上的「统计」按钮会直接把该工作区带进来。时长默认按会话运行区间的并集计算，并行会话不重复计时，可随时切回累计口径；「会话时间耗时」面板默认折叠，需要时展开看每个会话的时间轨道。
- **工作区与归档**：按工作区聚合历史会话，支持批量归档、批量恢复与永久删除（删除前二次确认）。

### 截图

<img alt="右侧雷达与快捷栏" src="docs/screenshots/radar.png" width="640" />

<img alt="会话详情与对话树" src="docs/screenshots/conversation-tree.png" width="900" />

<img alt="展开一轮，读完整的指令、回复与改动文件" src="docs/screenshots/conversation-round.png" width="900" />

<img alt="从任意一轮分叉，并在会话树里看到新分支" src="docs/screenshots/conversation-fork.png" width="900" />

<img alt="全屏查看会话详情" src="docs/screenshots/conversation-fullscreen.png" width="900" />

<img alt="统计信息与自定义区间" src="docs/screenshots/statistics.png" width="820" />

<img alt="只统计选中的工作区或会话" src="docs/screenshots/statistics-scope.png" width="820" />

<img alt="工作区" src="docs/screenshots/workspaces.png" width="900" />

### 安装

打开你实际使用的 DSH 实例，在 **插件 → + 添加插件** 中粘贴插件发布包地址：

~~~text
https://github.com/abelian2E47/dsh-session-radar/releases/latest/download/dsh-session-radar-1.1.3.tgz
~~~

安装完成后重启 DSH，或等插件配置热重载生效。打开 Web GUI 后：

1. 左侧导航出现「会话雷达」。
2. 右侧边缘出现竖向雷达入口；有运行中、待验收或钉住的会话时，入口下方出现快捷栏。
3. 用快捷键唤起或切换：

| 操作 | 快捷键 |
| --- | --- |
| 打开 / 关闭右侧雷达 | Ctrl+Alt+Shift+R |
| 在固定会话之间切换 | Alt+] / Alt+[ |
| 固定或取消固定当前会话 | Alt+P |
| 退出全屏会话详情 | Esc |
| 单击 / 双击会话 | 打开侧栏详情 / 全屏详情 |

### License

MIT

---

## English

An always-on radar for your parallel DSH sessions: live status, current step, wait time, stall alerts, tokens and context. Open any session to unfold a per-round conversation tree that says in one line what that round did and which files it changed, switch it to full screen, jump straight to any round, fork a new session from any round, and walk a collapsible tree of forks and subagents. The statistics page takes an arbitrary date range, counts only the tokens actually spent inside it, can be narrowed to picked workspaces or sessions, and counts duration as wall-clock time instead of the sum of every session.

<img alt="Session radar overview" src="docs/screenshots/overview.png" width="900" />

### Features

- **Right-edge radar and quick bar**: a pinned radar button plus a quick bar that keeps running, unread and pinned sessions and workspaces one click away — clicking an item switches straight to that session, it never opens the radar panel as a side effect.
- **Pinned to the top of the workspace column**: running and pinned sessions — plus whichever session you are reading right now, even if it is idle — sit above the workspace tree in the left column, with a header that collapses or expands the list and a one-line summary while collapsed. They drop out on their own once you switch away, and the whole strip can be switched off in the settings like the quick bar.
- **Live matrix**: running and recent sessions as a card matrix with turns / steps / tools / deliverables, token and context meters, and per-turn plus total duration; filter by status, time, workspace and model, or sort by recent activity, longest, or token count.
- **Signals that matter**: approval and answer waits report how long they have been pending, and a session is only flagged as stalled once a single tool call passes the safety window (five minutes by default, freely set between 1 and 120 minutes in the settings) — long builds and heavy edits stop raising false alarms, and silence while running is judged against the same window. Each card also shows the current token throughput and the most expensive tool.
- **Conversation tree**: every round is on screen — no longer just the last dozen, so a long session reads from the first round to the last. Each round keeps its one-line summary (how much code changed, how many commands ran, which files were read, where it failed), and expanding it shows the whole prompt, the model's reply and its thinking verbatim — long messages start with a readable slice and unfold to the full body with one click instead of being cut off. A round rail jumps straight to any round (or steps through them), expand-all flattens the tree, and one click copies the whole tree as a Markdown report. If the rounds have not arrived yet the section stays put with the reason and a reload button.
- **Fork from any round**: expanding a round reveals a fork action that cuts a new session at that round's last log event. The new session inherits the conversation up to that point, gets a "copy" suffix in its title, and is free to take a different route; the panel stays on the session you forked from, the tree gains a branch tagged 新, and one click opens the new session.
- **One click for the side panel, two for the dialog**: a single click on a card in the live view (or on a row) opens the detail in the right column; a double click on the same spot opens the full-screen dialog for that session straight away — it is selected into the side panel first, so closing the dialog leaves you there. The expand button in the header toggles the same thing, and Esc drops back to the side panel. Panels and cards fade and scale in slightly, and the motion is skipped when the system asks for reduced motion.
- **Session tree**: the detail panel draws the lineage from the topmost ancestor down through every fork and subagent, labelled by kind, ordered by recent activity and foldable level by level. Forks are linked through the source session DSH itself records (not only subagent parentage), so a branch cut from a round shows up in the tree, and a session with no branches keeps the section on screen with a one-line hint instead of vanishing. Any row can be opened or pinned, and the session you are reading is highlighted.
- **Statistics**: the local activity ledger rolls up by day / week / month, the window can be any start and end date with hour / day / week / month grains. Token spend counts only what was spent inside that window: every round is attributed to the time it actually covered, so a round that crosses midnight — or runs past the edge of the window — contributes just the part that happened inside it instead of the session's lifetime total. The scope can be narrowed by hand to a few workspaces or sessions, and the "stats" button on every workspace card hands that workspace straight over. Duration is the union of session spans (overlapping sessions are counted once) with a one-click switch to the cumulative sum, and the session-timeline panel starts collapsed.
- **Workspaces and archive**: grouped history sessions with batch archive, restore and permanent delete behind a confirmation.

### Screenshots

<img alt="Right-edge radar and quick bar" src="docs/screenshots/radar.png" width="640" />

<img alt="Session detail and conversation tree" src="docs/screenshots/conversation-tree.png" width="900" />

<img alt="One round unfolded: the full prompt, reply and changed files" src="docs/screenshots/conversation-round.png" width="900" />

<img alt="Forking from any round, with the new branch in the session tree" src="docs/screenshots/conversation-fork.png" width="900" />

<img alt="Full-screen session detail" src="docs/screenshots/conversation-fullscreen.png" width="900" />

<img alt="Statistics with a custom window" src="docs/screenshots/statistics.png" width="820" />

<img alt="Statistics narrowed to picked workspaces or sessions" src="docs/screenshots/statistics-scope.png" width="820" />

<img alt="Workspaces" src="docs/screenshots/workspaces.png" width="900" />

### Install

Open the DSH instance you actually use, then paste the release URL in **Plugins → + Add plugin**:

~~~text
https://github.com/abelian2E47/dsh-session-radar/releases/latest/download/dsh-session-radar-1.1.3.tgz
~~~

Restart DSH afterwards (or let the plugin config hot reload). In the Web GUI:

1. "会话雷达" (Session Radar) appears in the left navigation.
2. A vertical radar entry shows up on the right edge; the quick bar appears below it once there are running, unread or pinned sessions.
3. Shortcuts:

| Action | Shortcut |
| --- | --- |
| Toggle the right-edge radar | Ctrl+Alt+Shift+R |
| Cycle pinned sessions | Alt+] / Alt+[ |
| Pin or unpin the current session | Alt+P |
| Leave the full-screen detail | Esc |
| Single / double click a session | Side-panel detail / full-screen detail |

### License

MIT
