---
name: aps
description: Sets up and runs cross-machine collaboration between AI agents on the same project, using a shared cloud-drive folder as the exchange. Use when the user wants to set up APS / Agent Public Squares (legacy alias AI Public Squares), invite a project peer, hand part of the work to a peer, post or receive a one-to-one inter-agent packet, check the shared folder for new items, check whether a peer handled a packet, or fix cross-machine sync issues. Example triggers include "教我用 APS", "教我用 Agent Public Squares", "教我用 AI Public Squares", "set up APS", "裝 APS", "邀請 [對方] 加入 APS", "把這部分交給 [對方]", "post to [對方]", "check Drive", "check Hub", "Jay 收到未", "Drive 同步唔到", "sync stuck", "conflict". The skill body lists the full trigger set.
---

# Agent Public Squares — 跨機合作 skill

> **狀態:** npm package `@adamchanadam/aps` 屬前期測試版,確切版本以 `npx aps --help` 或 `npx aps doctor` 實測為準。套件提供 `bridge-pack`、互動式 `init` 技能安裝、既有項目 `upgrade`、初始共用 Drive 資料夾 skeleton、Bridge Pack、starter pack、最小 `publish` / `inbox` / `consume` / `close` 指令,以及 `revise`、`withdraw`、只讀 `doctor`、`context` / `context add` / `context html`、`dashboard`、`check-drive`、`config`、`.aps/config.json` 專案本地設定、`publish --body-file`、`revise --body-file` 與短命令日用流程。Project Peers + Sent Status(`peers`、`peer add`、`peer starter`、`publish --to`、`inbox --from`、`inbox --all`、`status --packet-id`)讓一個 project 可有多位 peers、每次仍是一對一 packet。設置完成後日常命令可省略共用 Drive 資料夾 / project / agent 長參數。專案已通過一次維護者真實 Google Drive 跨機往返驗證;技能內自然語言日常操作與補救流程仍為前期測試。此檔是可隨 npm package 發出的 skill runtime 規格草稿。設置對話 wording 的精簡隨包版本見 `references/setup-dialogue.md`;repo 內長版維護稿見 `docs/plans/2026-05-23-aps-skill-dialogue-script.md`。

## 1. 此 skill 的職責

帶用戶行完整個跨機合作生命周期:初次設置、日常交接、收取對方回覆、出錯補救。用戶多數對協定內部結構沒有預備知識,亦不應需要知道。Skill 的目標是將整套協定包成「用戶回答少量問題,AI 代理處理其餘步驟」的形態。`Agent Public Squares` 是這個產品的正式名稱;`AI Public Squares` 是早期沿用、現仍要識別的舊名;`APS` 是簡稱。三者指向同一品牌、同一產品。若用戶說其中任何一個名稱,均視為同一 APS 流程,不得回答「不確定」或改走其他 onboarding skill。**目前此檔是 runtime 規格草稿,不是已通過真實用戶流程測試的能力清單;已由 CLI 驗證的範圍包括本地一次性共用 Drive 資料夾的發佈、修訂、收件、消化、撤回、收結與只讀診斷。技能內自然語言操作、starter pack 對方落地、補救動作與真實跨機 Drive 同步,實作前仍須以當前 CLI 與 bundled files 重新驗證。**

## 2. 對用戶輸出的 voice 規矩(嚴格遵守)

- 一律使用當代繁體書面語。
- 不堆砌技術詞與內部編號,亦不夾雜中英「半通不通」的片段語。
- 敍事與解釋並行:每一句獨立讀都自足,用戶讀完即知意義,而非要靠前後句拼湊或要打開另一份文件參考。
- 句可短,氣須足。用戶非技術背景,但是成年人,有自己的節奏與判斷力。
- 粵語 colloquial 字詞(「嘅」「嗰」「咗」「唔」「呢個」等)僅可出現於 verbatim 引述用戶原話的觸發短語(例如「Hub 有新嘢」「check Drive」「check Hub」),其他位置一律書面語。
- **APS 品牌卡統一規則**:用戶輸入「教我用 APS」、「教我用 Agent Public Squares」、「教我用 AI Public Squares」、`check Drive`、`check Hub` 或完成 APS 發佈 / 收件狀態整理時,可在回覆開首顯示 APS 自己的短品牌卡,但必須放在 fenced `text` block 內保留排版。固定格式為:
  ```text
  -------------------------------------
        ✦ Agent Public Squares ✦
   =^._.^=  <-- 共用 Drive -->  =^._.^=
         packets  |  versions  |  ack
           v<已驗證版本> pre-release
  -------------------------------------
  ```
  `<已驗證版本>` 只可來自 `npx aps doctor`、`npx aps --help` 或已讀 package version;未核實時寫 `version unverified`。不得顯示 Agent Handoff Kit 啟動卡、`continuity ready` 或 Agent Handoff Kit 版本。
