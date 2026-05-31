# AI Public Squares 公開產品路線 — Reliable Peer Handoff 與無雲端 API 原則

建立日期：2026-05-28
狀態：產品需求與技術方向草案；未代表功能已實作
適用範圍：AI Public Squares 通用模板與 npm package 後續版本

---

## 一、撰寫原因

APS 0.2.x 已完成二人最小交接路徑：安裝、初始化、Hub skeleton、packet、inbox、ack、revise、withdraw、close、doctor 與自然語言日常使用的前期規格。近期 UAT 先暴露 Reliable Pair 必須做穩；其後 Adam 的新實測再暴露一個更根本的產品模型問題：

1. 單次交接應保持一對一，因為 packet、ack、revise、withdraw、close 的責任邊界清楚。
2. 但一個長任務或一個 project 生命週期內，不應被 `.aps/config.json` 的單一 `otherAgentId` 限死。例如 part 1 交給 Jay、part 2 交給 Fanny、part 3 交給 Jackie，這是合理主流程，不是高階多人平台。
3. 新用戶旅程必須支援「已安裝者可以簡單邀請下一位協作對象加入」，否則產品延展性與自然擴散能力不足。

因此，本文件最新口徑修正為 **Reliable Peer Handoff**：一個 project 可以有多個 peers；每次交接仍是一個 packet 對一個 peer。近期下一版不跳到真正多人平台、不做多收件人 packet、不做群聊、不做自動通知；但必須解決 project-level peers、邀請新協作對象、發包選 peer、收件多來源總覽與 sent/status 查詢。Project Peers 穩定後，下一個值得設計的增量是 Project Context Index：只作高層背景索引，幫 AI 看懂整個 project 的分段交接脈絡，但不得代替 packet、outbox、ack 或 peer cards 成為執行真相。

---

## 二、核心決策

| 決策 | 內容 |
|---|---|
| 近期主線是 Reliable Peer Handoff | 一個 project 可有多個 peers；每次 packet 仍只發給一個 peer。先解決 Jay / Fanny / Jackie 這種長任務分段交接，不跳到真正多人平台。 |
| Project Peers 是已發佈基線 | `peers` / `peer add` / `peer starter` / `publish --to` / `inbox --from` / `inbox --all` / `status` 已屬 Reliable Peer Handoff 基線。它不是群聊、不是多收件人 packet、不是權限系統。 |
| Project Context Index 是後續背景索引 | 它只整理 project-level 脈絡、最近 packet 線索、工作流分段、未決問題與風險；不可覆寫 packet / outbox / ack，不可變成任務管理系統或自動分派機制。 |
| 共享層仍用同步資料夾 | 核心只依賴使用者已掛載到本機的 Google Drive、Dropbox、OneDrive 或其他同步資料夾。 |
| 不把雲端 API 作為核心依賴 | 不要求 Google Drive API、Dropbox API、OneDrive API、OAuth app、雲端 token 或平台開發者設定。 |
| Google Drive 是已驗證路徑 | 目前維護者實測與文件主要驗證 Google Drive for Desktop；其他同步資料夾可作實驗路徑，不能先寫成正式支援。 |
| 真正多人協作延後 | 多人只是長線方向；近期不做多方共用收件箱、不做多人同一 packet、不做聊天室式公共目錄。 |
| 摘要式人類通知屬主流程 | 每次交接後必須產生 copy-ready 摘要式通知與手動 `check Drive` 下一步；`check Hub` 只作舊稱相容。通知可以經 Telegram、WhatsApp、Email 或其他渠道由人傳送,但只通知人,不自動觸發對方 AI。 |
| 自動化／背景通知／排程非 APS 範圍 | 檔案式 `_notify`、`aps watch`、桌面通知、OS／AI 平台排程、背景檢查與 Telegram bot 自動代發都不屬 APS,亦非延後路線,而係明確劃出範圍以外(見第五節)。若日後需要,屬 AI 工具／OS／通訊軟件或另一項產品。 |
| 人類可保留打斷控制權 | 通知必須讓收件人先讀懂重點與注意事項,再由收件人本人決定何時叫 AI 介入;不得因通知自動 consume、close、revise 或 withdraw。 |
| 群組只是發送別名 | 群組不等於一個可寫 lane，除非它真是一個獨立 agent。向群組發送時，工具應展開成個別 agent 收件對象或要求使用者選擇。 |
| 第一版 Contacts 不做多收件人 packet | 群組發送先展開為多個單收件 packet；每個收件人各有自己的 packet / ack 狀態，避免在 v1.0 語義下暗改 `to` 欄位。 |
| APS 不提供資料夾權限隔離 | 同步資料夾內的可見性由雲端資料夾權限與本機檔案系統決定；APS 只能標示本機可見資料，不聲稱能限制誰讀哪條 lane。 |

---

## 三、近期產品終點畫面

近期理想日常流程不是「多人平台」，而是同一 project 內可選 peer 的可靠一對一交接：

```text
把這部分交給 Fanny。
```

AI 應完成以下事情：

1. 讀取本地 APS 設定,確認本機 agent、project slug 與 Hub root。
2. 讀取 project peers；若 project 尚未啟用 peers，從 `.aps/config.json` 的 `otherAgentId` 生成二人相容視圖。
3. 確認本次收件人是 Fanny，並顯示 Fanny 的 agent id、狀態、lane 與 starter pack / ack 是否已存在。
4. 若 Fanny 尚未加入，先走「邀請 Fanny 加入這個 APS project」流程，不假裝已可發正式交接。
   starter pack 必須提醒 Fanny 先在自己的項目資料夾初始化 Agent Handoff Kit，再執行 APS 安裝與 `npx aps init`；否則乾淨資料夾會缺少治理入口而不能接入 APS。
5. 執行健康檢查與收件狀態檢查。
6. 整理共同目標、本方任務、Fanny 任務或「未確認」、交叉點、請 Fanny 做的事、證據與風險。
7. 做發送前完整性預檢。
8. 向使用者顯示摘要、收件人、topic、寫入位置與預檢結果。
9. 取得明確確認後才用單收件 packet 寫入 Hub。
10. 寫入後產生 copy-ready 通知文字，包含項目、來源、收件人、主題、交接編號、重點摘要、注意事項與 `check Drive` 下一步，讓使用者透過既有渠道通知 Fanny。

若使用者輸入的是群組名稱，例如 `launch_team`，目前不應直接建立 `from_launch_team`，也不應建立多收件人 packet。正確做法是提醒群組發送尚未支援，要求使用者選擇一位 peer，或在後續版本才由群組展開成多個單收件 packet。

接收方的理想流程應是：

```text
check Drive
```

