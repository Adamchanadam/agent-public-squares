# QC 觸發詞彙（分層 QC 單一真源）

> 本檔是 QC 觸發詞彙的單一真源。`docs/qc/governance-map.html` 是公開參考卡；如內容不一致,以本檔為準。
> 不可手動編輯 `AGENTS.md`（kit-managed core），所以本詞彙的啟動載入路徑經 `dev/RULE_PACKS.md` 的 routing 行：任務含觸發詞即載入本檔。

## 設計意圖

過往「全套 QC / 完整 QC / 跑驗收 / 整體 audit」此類含混詞,容易令人類與 AI 對驗收範圍理解不一致,每次都要重新列明範圍。三級觸發詞彙解決三件事：

1. **範圍明確** — 每個級別的覆蓋、時間、驗收、失敗處理均須明確列出
2. **嵌套自動** — 較高級別自動包含較低級別,不可在較高級別下省略較低級別
3. **反問規矩** — 含混詞觸發停手反問,AI 不可憑感覺解讀範圍

此套詞彙**不重複定義**既有 QC 機制（kit doctor / rule packs / plan acceptance / APS startup registration / Bridge Pack runtime / tool self-check / 五區段紀律），只將它們收口成三個觸發入口。

## 三 tier 速覽

| Tier | 觸發 keyword | 時機 | 時間預算 |
|---|---|---|---|
| 🟢 快檢 | `跑快檢` / `quick-check` / `qa-gate` | session 收工前 / commit 之前 | < 2 分鐘 |
| 🟡 外發前檢 | `跑外發前檢` / `release-check` / `handover-verify` | 推送遠端 / 分享計劃 / 跨工作目錄傳檔之前 | 5-10 分鐘 |
| 🔴 全面檢 | `跑全面檢` / `full-check` / `full-audit` | 跨機往返測試 / PROTOCOL.md 改版 / 治理工具重大升級之前 | 30+ 分鐘 |

---

## 🟢 快檢

**別名**：`跑快檢` / `quick-check` / `qa-gate`

**時機**：
- 每個 session 收工前
- 五區段執行完之後的基線驗證
- commit / amend 之前

**覆蓋**（4 項）：
1. `npx @adamchanadam/agent-handoff-kit doctor` 報 `status: passed`
2. `git status` 與 `dev/SESSION_HANDOFF.md` Workspace Identity 的 commit / uncommitted 敘述一致
3. 當次 session 內所有 plan / 五區段的 grep acceptance test 全部命中
4. 如有 `tools/*.ps1` 改動：`[scriptblock]::Create((Get-Content tools/*.ps1 -Raw))` parse-check + `-DryRun` against demo workspace（驗 idempotency-skip path）

**驗收**：四項全部通過。任何一條失敗,不可宣稱 session 完成。

**時間**：< 2 分鐘

**失敗處理**：修正源頭、重跑；不可只以「仍有手尾」帶過。

---

## 🟡 外發前檢

**別名**：`跑外發前檢` / `release-check` / `handover-verify`

**時機**：
- 將 commit push remote 之前
- 將教學頁、維護者頁、QC 卡片或 release note 分享予外部持份者之前
- 將 Bridge Pack、starter pack、或任何 APS 設置 / 交接指引經 WhatsApp / Drive / Email 傳予協作夥伴之前
- 任何「物件離開本工作目錄」之前