- **工作訊息 emoji 規則**:用戶可見的 APS 狀態整理應使用少量固定圖示提升可讀性:`✅` 正常 / 已完成,`❌` 失敗,`⚠️` 風險,`📬` 有新件,`📭` 無新件,`📦` 交接包,`📄` 檔案或設定,`🔎` 檢查,`🚀` 下一步。emoji 只放在標題、狀態行或表格狀態欄,不要每句都加。
- 新手遇到技術操作時,AI 要主動提供協助,不要只把責任推回用戶。若問題涉及 Google Drive、Google Drive Connector、MCP、Claude Code、Codex、npm、GitHub、作業系統權限、雲端分享或其他外部工具設定,必須先查官方文件或官方產品說明,再用繁體中文整理成可照做的步驟。未查到官方來源時,只能標示為未核實,不得憑 LLM 內建記憶作答。
- **品牌與版本分流硬規則**:APS 與 Agent Handoff Kit 是不同產品層。APS skill 不得輸出 Agent Handoff Kit 的啟動卡、貓圖 banner、`continuity ready` 或 `Agent Handoff Kit v<版本>`。若需要提版本,只能分開列明:「APS CLI: 由 `npx aps doctor` 或 `npx aps --help` 實測所得」;「Agent Handoff Kit: 只有實際執行 kit doctor 或讀到已驗證本地紀錄時才可列明,否則寫未核實」。不得把 APS package 版本當成 Agent Handoff Kit 版本。
- **候選版本測試規則**:若用戶正在測試未發布候選版,先核對 `npx aps --help` 或 `npx aps doctor` 顯示的 APS CLI 版本。若它仍是 npm 最新公開版,不得聲稱正在測試候選版;需改用本地 CLI 路徑或先把本地 package 安裝到該 UAT 專案。
- **新安裝 / 升級分流硬規則**:沒有 `.aps/config.json` 的項目走新安裝:先確認 Agent Handoff Kit 已初始化;若缺 `AGENTS.md`、`dev/RULE_PACKS.md` 或 `dev/PROJECT_INDEX.md`,先執行或提示用戶執行 `npx --yes @adamchanadam/agent-handoff-kit@latest init`,再 `npm install --save-dev @adamchanadam/aps@latest` 與 `npx aps init`。已有 `.aps/config.json` 的項目走升級:先 `npm install --save-dev @adamchanadam/aps@latest`,再 `npx aps upgrade`。升級時不得要求用戶重建共用 Drive 資料夾,不得覆寫既有交接包、outbox、ack 或共用 Drive 資料夾的協定檔。
- **agent_id 一致性硬規則**:`agent_id` 是整個共用 Drive 資料夾共用的身份名稱,不是每部電腦各自重新命名的暱稱。三問安裝時,每一方只設定自己的名稱;對方透過邀請(`peer add`)加入,不在安裝時填寫。雙方仍須沿用同一套身份名稱:Adam 這邊叫 `adam`,Jay 那邊叫 `jay`,而不是兩部電腦都把自己叫 `agent_a`。若兩邊名稱不一致,AI 必須先提醒會讀錯 `from_<agent>` 通道,導致 inbox 看不到交接包或共用 Drive 資料夾內出現多套 lane,再協助用戶用 `npx aps config` 或 `npx aps upgrade` 對齊。
- **Project Peers 硬規則**:一個 APS project 可以有多位 peers,但每個 packet 仍只可發給一個 peer。`otherAgentId` 是舊二人相容預設,不是整個 project 永久只能合作一人的限制。用戶說「邀請 Fanny 加入這個 APS project」時,先用 `npx aps peer add --agent-id fanny --display-name Fanny` 建立 provisional peer 與 starter pack;對方未完成設置前,不得把 Fanny 當作 confirmed peer 發正式交接。用戶說「把這部分交給 Fanny」時,先用 `npx aps peers` 確認 Fanny 是否已 confirmed;若 confirmed,才用 `npx aps publish --to fanny ...`;若 provisional,先輸出 starter pack 通知。不得建立多收件人 packet、群組 lane 或自動通知對方 AI。

## 3. 起手 routing

Skill 觸發之初,先做本地狀態判斷,再判斷用戶 intent。**讀任何 reference 前,先檢查目前工作目錄是否已有 `.aps/config.json`。若存在,這是最高優先訊號。**用戶說「教我用 APS」「教我用 AI Public Squares」「教我用 Agent Public Squares」「set up APS」「下一步」「怎樣試」時,意思是「帶我開始用」,不是「重新教我安裝」。此時不得直接讀 setup 起手稿,不得重問雲端硬碟是否已安裝或對方是誰;先讀 `.aps/config.json`,再進入「首次使用子流程」。

字面短語只是樣本;字面命中或語意命中,任一即足以 route 至該子流程。

- **交接包分辨硬規則**:APS 跨機交接包與 Agent Handoff Kit 會話交接不是同一件事。APS 跨機交接包是給 Jay / 對方 / 另一台機的 AI 讀取,會寫入共用 Drive 資料夾;Agent Handoff Kit 會話交接是給下一個 AI session 繼續本機項目,會更新本地 handoff / log / index 等治理狀態。若用戶只說「交接包」「做 handoff」「整理交接」而沒有明確指出對方、共用 Drive、APS、收工、下一個 session 等語境,不得猜測,先問一句澄清:
  ```text
  你指哪一種交接?

  A. 會話交接
  給下一個 AI session 繼續這個本機項目用,不會放到共用 Drive 資料夾。

  B. APS 跨機交接包
  給對方 AI 讀取,我會先整理內容與預檢,經你確認後才寫入共用 Drive 資料夾。

  如果你是要交給對方,選 B;如果你是準備收工或下次繼續,選 A。
  ```
  若用戶明確提到「對方」「Jay」「另一台機」「共用 Drive」「check Drive」「check Hub」「WhatsApp 通知」「APS」,才走 APS 發佈 / 收件流程。若用戶明確提到「收工」「wrap up」「下一個 session」「下次繼續」「handoff ready」,交由 Agent Handoff Kit closeout 流程處理,不要建立 APS packet。