AI 應先顯示所有本機可見來源的總覽，再列細節；不完整或不一致時，先要求補交或共識確認，不預設 consume。背景自動通知、桌面通知、排程不屬 APS 範圍(見第五節)。

收件方輸入 `check Drive` 後,AI 不應只列出交接包 ID。它要產生一份可快速閱讀的收件報告:先摘要交接重點,再做完整性預檢與本機對接檢查,核對本機 `.aps/config.json`、任務要求、已讀文件、證據位置與版本狀態是否能接上。只有交接內容完整、與收件方本機狀態一致,才建議開工或標記已消化;否則先發補交需求或共識確認包。

### 3.1 發送方 UX：從一句話到可交出的包

發送方的核心體驗不是「填表」,而是「AI 先整理,人最後批准」。Adam / 發送方只需要說明想交給誰與交甚麼;AI 需要把散落背景整理成可由對方 AI 接手的結構。

發送流程應固定為:

1. **識別任務與收件 peer** — AI 先讀 `.aps/config.json`,確認本機 agent、project slug 與 Hub root；再讀 project peers。若沒有 `_peers/`，才由 `otherAgentId` 生成二人相容視圖。使用者說「交給 Fanny」時，AI 要先把 Fanny 對應到穩定 `agent_id`，不能硬套單一對象。
2. **收集上下文** — AI 從目前對話、已讀檔案、最近任務狀態與用戶明示內容整理草稿;不要求用戶手填所有欄位。
3. **整理交接包正文** — 正文必須分清共同目標、本方任務、對方任務或「未確認」、交叉點、請對方做的事、不應誤解的事、證據位置、風險 / 未決事項。
4. **發送前預檢** — AI 用表格標示哪些欄位已齊、哪些由上下文推得、哪些仍未確認。缺關鍵資料時先停下問;非關鍵資料可寫成未確認,不得假裝已知。
5. **人手確認** — AI 必須同時請用戶確認三件事:內容完整 / 正確、topic 正確、可以寫入 APS Hub。未確認前不得 publish。
6. **寫入 Hub** — 長正文使用 `--body-file`,避免 shell 引號與多行文字出錯。寫入成功只代表本機同步資料夾已產生 packet,不代表對方已同步。
7. **產生摘要式通知與 sent/status 線索** — 通知不可只列 packet id。它必須幫收件人先看懂「這是甚麼、為何要看、要注意甚麼、何時叫 AI 介入」；同時保留發送方之後可查的 packet id、版本、收件 peer 與目前狀態。
8. **交給人發送** — 發送渠道可以是 Telegram、WhatsApp、Email 或其他工具;APS 不代替人決定何時打擾對方,也不把通知寫成遠端控制 AI 的指令。

發送完成畫面應包含:

```text
✅ 已發佈
📦 交接包: <packet_id> v<N>
🔎 重點摘要: <一至三句>
⚠️ 注意事項: <風險 / 未決 / 不應誤解>
🚀 下一步: 把下方通知貼給對方,由對方本人決定何時 check Drive
```

### 3.2 收件方 UX：從通知到可開工判斷

收件方的核心體驗不是「看到新包就照做」,而是「AI 先對接本機現況,人再批准開工」。Jay / Fanny / Jackie 等任何收件方收到 Telegram、WhatsApp 或 Email 後,只需要在自己的 AI 工具輸入 `check Drive`;之後由 AI 負責檢查。

收件流程應固定為:

1. **讀本機設定** — AI 先讀收件方自己電腦上的 `.aps/config.json`,不可使用 Adam 通知內的本機路徑。
2. **健康檢查** — 跑 `doctor` 或等效檢查,確認 Hub、本機 agent lane、peer lanes、ack、outbox 與衝突檔名狀態。
3. **收件總覽** — 跑 `inbox --all` 或等效總覽,先列待處理項目數量、來源、主題、版本與建議狀態;多個新件時先讓使用者選處理順序。
4. **讀取交接內容** — 讀 packet 全文,但不要直接把全文倒出;先整理重點摘要。
5. **完整性預檢** — 檢查共同目標、任務邊界、請本方做的事、證據位置、風險 / 未決事項是否足夠。缺資料時先發補交需求。
6. **本機對接檢查** — 核對交接內容與收件方本機文件、任務要求、已知狀態、檔案版本、可讀證據位置是否一致。若出現發送方本機路徑、舊版本、任務方向衝突或資料未同步,不得開工。
7. **一致性判斷** — 若交接要求與本機理解不一致,先產生共識確認包;若一致但有小風險,列出風險並請收件方決定是否先做局部工作。
8. **人手決定下一步** — AI 提供清楚選項:開始處理、稍後再讀、要求補交、發共識確認、標記已讀但等待資料。除非 Jay 明確要求,不得寫 ack。
9. **回覆或收結** — 需要回覆時用 APS 發新 packet 或 revise;事情完成後才建議收結,不可用 consume 代替真正完成。

收件報告應固定使用此順序:

```text
📬 收件總覽
<來源 / 主題 / 版本 / 建議狀態>

🔎 交接重點
<一至三句說清楚對方交來甚麼、要本方做甚麼>

✅ 完整性預檢
<共同目標 / 任務邊界 / 請本方做的事 / 證據 / 風險>

📌 本機對接檢查
<設定 / 版本 / 文件可讀性 / 任務一致性 / 本機路徑風險>

⚠️ 需要確認
<缺漏、矛盾或同步風險;沒有則寫「暫無」>

🚀 建議下一步
<開始處理 / 補交需求 / 共識確認 / 稍後再讀 / 標記已讀>
```

此流程的驗收點是:收件方可以在三十秒內理解對方交來甚麼、自己應否開工、哪裡有風險、下一步選項是甚麼。AI 不得把 `check Drive` 簡化成 `npx aps inbox` 的原始輸出。

---

## 四、資料模型方向

### 4.1 目前可保留的基礎

現有設計文件已把 APS 定義為可支援「兩個或多個 AI agent」的中介層，且已採用單寫道、不可變 packet、追加 outbox 與 ack。這些原則仍然成立。

現有二人結構：

```text
<hub_root>/<project_slug>/
  from_<agent_a>/
  from_<agent_b>/
  _ack/
    <agent_a>.ack.json
    <agent_b>.ack.json
```

長線多人結構不需要推翻，只是擴展為「每個真正 agent 一條 lane」。Project Peers 不要求建立多人聊天室或共享收件箱，只需要讓同一 project 能登記多個可交接 peer，並確保每次仍是單收件 packet：

```text
<hub_root>/<project_slug>/
  from_<agent_a>/
  from_<agent_b>/
  from_<agent_c>/
  _ack/
    <agent_a>.ack.json
    <agent_b>.ack.json
    <agent_c>.ack.json
```