**覆蓋**：快檢 4 項全部 + 9 項：
1. **跨工作目錄佔位符審核** — 確認任何示例值（demo workspace 的 slug、舊 project 名、specific 路徑、specific person name）不出現在通用 user-facing prompt / template 的 default 位置。Grep 找出命中後逐項判斷為 A-class（明確標示為示例 / 歷史 / fixture,可保留）或 B-class（滑入 default position,須改為 placeholder）。例：本 repo 的 MVP 試演曾使用 demo slug `mpedu_plus_branding`,跑 `grep -i mpedu` 應全部命中於 A-class 歷史 doc（MVP plan / verification / SESSION_LOG）或 example-labeled 段落,並在 README、public HTML、CLI prompt、starter pack、skill runtime、protocol templates 等 active template surface 零 B-class 命中。
2. **跨面交叉閱讀** — README ↔ `docs/index.html` ↔ `docs/guides/index.html` ↔ walkthrough ↔ maintainer HTML ↔ skill spec ↔ CLI output 對同一 procedure 的敘述一致；單一規則只留在 SSOT,其他位置只作引用或鏡像。
3. **HTML preview 視覺確認** — 入口頁 / 教學中心 / walkthrough / maintainer page / governance-map 經瀏覽器 render clean；若 walkthrough 含 SVG 流程圖或能力清單,須確認可見、可讀、無遮擋、無 console error。
4. **PII / secrets sweep** — `grep -iE "api[_-]?key|password|token|secret|credential"` 各 user-facing doc + tool，預期 0 命中
5. **語氣與用語紀律** — 內部 codes（`Block 4*` / `Bridge Pack` / `round-trip` / `PROTOCOL.md`）不可作為句子主體；中英並用的 user-facing string 須一致；公開通用面不得把 specific person name 當成 hardcoded default,只可作明確示例、fixture 名或歷史證據。
6. **新安裝與升級路徑檢查** — 若 npm package 內 `skills/aps/**`、CLI 或 setup wording 有變,外發前檢必須同時驗證兩條路徑:新安裝可用 `npm install --save-dev @adamchanadam/aps@latest` + `npx aps init`;既有項目可用 `npm install --save-dev @adamchanadam/aps@latest` + `npx aps upgrade` 備份並刷新 skill、更新橋接與註冊、保留既有 packet / outbox / ack / 共用 Drive 資料夾協定檔。測試未發布候選版時,還要核對 UAT 的 `npx aps --help` / `doctor` 是否實際顯示候選版本;若仍讀 npm latest,必須先安裝本地 package 或改用本地 CLI 路徑。只「skip existing skill」不可通過。此外,凡 `skills/aps/SKILL.md` frontmatter `description` 有改動,外發前必須用 node 量度其字符數並確認 ≤1024,並確認 frontmatter 為合法 YAML(description 內避免未加引號的冒號 `: `):codex 載入時對「超過 1024 字符」或「YAML 不合法」的 description 都會硬性拒載,Claude 端兩者都不會報錯,所以只靠 Claude 載入成功不足以通過;一旦正式 skill 拒載,codex 會改讀舊 backup skill,令 UAT 實際走到舊版本。另外,凡改動 `aps init` 的輸入驗證,外發前必須用一個含合法特殊字符的真實路徑(例如含方括號 `[Project]` 的 Google Drive 路徑、含空格或 `@` 的 macOS CloudStorage 路徑)跑 `aps init --dry-run`,確認 Hub root 驗證不會把合法路徑誤判為佔位符。佔位符防呆只應擋 `<...>` 角括號與 `...` 省略號;`[ ]` 在真實檔案路徑中合法,不可拒絕(snake_case 的 `--project` / `--agent-id` 欄位仍由 validateSnakeCase 擋方括號)。
7. **交接命名與品牌版本分流檢查** — 掃描 `bin/aps.js`、`skills/aps/**`、README / public docs 是否把 APS packet 與 Agent Handoff Kit session handoff 混稱。用戶只說「交接包」時必須有澄清路由;APS 新 packet 預設 level / topic 不得使用會誤導為 session handoff 的名稱。APS skill 不得輸出 Agent Handoff Kit 啟動卡,不得把 `APS Hub doctor v<版本>` 當作 Agent Handoff Kit 版本。舊資料相容可保留,但新預設不可繼續漂移。
8. **雲端支援與產品路線邊界檢查** — 公開文檔、CLI prompt、skill wording 必須一致:已驗證主路徑是 Google Drive,但不固定磁碟機代號;Dropbox / OneDrive / 其他同步資料夾只可列為未正式驗證的實驗路徑,不得由 AI 主動推薦為正式支援。核心設置不得要求 Google Drive API、Dropbox API、OneDrive API、OAuth app、API key 或雲端開發者專案。近期主線是 Reliable Pair first;Contacts selector / 選對方體驗已延後,不屬 0.2.7 目標。真正多人平台與多收件人 packet 屬延後路線;`_notify`、`aps watch`、桌面通知、OS／AI 平台排程、背景自動檢查與 Telegram bot 自動代發屬**非 APS 範圍**(roadmap 第五節),不是延後路線。兩者都不可寫成已支援。