- **通知與雲端支援邊界**:目前已驗證主路徑是 Google Drive,但 Google Drive 不等於固定磁碟機代號,必須以 `.aps/config.json` 的 `hubRoot` 或用戶提供的真實本機路徑為準。`hubRoot` 是本機設定,只代表當前使用者這部電腦的同步路徑;不得把發送方的本機 `G:\...`、`C:\...` 或任何本機 Hub path 寫成對方應使用的路徑。給對方的通知必須先讓人看懂,再讓人決定是否叫 AI 介入:包含 project slug、來源 agent、topic、packet id / version、`🔎 重點摘要`、`⚠️ 注意事項`、以及唯一主行動「在你自己電腦上打開已接入 APS 的對應項目資料夾,由你本人確認可以處理後,向 AI 輸入『check Drive』」。通知不可只列交接編號,亦不可要求對方使用發送方本機路徑。Telegram、WhatsApp、Email 或其他渠道都只是人類通知渠道;APS skill 不應透過通知自動觸發對方 AI,也不得自動 consume、close、revise 或 withdraw。Dropbox、OneDrive 或其他同步資料夾只可描述為未正式驗證的實驗路徑,不得主動推薦為正式支援路徑;若用戶指定非 Google Drive,先標示未驗證並要求做該項目的單獨同步驗證。
- **初次設置**:用戶語句出現「set up APS」「set up AI Public Squares」「set up Agent Public Squares」「教我用 APS」「教我用 AI Public Squares」「教我用 Agent Public Squares」「裝 APS」「裝 AI Public Squares」「裝 Agent Public Squares」「啟動 AI Public Squares」「啟動 Agent Public Squares」「跨機合作」「想同 X 兩部機合作」「partner workflow」「cross-machine collab」「two AIs collaborating」「兩部電腦改同一份嘢成日撞」「兩個人改緊同一份文件」等,或語意指向「初次設置一個跨機合作機制」的同類語句 → 進入「設置子流程」(第 4 節)。
- **安裝後首次對話**:若目前工作目錄已有 `.aps/config.json`,而用戶說「教我用 APS」「教我用 AI Public Squares」「教我用 Agent Public Squares」「set up APS」「set up AI Public Squares」「set up Agent Public Squares」「已安裝」「下一步」「怎樣試」等,不要重做初次設置;先進入「首次使用子流程」(第 5 節)。
- **一語交接 / 發佈**:用戶語句出現「幫我將當前任務交接給 B」「把目前任務整理成 APS 交接包給對方」「我有嘢俾 X」「post to X」「交份嘢」「publish」「我做完份嘢,要俾 [對方]」等,或語意指向「將當前任務、目前上下文或已完成工作交給對方」的同類語句 → 進入「發佈子流程」(第 6 節)。
- **邀請 peer / peer 狀態**:用戶語句出現「邀請 Fanny 加入 APS」「新增協作對象」「生成給 Fanny 的 starter pack」「Jay 收到未」「看看 Fanny 有沒有處理」等,或語意指向「管理 project peer 或查發送狀態」的同類語句 → 進入「Project Peers 子流程」(第 5.1 節)。
- **收件**:用戶語句出現「check Drive」「check Hub」「Hub 有新嘢」「X 嗰邊有冇新嘢」「check inbox」「未消化」「[對方] 整咗咩」等,或語意指向「查看對方有甚麼新東西交過來」的同類語句 → 進入「收件子流程」(第 7 節)。
- **共識確認**:用戶語句出現「理解不一致」「不是做同一任務」「brief 不一致」「要求不同」「先確認共識」「不要先做」「alignment」「clarification」等,或 AI 讀取交接包後發現共同目標、任務範圍、檔案版本、交付要求與本方已知狀態不一致 → 進入「共識確認子流程」(第 8 節)。
- **出錯 / 補救**:用戶語句出現「Drive 同步唔到」「X 話收唔到」「sync stuck」「conflict」「出錯」「Claude Code 唔識個 skill」「Agent Handoff Kit 未 init」「對方未 share」等,或語意指向「跨機合作流程中的某環節出錯需要補救」的同類語句 → 進入「補救子流程」(第 9 節)。

意圖不明時(語句模糊或無明顯觸發短語),先以一句中性問題確認:「你是想由零開始裝 APS,還是已經裝過、現在想處理日常的發佈、收件這類動作?」再分流。**不要憑半個短語直接跳入子流程。**

## 4. 設置子流程

觸發來源:第 3 節「初次設置」路由命中。先讀 bundled reference `references/setup-dialogue.md`,再按下列順序執行。若此 skill 是從 npm package 安裝,不要依賴 repo 內 `docs/plans/` 檔案,因為它們不在 npm tarball 內。

1. **打招呼 + 意圖確認**:確認兩件事 — 雲端硬碟是否已裝、用哪一個雲端硬碟。三問安裝只設定用戶自己這一邊,毋須現在就有對方;APS 是邊做邊加,協作對象可在設定好之後隨時用邀請流程(第 5.1 節 `peer add`)加入。若用戶已心中有合作對象,記下名稱留待設定完成後邀請即可,不必在安裝時填寫。
2. **先決條件 interactive 檢查**:
   - Claude Code:skill 被觸發即代表已在線,毋須額外 check。
   - Agent Handoff Kit:用 Read tool 檢查 `AGENTS.md` 是否存在 + 開頭是否屬 kit-managed core。分支 [A] 已 init → 繼續;分支 [B] 未 init → 提供安裝命令,等用戶完成之後再繼續。
   - 雲端硬碟:skill 無法直接 detect Drive 桌面版狀態,透過用戶口頭確認 + 第 5 步寫入時的 io error 偵測雙重保險。
   - 若用戶不知道怎樣安裝、登入、同步或分享雲端硬碟,AI 要先查官方 Google Drive / 對應雲端工具文件,再給一步一步指引。若當前 AI 工具提供 Google Drive Connector / MCP,涉及啟用、授權或設定時亦須先查官方產品說明;不得憑記憶猜測介面位置或權限流程。
3. **三項決定(三問安裝)**:逐項問,接著記入內部狀態 — 共用 Drive 資料夾完整路徑、項目代號、你自己的名稱(own agent_id)。**不問對方是誰,也不問第一個交接包由誰先發**;起手方向由 CLI 自動推斷,只作預設提示,不用於授權。
   - 問「你自己的名稱」時,按「agent_id 一致性硬規則」提醒:這是共用 Drive 資料夾內的共享身份,日後邀請對方時雙方須沿用同一套身份名稱。
4. **預設值確認**:列預設值,等用戶回「OK」或指明想改哪一件 + 改成甚麼。
5. **執行 CLI 設置**— 優先使用互動式 `npx aps init`,不要手寫 Hub skeleton、Bridge Pack 或 starter pack:
   - 先確認目前工作目錄已執行 `npm install --save-dev @adamchanadam/aps@latest`。
   - 執行 `npx aps init`。互動式只問三項:按前面已確認的 `hub_root`、`project_slug`、`own_agent_id` 回答。**不會問對方 agent_id,也不會問角色 A / B**。
   - 工具列出寫入計劃後,先向用戶覆述即將寫入的位置;取得用戶確認後才輸入 `yes`。
   - 成功後驗證 `dev/rules/aps-bridge.md`、`.aps/config.json`、共用 Drive 資料夾的 `_hub/PROTOCOL.md`、自己的 `from_<own_agent_id>/outbox.log.md` 與 `_ack/<own_agent_id>.ack.json` 均存在。**三問安裝只設定用戶自己這一邊:不會建立對方通道,也不會生成 starter pack —— 那些在邀請對方時(第 6 步 / 第 5.1 節)才產生。**
   - 若需要 AI 或腳本代為執行非互動流程,使用 `npx aps init --hub-root ... --project ... --agent-id ...`(`--other-agent-id` 與 `--role A|B` 可選,只設自己即可)。不得使用含尖括號 `<>` 或 `...` 的 placeholder。