`design_team` 只有在它是一個真正會獨立登入、收件、回覆、維護 ack 的 agent 時，才可成為 `from_design_team/`。若它只是多人的稱呼，應放在群組別名，不應建立 lane。

### 4.2 需要新增的 Project Peers

Project Peers 應新增可機讀、可人工檢查的 peer cards。為保留單寫道原則，不建議把所有人同時寫進同一個大型 JSON。較穩妥的方向是每個 agent 自己維護一張 peer card，再由工具讀取整個目錄：

```text
<hub_root>/<project_slug>/_peers/
  agents/
    <agent_id>.json
```

peer card 草案：

```json
{
  "project": "example_project",
  "agent_id": "adam",
  "display_name": "Adam",
  "lane": "from_adam",
  "status": "active",
  "peer_state": "confirmed",
  "updated_at": "2026-05-28T00:00:00Z"
}
```

群組別名只可作後續發送輔助，不屬 v0.2.9 主線。若日後加入，應另放 owner-scoped 檔案，且只把群組展開成多個單收件 packet，不改 lane 與 ack 語義：

```json
{
  "project": "example_project",
  "owner_agent_id": "adam",
  "groups": [
    {
      "group_id": "launch_team",
      "display_name": "Launch Team",
      "members": ["adam", "design_agent"]
    }
  ],
  "updated_at": "2026-05-28T00:00:00Z"
}
```

設計原則：

- `agent_id` 仍是穩定機器識別碼，不一定等於真人姓名。
- `display_name` 只為人類閱讀。
- 群組只是發送輔助，不改變每個 agent 單寫自己 lane 的規則。
- 每張 peer card 由該 agent 自己寫；邀請者只可建立候選資訊或 starter pack，不可替對方確認身份。
- 若同一個 group id 被不同 owner 定義，工具必須顯示衝突並要求使用者選擇，不可靜默合併。
- 舊版二人 `.aps/config.json` 仍應可運作；沒有 `_peers/` 時，工具可由 `agentId` / `otherAgentId` 暫時生成一個唯讀相容視圖。

peer 生命週期：

| 狀態 | 寫入責任 | 用途 |
|---|---|---|
| `provisional` | 邀請者可建立候選草稿 | 尚未確認的新成員；只可用於顯示邀請計劃，不可視為已可收件 agent。 |
| `confirmed` | 該 agent 首次 `init` / `join`，**或該 agent 從自己機器 publish / consume 過 packet（真實自我活動）後自動確認自己** | 正式可用的 peer；可建立 lane、ack 與日常收件狀態。 |
| `inactive` | 原 owner 或該 agent 明確標示 | 保留歷史資料，不再作為新交接預設收件人。 |

邀請者不得替對方建立 confirmed peer card。若對方尚未加入，AI 應把它標為候選對象，並生成 starter pack / 通知文字，而不是假裝對方已可收件。

**確認與可收件判斷（0.2.11 起，真機 UAT 修正)**：`confirmed` 只能由該 agent 自己觸發 —— 首次 `init` / `join`，或該 agent 從自己機器 `publish` / `consume` 過 packet（真實自我活動）即自動確認自己；任何一方都不得代寫他人的 `confirmed`。`publish --to <peer>` 的收件人閘採三檔：`confirmed` → 放行；`provisional` 但有真實自我活動證據（自己 lane 有 publish 事件，或自己 ack 有 consumed 紀錄）→ 放行並提示狀態待修復；`inactive`、未註冊、或無任何活動證據 → 擋。空 lane / 空 ack 只代表骨架已由 `init` / `peer add` 建好，不代表該 agent 已加入，故不可單憑 lane / ack 存在判定可收件。授權判斷只用 `agent_id` / packet `to` / ack / 活動證據，**永不**使用 role。此修正源於真機 UAT：一個已 publish / consume 的活躍 agent 若仍卡在 `provisional`，會令對方無法回覆，與對稱 lane + ack 模型矛盾。

### 4.3 收件計算方向

現有 `inbox` 可計算「對方給我」的 pending。Project Peers 需要把單一對方擴展成多來源總覽、指定來源收件與發送方 sent/status 查詢；長線多人後才擴展群組方向：

| 指令方向 | 用途 |
|---|---|
| `aps inbox` | 看指名給本 agent 的新件 |
| `aps inbox --all` | 顯示本機可見 lane 的總覽，供排錯與人工核對 |
| `aps inbox --from <agent_id>` | 只看某個來源 |
| `aps inbox --for <agent_id>` | 以指定 agent 身份計算 pending，用於測試與維護 |
| `aps peers` | 顯示本項目的可用 peers 與狀態 |
| `aps peer add --agent-id <id>` | 建立或更新 peer 候選資訊、lane、ack 與 starter pack 計劃 |
| `aps peer starter --agent-id <id>` | 重新產生給該 peer 的 starter pack / copy-ready 邀請 |
| `aps status --packet-id <id>` | 讓發送方查看指定 packet 的版本、收件 peer、ack、reply / close 事件與未決狀態 |

Project Peers 發送的收件計算仍以 `(packet_id, version)`、`to`、ack 與 outbox 事件為準。v0.2.9 不支援同一 packet 多個收件人；若日後支援群組發送，應展開成多個單收件 packet，讓每個收件人各自 ack、補交、回覆與收結。若未來支援多收件人，`to` 欄位應明確定義為單值或陣列，並需要協定版本升級；不可在現有 v1.0 語義下暗改。

`aps inbox --all` 不是權限功能。它只表示「本機同步資料夾目前可讀到的 lane 總覽」。若雲端共享資料夾本身讓使用者看見某些檔案，APS 不應聲稱可以在工具層阻止閱讀；真正權限仍由雲端資料夾分享設定與作業系統檔案權限決定。

### 4.4 Project Context Index 設計真源

本節是 Project Context Index 的唯一設計真源。其他文件、技能、公開頁、交接紀錄或檢查清單只可引用本節、摘要本節的目前發佈狀態，或記錄已驗證結果；不得另立一套欄位、權威順序、新鮮度規則、更新規則或 HTML 行為規則。若本節內容改變，先合併或退役其他位置的重複描述，避免一條規則多處維護。

Project Context Index 的目的，是讓同一個 project 內多位 peer 分段交接時，AI 能先掌握高層背景，再讀具體 packet。它降低理解成本，但不提高事實權威。權威順序固定如下：

1. packet、outbox、ack：唯一執行真相。
2. peer cards：身份、lane 與 peer 狀態真相。
3. Project Context Index：背景索引與閱讀導航，只能輔助理解。

#### 4.4.1 資料位置與寫入邊界

資料位置固定為：