9. **User-facing 文檔與教學層內容/產品模型深審(任何 user-facing 頁或 skill 改寫、或 `bin/aps.js` 用戶可見行為改動後必跑)** — 凡 `README.md`、`docs/index.html`、`docs/guides/**.html`、`skills/aps/SKILL.md`、`skills/aps/references/setup-dialogue.md` 有非純樣式內容改動,或 `bin/aps.js` 改動用戶可見行為,外發前必須對**全部** user-facing 頁與 skill 教學層做一次內容深審,不可只驗改過嗰頁/檔嘅結構(標記 / 連結 / `<section>` 配對 / `description` 長度 / YAML / 觸發詞):(a) **產品模型一致** — 公開框架必須對齊目前已出貨模型「一個 project 可有多位協作對象,每次交接仍一對一」;sibling 頁之間嘅模型描述必須一致,不得一頁已寫多 peer 而另一頁仍隱含「淨係兩個人 / 淨係 A↔B」。(b) **圖文與能力對齊** — 流程圖、能力清單、示例必須對齊正文 + CLI + skill 已出貨行為;凡 CLI 已支援揀收件對象(`publish --to`),流程圖必須顯示「揀今次交俾邊位對象」呢一步,不可畫成單一匿名對方。(c) **用語一致** — 同一概念喺各頁用同一詞;改用語要全頁一次過改,不可一頁新一頁舊。概念性兩人框架掃描不可只靠關鍵字:除舊版本號 / 舊角色字外,須人手抽驗「兩邊 AI」「雙方做同一」「對方(作唯一對象)」「A→B 死線流程圖」等隱含框架。(d) **行為真源對齊(CLI ↔ skill ↔ 公開頁)** — `bin/aps.js` 是用戶可見行為的真源;skill 與公開頁是教學層,必須跟真源。凡 CLI 改動「設置互動問題數、必填/可選 flags、會否生成檔案(如 starter pack)、命令契約(如 items 申報)、退出碼或路由語義」,外發前必須逐項對讀「CLI 實際點做」vs「`skills/aps/SKILL.md` + `references/setup-dialogue.md` + 公開頁點教」,確認教學層無一處仍教 CLI 已唔再做嘅舊行為。**結構檢查(`description` ≤1024 / YAML 合法 / 觸發詞齊 / section 配對 / 連結)全部通過,不代表行為模型已對齊;呢兩類檢查不可互相代替。** 此項源於兩次同源實測漏洞:其一,S44/S45 入口頁已轉多 peer 而 walkthrough 仍純兩人;其二,0.2.13 第一段 CLI 已轉三問 / items / 邀請時生 starter,而 skill 仍教五問 / init 生 starter —— 兩次嘅 description 長度、YAML、觸發詞等結構檢查全部通過,但行為模型已漂移。
   **分階段落地閘(blocking):** 若 CLI 行為改動分階段落地(CLI 先改、skill / 公開頁後補),未對齊期間必須喺 `dev/SESSION_HANDOFF.md` Risks 與 release gate 明文標記為 blocking;skill / 公開頁追上並通過本(d)項對讀之前,外發前檢第 9 項不算通過,亦不可發佈。不可只靠 AI 記憶或 commit 註解追蹤。

**驗收**：快檢 + 上 9 項全部通過。任何一項失敗,handover 不可進行。

**時間**：5-10 分鐘

**失敗處理**：先修正源頭再重跑全套；失敗當刻停止 handover。

---

## 🔴 全面檢

**別名**：`跑全面檢` / `full-check` / `full-audit`

**時機**：
- 跨機真實往返測試之前
- APS PROTOCOL.md v1.0 → v1.1 之前
- 引入第三個 agent（N-party）之前
- 治理 kit major upgrade（例 v0.1.x → v0.2.x）之前
- 連續多輪 session 後想 reset audit baseline
- 用戶明示「跑全面檢」

**覆蓋**：外發前檢 13 項全部 + 6 項人工 / 跨工作目錄項：