6. **邀請對方並生成 starter pack**:
   - 三問安裝**不會**生成 starter pack。當用戶想邀請對方時(可以即時,亦可以日後),用 `npx aps peer add --agent-id <對方> --display-name <名稱>` 建立 provisional peer,CLI 會同時把 starter pack 寫入 `<hub_root>/_hub/starter-pack-<項目>-<對方>.md`。若用戶今次未決定搵邊個,跳過此步,並提醒佢設定好之後隨時可以邀請。
   - 邀請後,讀取該 starter pack 並生成可複製短訊文本,輸出到 chat 顯示給用戶 copy(skill 不直接寫入 clipboard — OS clipboard API 非 Claude Code 標準 tool;改為明確 surface「以下短訊請 copy 傳給對方」+ blockquote 包圍)。對方完成自己那邊的三問安裝後才成為 confirmed peer。
7. **設置完成後的下一步**:
   - 三問安裝完成後,項目只有用戶自己一邊,**未有對方可發測試交接**。主路徑是建議用戶邀請第一位協作對象(轉第 5.1 節 `peer add`),或提醒佢隨時可以邀請。
   - 只有當已有 confirmed peer(對方已完成自己那邊的安裝)時,才提議發測試交接。AI 在背後調用當前 CLI,**必須用 `--to <peer>` 指名收件對象**,而不是手寫舊式單檔 packet:
     ```text
     npx aps publish --to <peer_agent_id> --topic setup_test --body "APS setup test from <own_agent_id>."
     ```
   - 指令成功後,記下輸出的 `<packet_id>` 與 v1,用白話回報:測試交接已寫入共用 Drive 資料夾、主題是甚麼、對方應如何收件。
   - 明確說明 APS 不會自動觸發對方 AI;請用戶把通知傳給對方。即使測試包很短,通知亦應包含交接摘要與注意事項,讓收件人先理解重點,再自行決定何時在自己的 AI 工具輸入「check Drive」。

設置完成後,不要只叫用戶下次再說固定句。若用戶仍在同一段 AI 對話內,直接進入首次使用子流程。

### 4.1 既有項目升級子流程

若目前工作目錄已有 `.aps/config.json`,而用戶說「升級 APS」「更新 APS」「update APS」「upgrade APS」「現有版本要更新」或同等意思,不要重跑初次設置問答,也不要要求重新建立共用 Drive 資料夾。AI 應:

1. 讀 `.aps/config.json`,確認共用 Drive 資料夾、project、own agent、other agent 與 role。
2. 執行或提示用戶執行 `npm install --save-dev @adamchanadam/aps@latest`。
3. 執行 `npx aps upgrade`。此命令會備份並刷新 APS skill,更新本地橋接與 Handoff Kit 註冊,再做共用 Drive 資料夾預檢。
4. 執行 `npx aps doctor`,確認升級後仍通過。
5. 提醒用戶重新啟動 Claude Code 或 Codex,再回到項目資料夾輸入「教我用 APS」。

升級流程不可覆寫既有 packet folder、outbox、ack 或 `_hub/PROTOCOL.md`。若 `npx aps upgrade` 顯示缺 `.aps/config.json`,代表這不是升級路徑,應改走新安裝。

## 5. 首次使用子流程

觸發來源:第 3 節「安裝後首次對話」路由命中,或第 4 節設置成功後繼續。此流程的目標是讓用戶不需要記住命令或觸發句,而是由 AI 主動檢查狀態並給出可選下一步。

1. **讀取本地設定**:先讀 `.aps/config.json`。若存在,用一段短摘要告訴用戶:項目、自己這邊、預設對方、共用資料夾。共用 Drive 資料夾路徑必須使用設定檔內的實際 `hubRoot`;Google Drive 不一定是 `G:`。若設定檔不存在,不要猜;回到設置子流程。若 JSON 格式錯誤,用一句話說明「本地 APS 設定檔讀不到」並建議重新跑 `npx aps init`。
2. **先做健康檢查**:
   ```text
   npx aps doctor
   ```
   將結果翻譯成人話:共用 Drive 資料夾是否存在、雙方通道是否存在、ack 是否存在、有沒有疑似衝突檔。不要把完整終端輸出直接貼給用戶。只可把輸出內的 `APS Hub doctor v<版本>` 解讀為 APS CLI 版本,不得因此顯示 Agent Handoff Kit 版本或 Agent Handoff Kit 啟動卡。
   完成版本核對後,在狀態摘要開首顯示 APS 品牌卡。品牌卡只顯示 APS CLI 版本,不得顯示 Agent Handoff Kit 版本。
3. **讀取 project peers**:
   ```text
   npx aps peers
   ```
   將結果整理為「本 project 可交接 peers」,列出 confirmed / provisional 狀態。若來源是 `_peers/agents`,不得只顯示 `.aps/config.json` 的 `otherAgentId`,也不得把整個 project 描述成只能與該預設對方合作。若來源是 `.aps/config.json compatibility`,才說明這是舊二人相容視圖,不代表 project 永久只能有一位對方。
4. **背景索引只讀檢查**:
   ```text
   npx aps context check
   ```
   若項目未建立 `_context/`,這不是錯誤,不要阻塞日常收發。若有 Project Context Index,只把它當背景索引:用來幫用戶理解工作流、等待事項與風險,不可把它當成最新執行真相。若 `context check` 標示來源未核實、可能過期或與 packet 衝突,回覆必須先講清楚限制,再以 packet / outbox / ack 為準。
   需要把某個已讀 packet 轉成背景索引時,使用 `npx aps context add --from-packet <packet_id> --version <n>`。這只寫本機 agent 自己名下的 `_context/from_<agent_id>/context.log.md`,不寫 packet / outbox / ack,亦不標記已處理。
   需要給人快速看項目大局時,使用 `npx aps context html` 生成 `_context/overview.html`。這是按需生成的唯讀快照,不可當成資料真源,不可由 AI 反向解析 HTML 取代 context log。
   需要日常查看「自己有沒有未處理交接、自己發出的交接對方有沒有標記處理、應先讀哪些來源」時,使用:
   ```text
   npx aps dashboard
   ```
   它生成 `_context/dashboard.html`,只讀 packet / outbox / ack / peer cards / context log,不會自動通知、不會 consume、不會 close。
   Dashboard 可以反映已同步資料內的明確狀態,例如對方 ack 已記錄、交接已收結或已撤回;但不得把「已寫入共用 Drive 資料夾」說成「對方已收到通知」。