```text
<hub_root>/<project_slug>/_context/
  from_<agent_id>/
    context.log.md
```

每個 agent 只可追加或更新自己名下的 `context.log.md`。工具可以讀取整個 `_context/` 形成總覽，但不得要求多人共同改同一個大型檔案。任何總覽檔、HTML、終端摘要或報告都是派生視圖，必須能追溯回原始 packet / outbox / ack / peer card / 明確文件來源；不得把派生視圖當成可執行命令來源。

第一版不承諾背景自動刷新。更新只可由明確事件或明確指令觸發，例如 AI 在完成收件摘要、發包預檢、回覆整理或使用者要求重新整理背景索引時，根據可追溯來源更新自己名下的 context log。若沒有更新動作，索引不會自動變新；介面必須如實顯示最後更新時間與可能過期狀態。

#### 4.4.2 內容欄位

Project Context Index 每條索引項至少要有以下機器可讀 metadata：

```json
{
  "updated_at": "2026-05-28T00:00:00Z",
  "source_agent": "adam",
  "source_packet": "20260528T000000Z__example",
  "source_version": 1,
  "status": "background_only"
}
```

可用欄位與限制如下：

| 欄位 | 用途 | 限制 |
|---|---|---|
| `workstream` | 標示長任務分段，例如 research、design、release、review。 | 只作背景分類，不代表權限或責任分派。 |
| `current_focus` | 說明本 agent 最近處理的方向。 | 不可覆蓋最新 packet 要求。 |
| `waiting_on` | 標示目前等待哪位 peer、哪個 packet 或哪份證據。 | 不可自動催促對方或觸發通知。 |
| `decision_refs` | 指向已確認決策的 packet / outbox / 文件位置。 | 每項都要有來源，不可寫無根據結論。 |
| `open_questions` | 記錄跨 peer 仍未釐清的問題。 | 不可把問題包裝成已定案事項。 |
| `risk_notes` | 記錄本機路徑、版本、同步延遲、資料不一致等風險。 | 不可包含 credentials 或把某台電腦路徑寫成所有人通用。 |
| `recent_packet_refs` | 列出近期重要 packet id、版本、來源與收件人。 | 只作索引；狀態仍以 outbox / ack 計算。 |
| `source_refs` | 列出本條內容引用的 packet / outbox / ack / peer card / 文件來源。 | 缺來源即不得當成事實；來源失效時必須標示未能核實；`file:` 來源只可指向同一 project 內的檔案。 |

禁止欄位：`assignee`、`due_date`、kanban 狀態、自動優先級、提醒時間、責任評分、平台通知狀態。這些欄位會把背景索引推向任務管理系統，不屬 APS 第一版 Project Context Index。

#### 4.4.3 新鮮度與防漂移

Project Context Index 不保證自動最新，只保證「有來源、有時間、可檢查」。讀取或呈現時必須導出以下狀態之一：

| 狀態 | 判斷 | 對用戶呈現 |
|---|---|---|
| `current_by_sources` | 來源存在，未發現更新的 packet / outbox / ack 與本條內容衝突。 | 可作背景理解，但仍不是執行真相。 |
| `possibly_stale` | 發現較新的相關 packet / outbox / ack，或 context 更新時間早於關鍵來源。 | 提醒可能過期，先讀最新 packet。 |
| `unverified_source` | `source_refs` 指向的來源不存在、不可讀或未同步。 | 標示未能核實，不可當成事實。 |
| `conflict_packet_wins` | context 與 packet / outbox / ack 不一致。 | 明確以 packet / outbox / ack 為準，context 只作過期背景。 |

任何 `check Drive`、`aps context`、HTML 速覽或發包預檢若引用 Project Context Index，必須先顯示或內部檢查新鮮度狀態。若無法檢查，結果只能標示為未核實；不得用「索引存在」推斷「索引新齊」。

#### 4.4.4 使用者流程位置

收件側流程：收到人手通知 → 執行 `check Drive` → AI 讀本機設定與健康狀態 → 讀 Project Context Index 作背景 → 讀最新 packet / outbox / ack 作執行真相 → 顯示「對方交了甚麼、我該不該做、下一步是甚麼」→ 使用者決定處理、補問、對齊或稍後再看。

發件側流程：整理交接前可讀 Project Context Index，檢查本次 packet 是否缺少工作流背景、決策來源、等待事項或風險說明；但是否發送、發給誰、內容是否正確，仍以使用者確認與 packet 寫入為準。

#### 4.4.5 人類呈現層與 Daily Index

人類呈現層是唯讀 `Project Dashboard / Daily Index`。它不只顯示 `_context/from_<agent_id>/context.log.md` 背景索引，也要讀取本機可見的 packet / outbox / ack / peer cards，讓用戶每日回到項目時先知道「我有沒有要處理、我發出去的交接對方有沒有標記處理、應先讀哪些來源」。Dashboard 可以反映已同步到共用 Drive 資料夾的明確狀態，例如 `_ack/<peer>.ack.json` 已記錄對方標記處理、outbox 已有 close 或 withdraw；但不得把「已寫入共用 Drive 資料夾」推斷成「對方已收到通知」或「對方已閱讀」。不可由 AI 逆向解析 HTML 來取得機器資料；機器資料仍以原始 packet / outbox / ack / context log 為準。

標準命令為 `aps dashboard`，輸出 `_context/dashboard.html`。`aps context html` 可保留作技術入口或相容入口，但不應再只輸出純背景表；它可以沿用 Daily Index 的視圖或生成同等唯讀速覽。

HTML 沿用 `docs/` 既有視覺語言，但必須守以下界線：

1. 頁頂固定顯示：執行真相一律以 packet / outbox / ack 為準；Dashboard 只讀已同步資料，可以反映已存在的 ack / close / withdraw 狀態，但本身不會通知、不會標記處理、不會收結。
2. 首屏顯示待本機 agent 處理的新交接、由本機 agent 發出的交接狀態、尚未看到對方處理的數量，以及背景索引提醒數。
3. 顯示「建議先讀」清單：packet、Google Drive / Google Docs URL、同一 project 內的相對檔案或其他可追溯來源。Google Drive / Docs 連結可以是 `url:https://...` 來源；本機 `G:\...` 或 `C:\...` 路徑不可當成跨機通用連結。
4. 顯示來源 agent、來源引用與新鮮度狀態。
5. 顯示 peer 狀態與風險 / 未決事項，例如 peer 未 confirmed、context 來源過期、context 與 packet 衝突、outbox 不可讀。
6. 按需生成，不做背景自動刷新、不加 build step、不承諾即時更新。
7. 永遠唯讀，不加打剔、改狀態、拖卡、截止日期、提醒或責任分派。