1. **Class-C 跨工作目錄審核** — 共用 Drive 資料夾 `_hub/PROTOCOL.md` + 兩個 demo packs（`Demo_Agent_{Adam,Jay}_Public_Squares/dev/rules/aps-bridge.md`）的 procedural sections placeholder check。每個 audit 在 owning workspace 的 own session 跑（per AGENTS.md §2 active-project-root rule）；本 session 只收集結果。
2. **協定往返流程回歸測試** — 跑一次同機或隔離 workspace 模擬 setup → doctor → publish → inbox → consume → reply / revise → close / withdraw,確認協定行為無 regression。
3. **啟動可發現性與橋接行為 trace** — 驗證 `aps init` 寫入 Handoff Kit APS route、project-index registration、Bridge Pack、本地 config 後,新 session 可按 `AGENTS.md` 啟動讀序發現 APS；協定或 setup 改版尤其要做。
4. **五區段 + 自審紀律回顧** — 回看 last N 個 session 的自審紀錄；統計「caught vs missed」gap 比例；檢查是否存在系統性盲點。
5. **審核報告輸出** — 寫一份 markdown 於 `dev/qc/<YYYY-MM-DD>-full-audit.md`,含：健康結論 / 阻擋項 / cross-workspace 註記 / 重跑計劃。
6. **Spec-to-runtime 執行落差審核** — 對照 UAT / 實際 AI 行為、`skills/aps/SKILL.md`、bundled reference、CLI help / output。凡規格說「AI 應先讀設定 / 不應重做設置 / 不應 consume / 應先總覽 / 不應顯示 Agent Handoff Kit 啟動卡 / 發包前須確認內容、topic 與寫入行為 / 長正文須使用 `--body-file` 或等效安全輸入」,必須有實際入口或測試證據可觸發;若只停留在文案而已安裝 runtime 仍可能讀舊 skill,列為失敗。APS skill 觸發詞須同時測「教我用 APS」「教我用 AI Public Squares」「教我用 Agent Public Squares」三條入口;三者都應載入 APS skill,不得回答不確定、不得改走其他項目的 onboarding skill。同時必須量度 `skills/aps/SKILL.md` frontmatter `description` 字符數並確認 ≤1024:這是 codex 載入時的硬上限,超過即拒載正式 skill 並可能改讀舊 backup,令實測 AI 行為走到舊版本而誤判通過;Claude 端不會報此錯,故不可只靠 Claude 載入成功作準。另外必須做 CLI↔skill 行為對等核對:`skills/aps/SKILL.md` 與 `references/setup-dialogue.md` 所教的設置互動問題數、必填 / 可選 flags、會否生成 starter pack、items 等命令契約,必須與 `bin/aps.js` 當前實際行為一致;教學層仍教 CLI 已不再做的舊行為即列為失敗(`bin/aps.js` 為行為真源,見外發前檢第 9(d) 項)。

### APS 全面檢三條主線與橫切保障

對 Agent Public Squares 而言,🔴 全面檢不可只理解為「跑更多命令」。每次全面檢必須把上面 19 項歸入三條主線,並在審核報告逐項標示為「通過」「失敗」「受阻」或「接受風險」。橫切保障不是第四條主線,而是三條主線都必須覆蓋的防漏線：

1. **公開承諾一致性** — README / `docs/index.html` / `docs/guides/index.html` / walkthrough / maintainer page / `docs/qc/governance-map.html` / CLI help / skill spec 對「目前可用」「正在硬化」「目標體驗」「手動替代路徑」「npm publish 狀態」之描述一致。不得把未發佈或未實作能力寫成已可用。
2. **發佈前可信度** — 任何會離開本工作目錄的內容(README、GitHub Pages、npm package、Bridge Pack、starter pack、walkthrough、QC 卡片、維護者頁)須可被外部讀者理解並按當前狀態操作。若 npm registry、Pages live、GitHub repo 狀態未能核實,必須標為「受阻」或「未核實」,不可憑記憶通過。若本次全面檢一路做到外部 publish / release / push,完成聲明還必須讀回 npm latest、已發布 `npx ...@latest` 行為、GitHub release body、GitHub Pages、remote branch / tag,並確認本地治理狀態已完成 post-publish sync。
3. **協定實際運行正確性** — 共用 Drive 資料夾 `_hub/PROTOCOL.md`、Bridge Pack fixture、runtime workspace、outbox、ack、single-writer lane、packet version、startup pending 計算、revise / withdraw / close 行為、Handoff Kit APS route registration、project-index registration 須以實際操作記錄或對應工作目錄證據驗證。
橫切保障:

- **Handoff Kit 啟動可發現性** — APS 不可只寫 `dev/rules/aps-bridge.md` 與 `.aps/config.json`。全面檢須驗證 `aps init` 已在 `dev/RULE_PACKS.md` 註冊 APS route,並在 `dev/PROJECT_INDEX.md` 記錄 APS local bridge / config,令新 session 按 Agent Handoff Kit 啟動讀序後,可在用戶提到 APS / check Drive / Drive sync / conflict 時載入 APS。不得手改 `AGENTS.md` managed core。
- **新手 UX 主路徑** — 公眾教學、README、CLI next-step 與 skill spec 不可把 `npx aps publish` / `npx aps inbox` 等命令列當成非技術新手的日常主入口。主路徑必須是用戶向 AI 說自然語言,由 AI 讀設定、跑命令、整理上下文與解釋結果;命令列只可作可驗證備用、排錯或維護者路徑。全面檢必須把「教我用 APS」「教我用 AI Public Squares」「教我用 Agent Public Squares」列入實測入口,因為後者是用戶會自然說出的產品名變體。
- **新手宏觀理解與能力邊界** — walkthrough 必須在操作步驟前讓新手先理解 APS 如何運作、已具備甚麼、仍在硬化甚麼、刻意不做甚麼。若使用 SVG 流程圖或能力清單,全面檢須核對圖中流程與文字、CLI、skill、QC 真源一致,不得用視覺圖誇大自動化能力。凡 CLI 已支援揀收件對象(`publish --to`),流程圖必須顯示「揀今次交俾邊位對象」呢一步;各 user-facing 頁嘅產品模型(一 project 多 peer、每次一對一)描述必須一致,不得一頁多 peer、一頁純兩人。
- **一語交接自動化** — 日常發佈主體驗必須支援「幫我將當前任務整理成 APS 交接包給對方」這類一句指令。AI 應自動讀 `.aps/config.json`、跑 `doctor`、整理當前任務、補齊交接欄位、生成 topic、做完整性預檢,交給用戶 A 確認後才發佈 packet,再輸出 copy-ready 摘要式通知。通知可貼到 Telegram、WhatsApp 或 Email,但必須包含重點摘要、注意事項與 `check Drive` 下一步,不可只列 packet id。只有敏感資料、共同目標不清、或對方任務未知且會影響下一步時,才可停下反問。
- **發送前完整性預檢** — 任何 APS 交接包寫入 Google Drive 前,AI 必須檢查共同目標、本方任務、對方任務或「未確認」、交叉點、請對方做的事、不應誤解的事、證據位置、風險 / 未決事項、敏感資料。缺漏時先從上下文補足;補不到才問用戶。未經用戶 A 確認完整 / 正確前不可 publish。
- **收件後完整性預檢與本機對接檢查** — 用戶 B / Agent B 收到交接包後,AI 必須先產生可快速閱讀的收件報告,再檢查資料是否足夠回應。若共同目標、任務邊界、請 B 做的事、證據位置、版本或必要背景不足,AI 要主動提醒用戶 B,整理缺漏,發出補交需求包,生成 copy-ready 通知請用戶 A / Agent A 補交;原交接不得在補交前 close。即使資料齊全,AI 仍須核對交接內容與 B 本機 `.aps/config.json`、本機文件、任務要求、可讀證據位置與版本狀態是否一致;不一致時先發共識確認包,不得直接開工。預設不得 consume 不完整或未對接的原交接;若用戶 B 明確要求標記已讀,ack result 必須寫「已讀,等待補充資料」或同等具體狀態,並提醒原交接不會再以 pending 形式出現。A 補交時優先 revise 原 packet;不適合 revise 時才另發 supplemental packet。
- **Project Peers 逐一交接隔離檢查** — 若版本或候選功能涉及 project-level peers,全面檢必須跑多 peer 逐一交接情景,不能只跑二人 round-trip。最低情景:同一 project 內至少有三個 agent;A 先向 B 發單收件 packet 並由 B consume;A 再向 C 發另一個單收件 packet 並由 C consume;B 不應在 `inbox --all` / `inbox --from` 看到 C 專屬 packet,C 亦不應看到 B 專屬 packet;錯收件人執行 `consume` 必須被拒絕;`status --packet-id` 只可查本機 agent 自己發出的 packet,查對方發來的 packet 時須提示改用 inbox。此檢查證明「一個 project 多位 peers,每次仍是一對一 packet」,不得以群組、多收件人 packet 或讀取所有 lane 代替。另須跑 peer 確認回歸(0.2.11 起):一個已活躍但仍標 provisional 嘅 peer(例如只用 hand-config、已 publish 過)必須可被回覆(provisional + 有真實自我活動證據 → 放行並提示狀態待修);無活動 provisional、inactive、未註冊仍須被擋;`publish` / `consume` 必須自動確認執行者自己嘅 peer card,且只確認自己、不郁對方卡;確認與可收件判斷只用 agent 身份 / packet `to` / ack / 活動證據,永不使用 role。空 lane / 空 ack 只代表骨架已建,不可單憑此判定可收件。
- **通知邊界誠實性** — APS 目前不是自動控制服務。公開文檔與 skill spec 必須說清楚:發送方 AI 寫入交接後,接收方 AI 不會自動彈出提示或自動開工;AI 必須生成可直接複製貼上的摘要式 Telegram / WhatsApp / Email 通知,由人類貼到現有渠道請對方「check Drive」。APS 的增值是對方 AI 檢查共用 Drive 資料夾後可讀到結構化上下文、任務需求、版本與已讀狀態,並先做完整性預檢與本機對接檢查。
- **Drive 同步邊界** — 發包成功只代表本機共用 Drive 資料夾已寫入,不可暗示對方電腦已即時同步完成。通知與補救流程必須提示:若對方未見,先等待 / 檢查 Google Drive 同步並重試 `check Drive`,不要立即重複發包。
- **共同目標與任務邊界** — 公眾教學與 skill spec 不可假設兩邊 agent 正在做同一任務。交接包必須能表達共同目標、本方任務、對方任務或「未確認」、交叉協作點、請對方做的事、不應誤解的事、證據位置。若兩邊 brief 可能矛盾,AI 應標示為需要確認,不可強行合併成一致目標。
- **共識確認回路** — 若收件時發現任務要求、共同目標、檔案版本或本方理解不一致,AI 不可單向吸收 prompt 後直接開工。必須先停工,整理差異,發出共識確認包,生成可複製貼上的通知,等待對方回覆或修訂後才繼續;原交接不得在共識未成立前 close。
- **新安裝與版本升級落地** — 外發版本若改動 `skills/aps/**`、CLI 或 setup wording,全面檢須驗證新安裝與既有項目升級兩條路徑。新裝可取得新 skill;既有項目可透過 `npx aps upgrade` 讀現有設定、備份舊 skill、刷新新 skill、更新本地橋接與 Handoff Kit 註冊,並保留既有共用 Drive 資料夾交接資料。若 AI 工具需重啟才讀新 skill,輸出必須明確提示。
- **agent_id 身份一致性** — 全面檢須驗證新安裝、starter pack、README、walkthrough 與 skill 都清楚說明:`agent_id` 是共用 Drive 資料夾共享身份,不是本機暱稱。Adam / Jay 示例應是 Adam 電腦 `agent-id=adam`、`other-agent-id=jay`;Jay 電腦 `agent-id=jay`、`other-agent-id=adam`。不得讓兩部電腦都把自己叫 `agent_a`。若 `agent-id` 與 `other-agent-id` 相同,CLI 必須阻擋;若兩邊使用不同命名集合,AI 必須提示會讀錯 `from_<agent>` lane 並協助對齊。
- **交接語義防混淆** — 全面檢須用至少三條 prompt 驗證路由:「收工」走 Agent Handoff Kit 會話交接;「幫我做 APS 交接包給 Jay」走 APS packet;只說「幫我做交接包」必須先澄清,不得直接寫任何檔案或共用 Drive 資料夾 packet。
- **品牌與版本防混淆** — APS 全面檢須驗證 AI 實際回覆不會把 APS CLI 版本顯示成 Agent Handoff Kit 版本,亦不會在 APS skill 回覆內輸出 Agent Handoff Kit 啟動卡。若要提版本,APS CLI 與 Agent Handoff Kit 必須分開核實與分開顯示。
- **長正文發包安全** — 正式交接、長正文、多行摘要、表格或含引號 / 特殊符號的正文,必須使用 `--body-file` 或等效安全輸入;不得把整段 packet body 直接塞進一條多行 shell 引號命令。
- **Reliable Pair 與延後路線防誇大** — 近期主線是 Reliable Pair first:先完成可靠二人交接、升級、發送前確認、收件總覽、補交 / 共識確認與 UAT。Contacts selector / 選對方體驗、真正多人平台、多收件人 packet、Dropbox / OneDrive 正式支援均屬延後路線;`_notify`、`aps watch`、桌面通知、OS 排程、AI 平台自動任務與 Telegram bot 自動代發屬**非 APS 範圍**(roadmap 第五節),不是延後路線。兩類未有實作 / 不在範圍,都不可對外寫成已支援。群組只是發送別名,不等於可寫 lane;核心設置不得改為要求雲端儲存 API、OAuth 或雲端開發者設定。