5. **順手看收件箱**:
   ```text
   npx aps check-drive
   ```
   `check-drive` 與 `inbox --all` 同底層;日常優先用 `check-drive`,排錯時才講 `inbox`。若沒有待處理項,說「目前沒有 peer 交來的新內容」。若有待處理項,不要立即 consume;轉入收件子流程,先用總覽表與摘要展示。
6. **給三個自然下一步**:
   - 「發一個測試交接包給對方」(需先有 confirmed peer;若項目仲未有對方,先建議邀請):轉入發佈子流程,用 `--to <peer>`,topic 建議 `setup_test`,body 用一句測試文字。
   - 「邀請新 peer 加入這個 project」:轉入 Project Peers 子流程,用 `peer add` 生成 provisional peer 與 starter pack。
   - 「把目前任務整理成 APS 交接包」:轉入一語交接 / 發佈子流程,先做交接摘要與完整性預檢,經用戶確認後才 publish。
7. **不要要求用戶記命令**:命令可放在括號或補充句,但主要表達應是「我可以替你檢查 / 發測試包 / 生成給對方的短訊」。若用戶不是在排錯,不要把 `npx aps publish`、`npx aps inbox`、`npx aps consume` 當成主操作指引。

### 5.1 Project Peers 子流程

此流程只管理「project 內有哪些可交接 peer」與「已發出 packet 的狀態」。它不是群聊、權限系統或自動通知。

1. **先讀設定與 peer 清單**:
   ```text
   npx aps peers
   ```
   若只看到 `.aps/config.json compatibility`,向用戶說明這是舊二人相容視圖,不代表 project 永久只能有一位對方。
2. **邀請新 peer**:用戶說「邀請 Fanny」時,先確認 `agent_id` 的 lower_snake_case 名稱,例如 `fanny`。然後執行:
   ```text
   npx aps peer add --agent-id fanny --display-name Fanny
   ```
   回覆時說明這只代表候選 peer 與 starter pack 已建立;Fanny 必須在自己的電腦先完成 Agent Handoff Kit init,再完成 APS 設置後,才可作為 confirmed peer 接正式交接。
3. **重新產生 starter pack**:若用戶只要教學或短訊,執行:
   ```text
   npx aps peer starter --agent-id fanny
   ```
   再整理成可貼到 Telegram、WhatsApp 或 Email 的短訊。短訊不可包含發送方本機 Google Drive path,只說明 Fanny 要用自己電腦上的 Google Drive 本機路徑。
4. **查已發送狀態**:用戶說「Jay 收到未」「看看 Fanny 有沒有處理」時,先要求或從對話取得 packet id,再執行:
   ```text
   npx aps status --packet-id <packet_id>
   ```
   將結果翻譯為「尚未看到處理 / 已標記處理 / 已撤回 / 已收結」。若需要追問,不要自動通知或觸發對方 AI;只生成摘要式人類通知供用戶手動傳送。

## 6. 發佈子流程

觸發來源:第 3 節「一語交接 / 發佈」路由命中。底層 CLI 已有最小 `publish` 指令,可寫入 v1 packet folder 並追加 outbox。**此節是技能自然語言包裝規格:可以調用已驗證 CLI;專案已完成一次維護者真實 Google Drive 往返,但每個新項目仍要各自驗證共用 Drive 資料夾路徑、離線存取與同步狀態。**

### 6.1 一語交接預設路徑

當用戶說「幫我將當前任務整理成 APS 交接包給對方」或同等意思時,不要逐項反問、不要叫用戶先手動寫摘要。AI 應自動執行以下步驟:

1. 讀取 `.aps/config.json`、APS bridge 與 `npx aps peers`,確認共用 Drive 資料夾、project、own agent 與本次收件 peer。若用戶沒有指名收件人且 `.aps/config.json` 有預設對方,可用預設對方;若項目沒有預設對方(新單邊安裝),先列出現有 peers 請用戶揀,或建議先邀請,不要硬發。若用戶指名 Fanny / Jay / Jackie,必須確認該 peer 已存在且為 confirmed。
2. 執行 `npx aps doctor`;若失敗,先解釋問題並修復或要求用戶處理前置條件,不要發包。
3. 從目前對話、已讀文件、近期修改、用戶明示任務與可核對檔案中整理交接摘要。
4. 套用「交接包必備欄位」:共同目標、本方任務、對方任務或「未確認」、交叉點、請對方做的事、不應誤解的事、證據位置、風險 / 未決事項。
5. 自動生成 topic。若用戶已給明確任務名,轉為 lower_snake_case;若無,用短而可讀的 topic,例如 `aps_current_task`。只有 topic 會造成誤導時才詢問用戶。
6. 做交接包完整性預檢。若必備欄位不足,先自行從上下文補充;補不到才反問用戶。不得把未齊全交接包寫入 Google Drive。
7. 向用戶 A 顯示交接包摘要與預檢結果,請用戶確認內容、topic 與寫入共用 Drive 資料夾三件事。只有用戶明確確認後才可寫入。
8. 用 CLI 發佈 packet。**必須用 `--to <agent_id>` 指名收件 peer**(舊二人項目若有預設對方可省略,但新項目沒有預設對方;缺收件人時 CLI 會提示先揀 peer 或邀請,不會靜默失敗,亦不要硬發)。長正文或由 AI 生成的正文必須優先寫入暫存正文檔,再用 `--body-file` 發佈,避免在 shell 內塞入多行文字、表格或特殊符號。**把「請對方做的事」逐項用 `--items "甲;乙;丙"`(或 `--items-file`)明示申報**:CLI 會逐字記入 packet 的 `items` 欄與收件總覽。items 一定由發送方 AI 申報,CLI 不會自動從正文抽,亦不應靠正文標題或標點逆向估;沒有明確行動項時可省略 `--items`。
9. 回報 packet id / version / 主題,並提醒這代表本機共用 Drive 資料夾已寫入,不等於對方電腦已完成 Google Drive 同步。若對方稍後未見,先等同步或進入補救子流程。
10. 輸出可直接複製貼上的摘要式 Telegram / WhatsApp / Email 通知。
11. 告訴用戶下一步只需把通知貼給對方;之後可說「看看對方有沒有回覆」。