參考樣板（假資料、不接生成邏輯、gitignored）：`dev/qc/evidence/2026-05-30-context-index-mock/index.html`。樣板只示範視覺方向，不是資料契約；資料契約以本節為準。

#### 4.4.6 驗收

第一版落地前至少通過以下驗收：

- 沒有多人共同寫同一個 context 大檔。
- 舊 project 沒有 `_context/` 時，`publish`、`inbox`、`status`、`consume`、`close`、`doctor` 仍正常。
- 每條 context entry 都有 `updated_at`、`source_agent`、`status: background_only` 與可追溯來源。
- `source_agent` 必須是合法 agent 名稱；`file:` 來源不可跳出同一 project。
- 禁止欄位必須由 `context check` 阻塞，而不是只留在文件警告。
- 來源不存在、來源較新或內容衝突時，報告能標示未核實、可能過期或以 packet / outbox / ack 為準。
- 若 context 指向舊 packet 版本，而同一 packet 已有較新版本，必須標示可能過期；`context add` 的去重必須精準比較來源引用，不能把 `v1` 誤認成 `v11`。
- `aps context`、`aps context check`、`aps context add`、`aps context html`、`aps dashboard` 不會寫 outbox、ack、packet，不會 consume、close、revise 或 withdraw；`context add` 只可寫執行者自己名下的 context log；`context html` 與 `dashboard` 只可生成唯讀衍生快照。
- context 與 HTML 不含 credentials，不把某台電腦的本機 Drive 路徑寫成其他人通用路徑。
- `check Drive` 報告可用 context 輔助說明背景，但仍先以 packet 摘要、完整性預檢與本機對接檢查作決策入口。
- `dashboard` 首屏必須回答「待你處理」「你發出的交接狀態」「建議先讀」「風險與未決」四件事；即使沒有 `_context/`，仍應能顯示 packet / outbox / ack 讀到的日常狀態。
- `dashboard` 顯示已發出交接時，只可用明確狀態文字：`尚未看到對方標記處理`、`對方已標記處理（ack 已記錄）`、`已收結`、`已撤回`。不得寫成「對方已收到」，除非協定日後新增可核實的接收事件。
- 不新增自動分派、排程、催辦、看板或項目管理承諾。

---

## 五、自動化、背景通知與排程:非 APS 範圍

APS 的價值是「靠同步資料夾交換結構化交接包 + 人手通知」,核心刻意保持 human-in-loop:發送方寫入交接包後,由人手把 copy-ready 摘要(經 Telegram、WhatsApp、Email 或任何渠道)傳給對方,對方本人自行在自己的 AI 工具輸入「check Drive」收件。APS 不會自動彈提示,也不自動觸發對方 AI。

以下一類「自動化／背景通知／排程」能力**不屬 APS 範圍**,亦不是延後路線,而是明確劃在 APS 以外:

- 檔案式 `_notify` 通知層。
- `aps watch` 背景或前景輪詢。
- OS 排程(Windows 工作排程器、macOS launch agent、Linux systemd / cron)。
- AI 平台排程(Claude Code scheduled tasks / Desktop tasks / Routines、Codex automations、Antigravity scheduled tasks)。
- 桌面通知(Windows toast、macOS / Linux notification)。
- Telegram bot 自動代發,或把外部訊息自動推入運行中的 AI session。

理由:同步資料夾本身不保證即時推送或喚醒 AI;要做「對方未開 AI 都會知道」這種能力,責任應落在 AI 工具、作業系統或通訊軟件本身,或屬另一項產品,而不是 APS 核心。把它收進 APS 只會擴大權限、同步與「看到提醒=已處理」的誤解風險,違背低門檻、人手確認的定位。

因此 APS 對通知只承諾一件事:每次發包後產生一段可直接複製、含重點摘要與注意事項的人手通知,由人決定何時提醒對方;收件方何時 `check Drive` 由人手掌握。APS 不承諾雲端即時推送、不承諾對方關機仍可通知、不承諾 AI 未開啟時自動回覆。若日後真的有人需要上述自動化,應以外部整合或另一項產品處理,不混入 APS 核心。

---

## 六、外部平台研究摘要

以下資料於 2026-05-28 以官方文件或官方 GitHub 儲存庫核對,只作設計原則參考,不作 APS 核心依賴。原先列出的 Telegram bot / Channels / 各平台排程適配表,已隨「自動化、背景通知與排程非 APS 範圍」(第五節)一併移除;如日後有人要做那類自動化,屬外部整合或另一項產品,不在本路線。

### 6.1 同類工具參考與可吸收原則

以下資料於 2026-05-28 以官方文件或官方 GitHub 儲存庫核對。它們多數使用 HTTP、API、SDK、伺服器、webhook 或專用 runtime，不能照搬為 APS 核心依賴；但其設計原則可轉化成「同步資料夾 + 本機 CLI + AI skill」的低門檻版本。

| 參考 | 可學習的設計 | 轉化到 APS 的做法 | 不照搬的部分 |
|---|---|---|---|
| A2A protocol | 使用 Agent Card 做能力與身份發現；任務、訊息、artifact、狀態更新分開。 | `_peers/agents/<agent_id>.json` 應接近本地 Agent Card；packet / outbox / ack 要分工清楚。 | 不把 HTTP、JSON-RPC、webhook、OAuth 或 server endpoint 變成 APS 核心要求。 |
| OpenAI Agents SDK handoffs | 每個 handoff 目標要明確註冊；handoff metadata 可用結構化欄位記錄 reason、priority、summary；接收方可過濾上下文。 | 群組別名先展開為明確 agent id；交接包要保留 summary、reason、priority、requested action；發送前顯示 AI 將交給哪一位或哪幾位；第一版只建立多個單收件 packet。 | 不讓模型臨場猜收件人；不把 APS packet 混同於同一 session 內的 agent handoff。 |
| LangChain / LangGraph multi-agent | 多 agent 主要解決上下文管理、分工維護、平行化與流程約束；核心難點是 context engineering。 | APS 不應為了「多人」而多人；只有當同一 Hub 真的有多個協作者時才啟用聯絡名單。收件顯示先總覽後細節，避免把整段歷史塞給接收方。 | 不引入複雜 graph runtime 作為普通用戶安裝前提。 |
| Microsoft AutoGen | 分層架構、message passing、event-driven agents、兩人對話與 group chat 是常見模式；新舊版本演進需要明確維護狀態。 | APS 應保持協定層、CLI 層、skill 層、文檔層分開；group 模式要有 owner / manager 語義，不能只是把多人寫入同一檔。 | 不把 AutoGen runtime 或雲端部署作為 APS 依賴。 |
| CrewAI | crews、flows、tasks、guardrails、human-in-the-loop、persist / resume 是成熟產品會處理的基本面。 | APS 後續可把 packet state 明確分為 pending、needs-info、needs-alignment、consumed、closed；任何寫入 Hub 的自動流程都要有人類確認。 | 不採用需要平台帳號、API key 或 enterprise trigger 的做法作為核心流程。 |
| Model Context Protocol | 官方規格、schema、resource boundary、工具 / 資源分離是跨工具整合時的穩定做法。 | APS 的本機 root、Hub root、project slug、agent id 應像資源邊界一樣明確；doctor 必須檢查 AI 是否越界讀寫。 | 不把 MCP server 或 connector 設置變成 APS 必需條件。 |
| AgenticMail 類 agent inbox | 每個 agent 有獨立 inbox / credential；安全掃描與人類審批可防止 agent 外發敏感資料。 | APS 的 `from_<agent>/` lane 與 `_ack/<agent>.ack.json` 應維持隔離；發包前預檢必須保留敏感資料掃描與人類確認。 | 不採用 email server、SMS、API key、外部寄送能力作為核心通知路徑。 |