### 主要使用流程走通

每次全面檢須至少覆蓋下列流程；若某流程因尚未 publish / 未具備對方機 / 無共用 Drive 資料夾而不能跑,報告中須列為「受阻」並寫明缺少甚麼證據：

1. **零認知讀者入口流程** — 由 `README.md` → `docs/index.html` → `docs/guides/index.html` → walkthrough,讀者能分清「目前可試」「正在硬化」「目標體驗」；walkthrough 的宏觀流程圖與能力清單須幫讀者先理解 APS 價值,而不是直接跳入命令。
2. **手動設置與版本升級流程** — 新安裝按 walkthrough 由前置事項 → 工作目錄 → Agent Handoff Kit → `npx aps init` → Handoff Kit APS route / project-index registration → `doctor` → 首次 packet;既有項目升級按 `npm install --save-dev @adamchanadam/aps@latest` → `npx aps upgrade` → `doctor` → 重啟 AI 工具。每一步不依賴不存在的 npm package、私有本機路徑或手改 `AGENTS.md`,升級不可覆寫既有共用 Drive 資料夾交接資料。
3. **日常協作流程** — one-sentence handoff request → AI reads config / runs doctor / packages common goal / own task / counterpart task / crossing point / requested action / evidence → completeness preflight → user A confirms → AI publishes packet → AI generates copy-ready summary notification → human pastes notification into Telegram / WhatsApp / Email → receiver says check Drive → receiver-side overview → packet summary → completeness preflight → local handoff alignment report against receiver config / docs / task requirements → if complete and aligned,user decides whether to ack / consume → reply / close; if incomplete,missing-info packet → user A / Agent A supplements; if not aligned,alignment-check packet → counterpart confirmation / revise / withdraw → continue only after consensus,在 CLI、Bridge Pack、skill spec、README、public docs 與 walkthrough 中可追蹤同一條邏輯。命令列流程只可作備用驗證路徑。
4. **多 peer 逐一交接流程** — 同一 project 內至少三個 agent,按「A → B 單收件交接 → B consume → A → C 單收件交接 → C consume」走通;`inbox --all` / `inbox --from` 必須按 packet `to` 隔離,不得讓 B / C 看到或消化不屬於自己的 packet;發送方用 `status --packet-id` 查自己發出的 packet,收件方用 `check Drive` / inbox 查自己收到的 packet。此流程用來驗證 Project Peers,不是多收件人 packet、群組 lane 或自動通知。
5. **出錯補救流程** — Drive 同步延遲、conflict、wrong-lane、packet 格式錯誤、版本不對齊、啟動找不到 APS route、設定指向舊 project、對方看不到 packet,每項有偵測、停手、用戶確認、修復或升級路徑。