### 6.2 交接內容整理規則

1. **讀取接駁設定**:從本項目既有交接紀錄、Bridge Pack、`.aps/config.json`、`npx aps peers` 或用戶回答取得 `hub_root`、`project_slug`、`own_agent_id` 與本次收件 `peer_agent_id`。缺任一項時,只問缺的項目;不要要求用戶重新讀整份教學。
2. **接收內容 + topic**:
   - 問用戶要交給對方的內容。可以是直接貼上的文字、一個要先讀取的檔案,或「請把目前對話 / 目前任務背景整理給對方」這類要求。
   - 若用戶要求交接目前上下文,先整理成可交接摘要。摘要必須分清楚:
     - 共同目標:今次雙方交叉協作共同要達成甚麼。
     - 本方任務:本 session / 本 agent 正在做甚麼。
     - 對方任務:已知對方正在做甚麼;若未確認,寫「未確認」,不得猜測。
     - 交叉點:哪一部分需要對方接手、確認、使用、避免重做或停止。
     - 請對方做的事:一至三項具體要求。
     - 不應誤解的事:例如不是最終版、不是要求對方覆寫、不是要求對方接手整個項目。
     - 證據位置:關鍵檔案 / 版本 / 摘要或其他可核對來源。若位置是本機路徑,必須標明「本機路徑,只適用於本方電腦」;不得把本方 Google Drive 本機路徑當成對方應使用的路徑。跨機識別優先使用 project slug、topic、packet id / version 與相對 lane,例如 `from_<agent>/packets/<packet_id>__v<n>`。
   - 不要把整段聊天原樣傾倒到 packet。若兩邊 brief 可能不一致,先把差異寫成「需要確認」,不要假裝共同目標已對齊。
   - 問一個短 topic,並轉為 lower_snake_case。若用戶給中文題目,先提出轉換建議,例如「品牌指引第二稿」→ `brand_guide_v2`,等用戶確認。
   - 目前 CLI 只支援文字 body。若用戶要交檔案,先 Read 檔案內容並告知會把文字摘要或全文放入 body;附件型交付留待後續版本。
3. **交接包完整性預檢**:寫入 Google Drive 前,逐項檢查 body 是否包含共同目標、本方任務、對方任務或「未確認」、交叉點、請對方做的事、不應誤解的事、證據位置、風險 / 未決事項。若缺漏:
   - 可由目前上下文可靠補足者,AI 先補上並標示「由本次對話整理」或「由檔案讀取整理」。
   - 不可可靠補足者,立即反問用戶,每次最多問三個關鍵問題。
   - 仍未補齊時,不得 publish;先把草稿留在對話中讓用戶修正。
4. **敏感資料檢查**:寫入前掃描 body 是否含 credentials / API key / unredacted PII。若可疑,停手,說明原因,請用戶改用安全管道或提供已遮蔽版本。
5. **用戶 A 確認**:寫入前顯示簡潔摘要與預檢結果,包括 topic、共同目標、請對方做的事、證據位置、未確認事項。確認句必須同時覆蓋內容、topic 與寫入行為,不得只問 topic 是否可以。建議原句:
   ```text
   請確認三件事:一、交接包內容完整 / 正確;二、topic 是 `<topic>`;三、可以寫入共用 Drive 資料夾。你回「確認發送」後我才會 publish。
   ```
   取得用戶明確同意後才執行 CLI。
   正式交接不得教用戶直接手動執行 `npx aps publish` 來繞過摘要、預檢與確認閘。命令列只作 AI 背後執行、排錯或維護者驗證路徑。
6. **執行 CLI**:
   ```text
   npx aps publish --to <peer_agent_id> --topic <topic> --body-file <body_file_path> --items "<請對方做的事一>;<二>"
   ```
   若是舊二人預設對方,可省略 `--to`;若是 project peer,必須保留 `--to` 以免誤發給 `.aps/config.json` 的預設對方。短測試句可使用 `--body`;正式交接、長正文、多行摘要、表格或含引號 / 特殊符號的正文,一律使用 `--body-file`。`--items` 把今次請對方做的事逐項明示申報,CLI 逐字記入 `items` 欄,收件方總覽即可見;沒有明確行動項時可省略。修訂時若不再傳 `--items` 會沿用上一版 items,要清空用 `--clear-items`。若目前 CLI 尚未支援 `--body-file`,不得用脆弱的多行 shell 引號硬塞內容;先提示需要更新 APS CLI 或改用本地候選 CLI。
   成功輸出會包含 `已發佈 <packet_id> v1`、packet folder 路徑,以及一段可直接複製給對方的通知文字。把 packet id 與通知文字回報給用戶。
7. **生成通知短訊**:輸出給用戶手動傳給對方。通知必須包含 project slug、來源 agent、topic、packet id / version、`🔎 重點摘要`、`⚠️ 注意事項` 與 `🚀 下一步`。重點摘要應用一至三句寫明共同目標、請對方做的事或最重要的判斷;注意事項應列明風險、未決或「請先由收件人確認工作目錄與資料狀態已準備好,再叫 AI 介入」。通知不得只列交接編號,不得要求對方使用發送方的本機 Google Drive 路徑,亦不得寫成「進入同一個項目資料夾」這類可能被理解為同一條本機路徑的句子。skill 不代發 WhatsApp,不操作 clipboard。Telegram、WhatsApp、Email 或其他渠道都只是人類通知渠道;由收件人本人決定何時打開自己的 AI 並輸入「check Drive」。說明邊界:APS 不會在對方電腦彈出提示,亦不應因通知自動觸發 consume、close、revise 或 withdraw;它的作用是讓對方 AI 一旦檢查共用 Drive 資料夾,即可讀到共同目標、各自任務邊界、交叉協作點、任務需求與已讀狀態,不用人類重新搬運背景。若對方未見,先等待 Google Drive 同步並重試 `check Drive`,不要立即重發多個重複交接包。
8. **提示下一步**:告訴用戶稍後可說「看看對方有沒有回覆」查看對方回覆或確認是否已消化。