同類工具參考來源：

- https://a2a-protocol.org/latest/specification/
- https://openai.github.io/openai-agents-python/handoffs/
- https://docs.langchain.com/oss/python/langchain/multi-agent
- https://microsoft.github.io/autogen/stable/
- https://github.com/microsoft/autogen
- https://docs.crewai.com/en/concepts/crews
- https://modelcontextprotocol.io/specification/2025-06-18
- https://github.com/agenticmail/agenticmail

由以上參考轉化出的 APS 設計守則如下。數量不作硬性目標；只保留對 APS 的低門檻、可驗收、可相容方向有實際價值的原則。

| 守則 | 分析 | 落地方式 |
|---|---|---|
| 每個 agent 需要可機讀身份卡 | A2A 的 Agent Card 與 agent inbox 工具都顯示：多 agent 系統若沒有明確身份與能力描述，收件、權限與排錯會很快混亂。APS 需要這一層，但不能把身份卡變成機密或帳號系統。 | `_peers/agents/<agent_id>.json` 只記 agent id、顯示名、lane、狀態與生命週期，不寫 OAuth token、API key 或個人帳號密碼。 |
| 群組只是收件對象展開 | OpenAI handoff 與 LangGraph handoff 都要求目的地明確。若 APS 把群組直接變成 lane，會破壞單寫道與責任追蹤。 | `design_team` 這類名稱先展開為具體 agent id；AI 顯示成員與發送範圍，取得確認後逐一建立單收件 packet。 |
| packet、outbox、ack 不可互相代替 | A2A 把 task、artifact 與 status update 分開,可避免把「看到一段人手通知」誤解為「已處理」。APS 也需要同樣分層。 | 人手通知只代表可能有新件;是否有效以 packet + outbox 為準,是否已消化以 `_ack/<agent>.ack.json` 的 consumed entry 為準。 |
| 聲稱的能力必須明示 | A2A 對 streaming / push notification 要求 capability validation,可防止產品誇大。APS 對任何聲稱支援的能力都應如此,尤其不可把已劃為非範圍的自動化講成將會做。 | `doctor` / `config` 只顯示目前實際支援甚麼;AI 不得說 APS 會自動提醒(APS 不做自動提醒);狀態詞未由 runtime 支援前,UI 不可先承諾。 |
| 長任務要有可恢復狀態，但寫入仍須人類確認 | CrewAI flows 與 LangGraph 強調狀態、恢復與 human-in-the-loop。APS 可吸收這一點，但不能讓背景任務自行 consume、close 或發包。 | 後續狀態可分為 pending、needs-info、needs-alignment、consumed、closed；任何寫入 Hub 的動作仍須使用者確認。 |
| 多 peer 功能只在真有多位 peer 時顯示 | LangChain 文件提醒：不是所有複雜任務都需要多 agent。APS 若把二人用戶迫進多人平台概念，會增加認知負擔。 | 舊二人 `.aps/config.json` 繼續可用；沒有 `_peers/` 時不要求用戶理解群組與多人命令。 |
| 接收方先看摘要、證據與請求 | 多 agent 系統的難點是 context engineering。把完整歷史全部丟給接收方會增加誤讀與成本。 | `inbox` / AI 回覆先顯示總表、摘要、請求、風險與證據位置，再列 packet 細節。 |
| 核心功能維持無雲端 API | AgenticMail、CrewAI 與 enterprise trigger 類工具功能較強，但引入帳號、API key、伺服器或平台設定。這與 APS 的低門檻定位相衝突。 | 核心仍只讀寫本機同步資料夾；Google Drive API、Dropbox API、OneDrive API、OAuth、webhook、伺服器只可作未來可選外掛，不可成為主路徑；APS 不聲稱提供同步資料夾以上的讀取權限隔離。 |

---

## 七、開發分期建議

### 第一段：APS v0.2.8 Reliable Pair 基線

目標：

- 保持 0.2.8 已發佈的 `upgrade`、`--body-file`、品牌版本分流、角色 B 預設與 UAT 修正。
- 發包前確認與收件後總覽要在真實 AI 使用中穩定。
- 完成補交、共識確認、回覆、收結與錯誤補救的自然語言路徑。
- 不把既有兩人路徑打碎；它是 Project Peers 的相容基線。

驗收：

- 新安裝與既有項目升級路徑都可用。
- 使用者一句話可產生 APS packet 草稿、預檢與確認流程。
- 長正文不再透過多行 shell 引號傳入。
- 收件方能先總覽、後細節；不完整時不預設 consume。
- 二人 UAT 可重複跑通，且升級到後續 peer 結構時不破壞舊資料。

### 第二段：APS v0.2.9 Project Peers + Sent Status

目標：

- 新增 `aps peers`。
- 新增 `_peers/agents/<agent_id>.json` 草案落地。
- 新增既有項目的 peer 相容視圖與新增 peer 流程。
- 新增 `aps peer add --agent-id <id>` 與 `aps peer starter --agent-id <id>`，讓已安裝者可簡單邀請下一位協作對象。
- 新增 `inbox --all`、`inbox --from` 作多來源總覽、排錯和人工核對。
- 新增 `status --packet-id <id>`，讓發送方確認對方是否已消化、回覆、收結或仍未處理。
- `publish --to <agent_id>` 只能發給一個 confirmed peer；候選 peer 先走 starter pack / 邀請。

驗收：