**驗收**：外發前檢 + 上列主要流程全部 cleared,且審核報告已 commit。任何「阻擋」項目未解決即不可放行。

**時間**：30+ 分鐘（跨工作目錄部分要分開幾個 session；審核報告一次過寫）

**失敗處理**：每個阻擋項目逐條列出；不可只以「仍有待辦」一句帶過。

---

## QC 結果收口硬規則

每次跑快檢、外發前檢、全面檢或同類 QC / audit 後,AI 必須把所有檢查項逐項收口,不可將問題藏在表格或段落中間。這是所有 QC tier 共用的硬規則,優先於單項報告的語氣整理。

1. **狀態必須可判斷** — 每個檢查項只可標為「通過」「失敗」「受阻」「未觸發」「不適用」之一,不得用「已查看」「略過」「待辦」等含糊詞代替結果。
2. **總結不得靜默未通過項** — 只要存在「失敗」或「受阻」,總結不得寫「通過」;只可寫「未通過」「受阻」或「scoped pass / 局部通過」並在同一段說明原因。若存在「未觸發」或「不適用」,總結必須明示本次結論的適用範圍,不得冒充完整通過。
3. **未通過項必須自動處理** — 對每個「失敗」或「受阻」項,AI 必須先判斷是否可在當前權限與範圍內 root-fix。可修者直接修正源頭並重跑相關檢查;不可修者列明阻塞原因、需要的人類決定或外部條件,並寫入 handoff / log 的風險或下一步。
4. **補跑與降級必須有證據** — 若把某項由「失敗 / 受阻」改成「通過」,必須列出補跑命令或核對證據。若把某項改成「未觸發 / 不適用」,必須列出不適用的具體原因,不可只因為麻煩或耗時而降級。
5. **報告末尾必須有未清零清單** — 每份 QC / audit 報告最後必須有「阻擋項」「警告」「未觸發 / 不適用項」或等價區段;若全數清零,明寫「無」。不得讓讀者翻完整份報告才知道仍有問題。