失敗處理:
- 若 CLI 回報 `outbox not found`,代表共用 Drive 資料夾尚未以 `aps init --hub-root ...` 建好或 project slug / agent id 錯。不要自行建立散落檔案;回到設置子流程補齊。
- 若 topic 格式錯誤,向用戶提供一個 lower_snake_case 建議後重試。
- 若 Drive 路徑不存在或無權寫入,列出實際路徑與錯誤,請用戶先修正 Drive 掛載 / 權限。

## 7. 收件子流程

觸發來源:第 3 節「收件」路由命中。底層 CLI 已有最小 `inbox` 與 `consume` 指令,可計算對方 outbox 的待處理項並寫入自己的 ack。**此節是技能自然語言包裝規格:可以調用已驗證 CLI;專案已完成一次維護者真實 Google Drive 往返,但每個新項目仍要各自驗證共用 Drive 資料夾路徑、離線存取與同步狀態。**

1. **讀取接駁設定**:同發佈子流程,取得 `hub_root`、`project_slug`、`own_agent_id`、`other_agent_id`。
2. **執行待辦檢查**:
   ```text
   npx aps check-drive
   ```
   若用戶明確只想看某一位 peer,使用 `npx aps check-drive --from <agent_id>`；`npx aps inbox --from <agent_id>` 是同一底層的排錯備用寫法。
3. **讀背景索引但不當真相**:
   ```text
   npx aps context check
   ```
   沒有 `_context/` 時直接繼續;有資料時,只用來補充「這件交接可能接在哪條工作流後面」。若檢查結果不是 current,必須向用戶說明可能過期、來源未核實或 packet 優先。
4. **呈現結果**:
   - 若 CLI 顯示「沒有待處理項目」,用一句話告訴用戶目前沒有新交接包。
   - 若 CLI 顯示「有 <n> 個待處理項目」,先顯示總覽表,再處理細節。不要只貼原始終端輸出;要轉成用戶可讀摘要。建議順序固定為:「總覽」→「摘要」→「預檢結果」→「細節」→「下一步」。
   - 多個新件時,先用總覽表列 `序號`、`來源`、`主題`、`版本`、`判斷`、`建議`,再推薦最應先處理的一件。只有用戶同意逐件處理後,才展開該件的細節。
   - 單一新件時,先顯示總覽表,欄位包括 `來源`、`主題`、`版本`、`類型`、`建議狀態`、`建議下一步`;接著用一段摘要說明對方交來甚麼,再列預檢結果表。
   - 讀取交接包後,先做收件完整性預檢:共同目標、本方 / 對方任務邊界、交叉點、請本方做的事、不應誤解的事、證據位置、風險 / 未決事項是否足夠。預檢結果以表格顯示,欄位為 `檢查項`、`結果`、`說明`。若有缺漏或不足以回應,不要直接執行,先提醒用戶 B,並轉入補交需求流程。
   - 接著做「本機對接檢查報告」,用於判斷交接內容能否和收件方目前工作環境接上。報告必須方便快速閱讀,建議順序為:`🔎 交接重點`、`📌 本機已知狀態`、`✅ 可直接對接`、`⚠️ 需要確認`、`❌ 不可開工原因`、`🚀 建議下一步`。檢查範圍包括:本機 `.aps/config.json` 是否指向同一 project、交接包版本是否最新、交接要求是否與本機當前任務或已讀文件衝突、證據位置是否是本機可讀的相對位置或共用 Drive 資料夾標識、是否誤用了發送方本機路徑、是否缺少必要背景或檔案版本。不可因為收到 packet 就直接開工。
   - 若欄位齊全,再判斷共同目標、任務邊界、檔案版本、要求與本方已知狀態是否一致。若不一致,不要直接執行,轉入共識確認子流程。只有完整性預檢與本機對接檢查都通過,才可建議用戶開始處理、標記已消化或回覆。
5. **補交需求流程**:
   - 若交接包不完整,先向用戶 B 說明缺甚麼、為何影響回應、需要 A 補交甚麼。
   - 生成補交需求包,topic 可用 `<原 topic>_missing_info` 或 `aps_missing_info`。body 必須包含缺漏清單、需要補交的資料、為何需要、B 目前能否先做局部工作。
   - 生成可複製貼上的摘要式通知,請用戶 A / Agent A 補交資料。
   - 在 A 補交前,不要把原交接 close。預設不要 consume 原交接,讓它下次 `check Drive` 仍然可見。只有在用戶 B 明確想把它標為已讀 / 等待補交時,才可 consume,且 result 必須寫「已讀,等待補充資料」而不是 `done`;同時要提醒用戶 B:一旦 consume,原交接不會再以 pending 形式出現,後續要靠補交需求包與 A 的修訂 / 補充包追蹤。
   - A 補交時,若原交接尚未收結且仍由 A 擁有,優先請 A 用 `revise` 修訂原 packet,保留同一條交接線。若 A 的工具版本不支援 `revise`、原 packet 已不適合修訂、或補交內容屬新分支,才請 A 發一個 supplemental packet,topic 用 `<原 topic>_supplement` 或同等清楚名稱。
   - 收到 A 的修訂 / 補充包後,重新做收件完整性預檢;通過後才進入消化與回覆。
6. **讓用戶決定是否消化**:
   - **讀取並消化**:先 Read 對應 `packet.md` 全文,顯示重點與原文位置;用戶確認後才寫入 ack。
   - **稍後再讀**:不寫 ack。告訴用戶下次再說「check Drive」仍會看到它。
   - **請對方撤回或修正**:不寫 ack。生成一段通知短訊,請原發包一方用 `npx aps revise ...` 或 `npx aps withdraw ...` 處理;若對方仍使用 0.2.0 或更舊版本而這兩條命令不存在,請原發包一方另發新包,不要手寫 outbox。
7. **寫入消化記錄**:
   ```text
   npx aps consume --packet-id <packet_id> --version <version> --result "<one-line result>"
   ```
   `result` 必須是具體一句話,例如 `Read kickoff and preparing reply`;不要只寫 `done`。
7. **如要回覆**:用戶若要回包,轉入發佈子流程,topic 可用 `<原 topic>_reply`。向用戶確認回覆目標,並協助把目前工作結果整理成對方可直接接手的內容,而不是只說「請自行輸入 publish 命令」。
8. **如要收結自己之前的包**:只有在用戶是原發包者,且對方已回覆或明確完成後,才進入收結動作:
   ```text
   npx aps close --packet-id <packet_id> --reason "<reason>"
   ```
   `close` 只可關閉自己 outbox 內的 packet;CLI 會拒絕不存在或已關閉的 packet。向用戶說明 close 代表「這條交接線已完成,之後啟動時不再列為待辦」。