- 不破壞既有二人 `.aps/config.json`。
- 舊 project 可從 `.aps/config.json` 生成二人唯讀相容視圖；新增 peer 前必須先顯示計劃並取得確認。
- 邀請者只可建立 `provisional` peer；對方完成加入後才可成為 `confirmed` peer。
- starter pack 必須列明新 peer 的前置步驟：先 `npx --yes @adamchanadam/agent-handoff-kit@latest init`,再安裝 APS 與執行 `npx aps init`。
- 沒有 packet / outbox / ack 被覆寫。
- group 不會被誤建成 lane；除非它是被明確新增的 agent。
- `inbox --all` 只表達本機可見總覽，不表達 APS 權限控制。
- 使用者可說「發給 Jay」，AI 能顯示 Jay 對應的 agent id、lane、狀態與寫入計劃，確認後才發送。
- 使用者可說「Jay 收到未」，AI 能用 `status --packet-id` 或等效讀取說明目前狀態，而不是要求使用者人工翻 ack / outbox。

### 第三段：Project Context Index 背景索引

目標：

- 依第 4.4 的唯一設計真源新增 `_context/from_<agent_id>/context.log.md` 背景索引。
- 讓 `check Drive` 和發包前預檢可讀 project-level 脈絡，但不把 context 當成執行真相。
- 所有欄位、新鮮度、漂移防線、人類呈現層與驗收規則只在第 4.4 定義；本段只記開發分期。

驗收：

- 通過第 4.4 的驗收清單。
- 未新增自動分派、排程、催辦、看板或項目管理承諾。

### 第四段：群組別名與批次追蹤

目標：

- 只在 Project Peers 穩定後，才新增 owner-scoped 群組別名。
- 群組只展開為多個單收件 packet，不引入多收件人 packet。
- 如需追蹤同一批次，新增 batch id 或 outbox 關聯事件；不暗改 `to` 欄位。

驗收：

- `launch_team` 不會被誤建成 `from_launch_team/`。
- 每位收件 peer 都有獨立 packet id、ack、補交、回覆與收結狀態。
- 批次狀態能顯示「誰已處理 / 誰未處理」，但不代替各自 packet 的真實狀態。

### 成功機率與取捨

| 目標 | 粗略成功機率 | 判斷 |
|---|---:|---|
| APS Reliable Pair 基線 | 80-85% | 已有 0.2.x 基礎，主要風險是 UX、升級、UAT 與文檔一致性。 |
| APS Project Peers + Sent Status | 70-75% | 不做真正多人協定，只做 project-level peers、選 peer、單收件 packet 與狀態查詢，風險可控且直接解決 UAT 暴露的核心問題。 |
| Project Context Index | 65-70% | 技術上只是新增背景索引，落地可控；主要風險是 AI 把背景摘要誤當執行真相，或產品膨脹成項目管理工具。 |
| 群組別名與批次追蹤 | 60-65% | 仍可保持單收件 packet，但批次命名、重試與狀態展示需要更多 UX 驗證。 |
| 真正多人平台 | 約 55% | 身份、責任、權限、狀態與同步語義都會放大風險，不應作近期主線。 |

因此，近期產品不應追求「多人平台」或自動通知系統；但也不應把整個 project 限死在單一 `otherAgentId`。正確路線是以 Reliable Pair 為基線，下一步做 Project Peers + Sent Status：一個 project 多位 peer，每次仍是單收件 packet，並讓發送方、收件方都有清楚狀態。Project Peers 穩定後，再加入 Project Context Index 作背景索引，協助 AI 看懂長任務分段與交接脈絡，但不改變 packet / outbox / ack 的權威地位。

---

## 八、風險與防漂移要求

| 風險 | 防線 |
|---|---|
| 把延後或非範圍工具寫成已實作 | README、docs、skill、CLI help 必須標示真正多人、多收件人為延後路線，並標示 notify、watch、平台排程、桌面通知為非 APS 範圍;兩者都不可寫成已支援。 |
| 把近期目標誤寫成多人平台 | 近期主線只可寫成 Reliable Peer Handoff：project-level peers + 單收件 packet + sent/status。真正多人、多收件人屬延後;notify、watch、平台排程、桌面通知屬非 APS 範圍。 |
| 引入雲端 API 設定負擔 | 核心功能禁止要求 OAuth app、API key 或雲端開發者專案。 |
| peer cards 多人同寫造成衝突 | 每個 peer 只寫自己的 card；邀請者只產生候選資訊、lane / ack 計劃與 starter pack，不替對方確認身份。 |
| 邀請者替對方偽造正式身份 | 新 agent 先以 `provisional` peer 表示；只有該 agent 首次加入或確認後才可成為 `confirmed`。 |
| 把 APS 當成自動檢查服務 | APS 不做自動檢查:預設手動 `check Drive`;APS 不提供 watch / scheduled task(非範圍)。提醒由人手通知傳遞,何時介入由收件人決定。 |
| 收到通知即誤當已讀 | 人手通知不是 ack；只有 `_ack/<agent>.ack.json` 的 consumed entry 才代表消化。 |
| 多人群組導致責任不清 | packet 必須明確 `to`、requested action、owner 或 group；缺責任分配時先要求澄清。 |
| 同一 packet 多收件人導致 ack / revise / withdraw 不清 | v0.2.9 只建立單收件 packet；群組別名與多收件人 packet 留待後續協定升級。 |
| 舊二人項目升級時破壞資料 | 升級只可新增 `_peers/`、lane / ack 骨架與 starter pack，不可覆寫 packet、outbox、ack 或 Hub 協定檔。 |
| starter pack 漏掉 Agent Handoff Kit 前置 | starter pack 必須先列 Agent Handoff Kit init；否則乾淨目錄會缺少 `AGENTS.md`、`dev/RULE_PACKS.md` 與 `dev/PROJECT_INDEX.md`,導致 APS init 拒絕接入。 |
| 誤把 `inbox --all` 當權限功能 | `inbox --all` 只表示本機可見資料總覽；真正權限由雲端分享設定與本機檔案權限決定。 |
| Project Context Index 變成新真源 | 依第 4.4 權威順序與防漂移規則處理；不得在本表另立規格。 |
| 背景索引過期或與 packet 衝突 | 依第 4.4 新鮮度狀態處理；不得用索引存在推斷索引新齊。 |
| 輕量項目管理變成產品膨脹 | 依第 4.4 禁止欄位與不做事項處理；不得新增看板、排程、催辦、責任評分或自動分派。 |

---

## 九、版本與相容性要求

下一階段不得一次跳到多人全功能。每個版本應維持下列相容性：