違反本節時,該次 QC 結論視為未成立;AI 必須先修正報告口徑與未通過項處理路徑,再宣稱完成。

---

## 嵌套規矩

三 tier 嚴格嵌套：

- 跑外發前檢 **必自動跑** 快檢 4 項先
- 跑全面檢 **必自動跑** 外發前檢（即連 inner 快檢 都跑埋）

AI 不可在較高級別觸發後省略較低級別。

---

## 反問規矩

當用戶用以下含混詞，AI **必須停手反問**「你指快檢 / 外發前檢 / 全面檢?」，不可憑感覺解讀範圍：

| 含混詞 | 對應動作 |
|---|---|
| `全套 QC` | 反問 |
| `完整 QC` | 反問 |
| `做 QC` | 反問 |
| `跑驗收` | 反問 |
| `Audit` / `整體 audit` | 反問 |
| `QC`（單字） | 反問 |

未列於以上清單的含混表達，按字面 + context 解；如仍有 ambiguity 寧反問。

---

## 典型用法

- **🟢 快檢**：commit 前 spot-check；session 五區段執行完之後的基線驗證；改完 doc 試 anchor 不斷
- **🟡 外發前檢**：push remote 之前；傳 Bridge Pack / starter pack / 設置指引予協作夥伴之前；新教學頁或維護者頁分享予外人之前
- **🔴 全面檢**：跨機 round-trip 落地之前；協定升版之前；引入新 agent 之前；連跑 N 個 session 後重置 baseline

---

## 既有 mechanism mapping

此套詞彙**不重複定義**既有機制；下列機制各自的單一真源不變,本表只說明「哪個機制觸發於哪個級別」：

| 機制 | 單一真源位置 | 觸發級別 |
|---|---|---|
| Agent Handoff Kit doctor | `npx @adamchanadam/agent-handoff-kit doctor` 命令 | 🟢 |
| 8 條 rule packs | `dev/rules/*.md` | per-task signal（orthogonal to tier） |
| Plan-level acceptance | `docs/plans/*.md` 各 task Acceptance 段 | 🟢 / 🟡 視 scope |
| APS Handoff Kit route registration | `aps init` 寫入 runtime workspace 的 `dev/RULE_PACKS.md` managed block + `dev/PROJECT_INDEX.md` APS installed skill block | 🔴 |
| Bridge Pack runtime addendum | runtime workspace 的 `dev/rules/aps-bridge.md` | runtime auto,不屬 tier |
| Tool inline self-check | `tools/aps-onboard.ps1` 的 parse / DryRun / idempotency / Set-IdentityField 替換驗證 | 🟢 |
| 五區段 + 自審紀律 | `CLAUDE.md` §3 §11 §12 + per-session `dev/SESSION_LOG.md` | 🟢（per-session 跑）/ 🔴（retrospective） |

---

## 單一真源說明

本檔（`dev/qc/triggers.md`）是 QC 觸發詞彙的單一真源。`docs/qc/governance-map.html` 是公開參考卡,內容必須與本檔對齊。任何觸發詞、級別定義、覆蓋範圍的改動,先改本檔,再同步 HTML 卡片。

## File history

- 2026-05-29（S46）：外發前檢第 9 項由「只審公開 HTML」擴成「文檔與教學層內容/產品模型深審 + 行為真源對齊」,涵蓋 `skills/aps/SKILL.md` + `references/setup-dialogue.md` 與 CLI↔教學層連動;新增 (d) 行為真源對齊、明文「結構檢查過≠行為模型對齊」、分階段落地 blocking 閘。全面檢 spec-to-runtime 補 CLI↔skill 行為對等核對。源於 0.2.13 第一段 CLI 改三問 / items / 邀請生 starter 後 skill 仍教五問 / init 生 starter,而 description 長度、YAML、觸發詞等結構檢查全過嘅實測漏洞(同 S44/S45 的「結構過、模型漂移」同源)。
- 2026-05-21（S6, same day）：初版建立。基於 `file:///C:/Users/adam/_claude_desktop/_Prompt_Template/ai-session-governance_v2_WORK/docs/GOVERNANCE_MAP.html` 的 vocabulary pattern,再按 APS context 重新 mapping（無 npm publish / 無 CI / 無 remote git）。