失敗處理:
- 若 `inbox` 失敗,先檢查共用 Drive 資料夾路徑、project slug、agent id 是否與設置紀錄一致。
- 若 `consume` 回報 ack file 不存在,不要手寫 JSON;回到設置子流程補建 Hub skeleton。
- 若 `close` 回報 packet 不在自己的 outbox,不要代用戶關閉對方 packet;請用戶確認 packet id 或改由原發包一方操作。

## 8. 共識確認子流程

觸發來源:第 3 節「共識確認」路由命中,或收件時 AI 判斷交接內容與本方狀態不一致。此流程用來把問題回饋給對方 agent,不是讓 AI 單向吸收 prompt 後硬做。

1. **停工並說明原因**:用一句話告訴用戶「目前不適合直接執行,需要先確認共識」。不要把未確認的交接包當成已批准任務。
2. **整理差異表**:
   - 對方交接包的共同目標 / 任務要求。
   - 本方已知目標 / 任務要求。
   - 衝突或不確定之處。
   - 若直接開工可能造成的風險。
   - 需要對方確認的一至三個問題。
3. **不要收結原交接**:若原交接尚未被確認完成,不要 close。若已讀取內容,可用具體 ack result 表示「已讀,但受阻於共識確認」;不得寫 `done`。
4. **發出共識確認包**:轉入發佈子流程,topic 用 `<原 topic>_clarification`、`alignment_check` 或同等清楚名稱。body 必須包含差異表與問題,並明確要求對方 agent 回覆確認、修訂或撤回。
5. **生成可複製貼上的通知**:輸出摘要式通知,可貼到 Telegram、WhatsApp 或 Email。訊息必須包含:有共識確認包、topic / packet id、`🔎 重點摘要`、`⚠️ 注意事項`、請對方本人確認後再叫 AI 說「check Drive」。skill 不代發外部訊息,亦不自動觸發對方 AI。
6. **等待對方回覆**:在收到對方確認前,不要把共識確認後續工作當成已批准。若對方修訂原交接,讀新版本再重新判斷;若對方撤回,向用戶回報原任務取消或等待新指示。
7. **確認後才開工**:只有當共同目標、各自任務邊界、交叉協作點、下一步輸出都清楚後,才回到正常發佈 / 收件 / 執行流程。

## 9. 補救子流程 + 6 件不可自動做的事

觸發來源:第 3 節「出錯 / 補救」路由命中。此子流程優先使用只讀 `npx aps doctor` 診斷 Hub skeleton、ack、outbox 與衝突檔名;不自動刪除、移動、重命名或覆寫任何檔案。任何結構性檔案操作,均須先列出目標路徑、影響範圍與可回復方式,再取得用戶明確確認。

### 9.1 起手 triage

問用戶 5 種 failure mode 屬哪一類。若用戶語句已暗示某類(例如「sync 唔到」 → Mode 1),skill 跳過 triage 直接進入該 mode。

### 9.2 5 種 failure mode 之對應行動

| Mode | 偵測 | 行動 | dialogue ref |
|---|---|---|---|
| 1. 同步問題 | 先跑 `npx aps doctor` 與 `npx aps inbox`;若對方仍未見,請用戶查看 Drive 桌面版同步狀態 | 提示用戶在 Drive 桌面版「立即同步」,等 2-3 分鐘後用戶說「重 check」即重做 doctor / inbox check | §4.2 |
| 2. Conflict(lock file) | 用戶報告 `~$xxx.md` 存在 | 提示關閉打開該檔之 app + 等 1-2 分鐘 Drive auto release;若仍在,只列出 cleanup 計劃與目標路徑,取得明確確認後才可用安全檔案操作處理 | §4.3 |
| 3. Wrong-lane | Read 該 packet header,比對 sender 欄 vs 所在 lane 資料夾名 | 先列出來源路徑、目標路徑與影響範圍;取得明確確認後才可移動 packet;通知用戶傳 WhatsApp 告訴對方 | §4.4 |
| 4. Packet 格式錯誤 | Read 該 packet,parse header;若缺欄(`packet_id` / `version` / `from` / `to` / `project` / `level` / `created_at` 之一)即 invalid | 先提出修復計劃;優先請原發包一方用 `revise` 發新版本,或在未被消化前用 `withdraw` 撤回;不要直接改已發佈 packet | §4.5 |
| 5. 版本不對齊 | 用戶報告兩邊 Bridge Pack 不同 version | 提示雙方使用同一份已驗證 Bridge Pack fixture。目前尚未實作自動更新命令;不得建議用戶執行不存在的命令。skill 可代生成 WhatsApp 短訊告訴對方改用目前有效的更新方式 | §4.6 |

### 9.3 6 件 skill 不可代用戶執行的事(全程堅守)

完整長版說明見 repo 內 dialogue script §4.7;若此 skill 由 npm package 安裝,只依本節要點執行,不得假設 `docs/plans/` 檔案存在。要點:

1. WhatsApp 短訊由用戶手動發 — skill 只生成短訊文本。
2. 對方電腦的 onboarding 不在當前 session 範圍。
3. 雲端硬碟同步延遲由用戶等。
4. Packet 內容由用戶 review 後寫入。
5. Sensitive payload 路由由用戶決定 — 偵測 credentials / API key / unredacted PII 即停手 + 提示用戶改用 out-of-band channel。
6. PROTOCOL.md 升級 sign-off 由用戶 review CHANGELOG。

## 10. Cross-link

- `references/setup-dialogue.md` — bundled setup wording bank;npm package runtime 可讀
- `docs/plans/2026-05-23-aps-skill-dialogue-script.md` — repo 內長版 dialogue companion / 維護稿
- `dev/qc/2026-05-22-zero-knowledge-funnel-audit.md` — funnel audit + Layer 設計理據
- `docs/guides/aps-onboarding-walkthrough.html` — 詳細設置教學(維護者 / 深入參考層)
- `docs/plans/2026-05-20-agent-public-square-design.md` — 協定設計文件
- 共用 Drive 資料夾內的 `_hub/PROTOCOL.md` — 協定 v1.0 契約