| 項目 | 要求 |
|---|---|
| 既有二人專案 | 沒有 `_peers/`、沒有 `_notify/` 時仍可用現有 `.aps/config.json`、outbox 與 ack。 |
| 新增 Project Peers | 只新增檔案，不改舊 packet，不改舊 outbox，不改舊 ack；`writeConfig` 或等效設定保存不可丟失未知欄位。 |
| 新增 `publish --to` | 只接受單一 confirmed peer；若 peer 未確認，先產生 starter pack / 邀請，不寫正式 packet。 |
| 修正 revise 收件人 | `revise` 通知與後續狀態應沿用原 packet `to`，不可回落到 `.aps/config.json` 的 `otherAgentId`。 |
| 新增 Project Context Index | 只新增 `_context/` 背景索引檔；不改 packet / outbox / ack 語義，不要求舊 project 立即建立 context。 |
| 新增群組發送 | 延後；日後先展開為多個單收件 packet，不改 `to` 欄位。 |
| 協定升級 | 若 `packet.md` 的 `to` 欄位要由單值改為多值，必須升協定版本並記錄遷移策略。 |

---

## 十、深化檢查清單

後續開發前，至少回答以下問題：

1. `_peers/` 是否完全遵守單寫道？
2. group alias 是否只是收件對象展開，不會變成多人共寫 lane？
3. Project Peers 是否仍按已發佈基線與舊二人相容要求處理？
4. Reliable Pair 基線的補交、共識確認、回覆、收結是否仍能穩定 UAT？
5. `publish --to` 是否只接受單一 confirmed peer？
6. starter pack 是否先列 Agent Handoff Kit init,再列 APS 安裝與 `npx aps init`？
7. `revise` 是否沿用原 packet `to`，而不是回落到 `otherAgentId`？
8. `status --packet-id` 的每個狀態是否都能由 packet / outbox / ack 推導？
9. 舊版二人 project 沒有 `_peers/` 時，AI 如何向使用者解釋？
10. `inbox --all` 的文案是否清楚表明只代表本機可見資料？
11. Project Context Index 是否完整符合第 4.4 的唯一設計真源，包括權威順序、寫入邊界、內容欄位、新鮮度、防漂移、人類呈現層與驗收？
12. `check Drive` 是否只用 context 輔助理解，而報告仍以 packet 摘要、完整性預檢與本機對接檢查為主？
13. Dropbox / OneDrive 的本機同步行為是否已用實機驗證？
14. 公開頁是否清楚標示真正多人、多收件人是延後路線，而 notify、watch、平台排程、桌面通知是非 APS 範圍，兩者都不是已支援功能？

---

## 十一、下一步

本文件完成後，下一個開發步驟應保持保守：

1. Project Context Index 實作只可按第 4.4 拆小版本：schema / check 先行，packet → context 生成器次之，終端摘要再次，按需 HTML 最後；不要先做自動刷新或任務管理。S55 之後的本地候選已先加入 `aps context` / `aps context check` / `aps context add` / `aps context html`。
2. 後續如要動 CLI / skill，先以本文件第 4.4 作需求真源，逐項拆成小版本。
3. 任何公開文檔只可按實際發佈狀態描述目前 Reliable Peer Handoff 基線；Project Context Index 是 Project Peers 之後的背景索引方向；真正多人、多收件人是延後路線；notify、watch、平台排程、桌面通知是非 APS 範圍;以上都不可寫成已支援。

---

## 文件歷史

- 2026-05-28：初版。基於 0.2.6 UAT 之後的產品方向討論，整理多人 APS、聯絡名單、檔案式通知、watch、平台排程適配與無雲端 API 原則。
- 2026-05-28：深化設計。補上 group 不等於 lane、聯絡卡分檔、群組別名、notify / watch 只讀邊界、升級相容性與深化檢查清單。
- 2026-05-28：外部參考吸收。核對 A2A、OpenAI Agents SDK、LangChain / LangGraph、AutoGen、CrewAI、MCP、AgenticMail 類 agent inbox 設計,轉化為 APS 的身份卡、明確收件人、狀態分層、只讀 watch、human-in-the-loop 與無雲端 API 守則。
- 2026-05-28：全面重檢修補。收口 `_notify` 寫入責任、多收件人語義、`inbox --all` 權限邊界、provisional / confirmed contact 生命週期與 watch 狀態詞，避免未實作能力先污染產品承諾。
- 2026-05-28：產品策略再收斂。按使用者最新定案,把近期主線改為 Reliable Pair first；Contacts selector / 選對方體驗延後,真正多人、notify、watch、桌面通知、平台排程與 Dropbox / OneDrive 正式支援延後。
- 2026-05-28：Project Peers 方向修正。按 Adam 最新 UAT 反饋與 `claude -p` / subagent 只讀評估,確認一個 project 不應限死單一 `otherAgentId`；下一版候選主線改為 Reliable Peer Handoff：Project Peers + Sent Status,每次仍是單收件 packet。
- 2026-05-28：Project Context Index 方向補充。確認高層 project context 有價值,但只作背景索引與閱讀導航；可加入輕量項目管理視角,不可代替 packet / outbox / ack,也不可膨脹成看板、排程、自動催辦或責任分派工具。
- 2026-05-28：0.2.9 UAT starter pack 修正。實測乾淨 Jay 模擬目錄時確認 APS init 需要 Agent Handoff Kit 前置;starter pack 與新 peer onboarding 必須先列 Handoff Kit init,再列 APS 安裝與 `npx aps init`。
- 2026-05-29：正名與用語定案。產品正名為 Agent Public Squares(AI Public Squares 降為仍可識別 legacy alias;簡寫 APS 與 npm 套件名 `@adamchanadam/aps` 不變);收件 trigger「check Hub」→「check Drive」(check Hub 留隱藏 alias)、用戶面概念詞「Hub」→「共用 Drive 資料夾」(內部 hubRoot / _hub/ / 協定結構詞保留)。此批屬 0.2.12「正名與框架」版,連同 onboarding walkthrough 多 peer 重寫;人性化安裝四項拆去 0.2.13。GitHub repo slug 改 agent-public-squares;歷史紀錄與本機 folder 不改。經 codex 只讀覆核(`dev/qc/evidence/2026-05-29-codex-0212-naming-review/`)。
- 2026-05-29：自動化層出範圍定案。按 Adam 決定,把「只讀 watch、檔案式 `_notify`、OS／AI 平台排程、桌面通知、Telegram bot 自動代發」由「延後路線」改為「非 APS 範圍」:移除原第五、六節設計、開發分期的 watch / notify 兩段、成功率列、相容列與檢查清單相關題,並把原第七至十二節順序各提前一節(七→六 … 十二→十一),新增第五節「自動化、背景通知與排程:非 APS 範圍」。保留人手 copy-paste 通知、Project Peers、Project Context Index、群組別名、多收件人、Dropbox／OneDrive 作延後產品方向。經 codex 只讀覆核(剪裁安全、需同步 triggers / registry 口徑):`dev/qc/evidence/2026-05-29-codex-roadmap-prune/`。
