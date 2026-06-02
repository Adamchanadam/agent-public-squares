# APS latest two-agent full audit — 2026-06-01

## 結論

本次以公開 npm latest `@adamchanadam/aps@0.2.15` 建立兩個全新測試 agent，並使用真實 Google Drive Hub：

`G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares`

結果是 **局部通過，不是完整無條件通過**。公開 latest 的全新安裝、雙向交接、收件報告、ack、close、Project Context Index、Dashboard、既有項目升級路徑與本 repo 回歸測試都通過。兩項不可清零：瀏覽器安全政策阻止直接開啟 `file://` HTML 頁；本次仍是同一部 Windows 機上的兩個 workspace，不等於遠端第二部電腦同步延遲驗證。

## 範圍

| 項目 | 狀態 | 證據 |
|---|---|---|
| npm latest readback | 通過 | `npm view @adamchanadam/aps version dist-tags.latest dist.fileCount bin --json` 回傳 0.2.15 / latest 0.2.15 / 15 files / bin `aps` |
| Agent Handoff Kit new install | 通過 | `agent_adam_uat`、`agent_jay_uat` 均由 `@adamchanadam/agent-handoff-kit@latest init --yes --root .` 建立 20 個 core files |
| APS package install | 通過 | 兩個測試 workspace 均先 `npm init -y`，再 `npm install --save-dev @adamchanadam/aps@latest`，0 vulnerabilities |
| APS CLI version | 通過 | 兩邊 `node node_modules\@adamchanadam\aps\bin\aps.js --help` 顯示 v0.2.15 |
| APS init dry-run | 通過 | 兩邊 dry-run 只指向測試 project `aps_latest_full_audit_20260601` 與本地 UAT workspace |
| APS init write | 通過 | 兩邊 `.aps/config.json`、`dev/rules/aps-bridge.md`、RULE_PACKS route、PROJECT_INDEX registration、Drive lane / ack / peer card 寫入完成 |
| APS doctor | 通過 | 兩邊 doctor v0.2.15 狀態通過；peer 顯示 active / confirmed |
| A→B publish | 通過 | `20260601T190144Z__latest_install_uat` v1 發給 `jay_latest_uat`，items 逐字記錄 |
| B check Drive / inbox | 通過 | B 的 `check-drive` 與 `inbox --all` 均顯示同一件 pending，包含摘要、items、建議下一步與排錯細節 |
| B consume | 通過 | `jay_latest_uat.ack.json` 記錄 v1 result；A `status` 讀到收件方已標記處理 |
| B→A reply | 通過 | `20260601T190318Z__latest_install_uat_reply` v1 發給 `adam_latest_uat` |
| A check Drive / inbox --from | 通過 | A 的 `check-drive` 與 `inbox --from jay_latest_uat` 均顯示 pending reply |
| A consume | 通過 | `adam_latest_uat.ack.json` 記錄 reply v1 result；B `status` 讀到收件方已標記處理 |
| close | 通過 | A close 原 packet，B close reply；雙方 `inbox --all` 清零 |
| context check before context exists | 通過 | 兩邊輸出「目前未建立 `_context/`。這不是錯誤」 |
| context add | 通過 | 兩邊分別從各自發出的 packet 建立背景索引 |
| context check after add | 通過 | 兩邊顯示 2 個索引條目，未見阻塞錯誤 |
| context html | 通過 | 生成 `_context/overview.html` |
| dashboard | 通過 | 生成 `_context/dashboard.html` |
| HTML static content check | 通過 | `overview.html` 命中 `Project Context Index`、`packet / outbox / ack`、兩個 topic；`dashboard.html` 命中 `Daily Index`、`待處理交接`、`自己發出的狀態`、`ack 已記錄` |
| Browser render check | 受阻 | Browser 安全政策拒絕開啟 `file://`；未使用其他瀏覽器通道繞過 |
| existing project upgrade dry-run | 通過 | A / B dry-run 均列出備份全域 skill、刷新本地 bridge / config / route / index、保留既有 Hub 檔案 |
| existing project upgrade write | 通過 | 在 `agent_adam_uat` 正式執行 `upgrade`；備份 `C:\Users\adam\.claude\skills\aps` 與 `C:\Users\adam\.codex\skills\aps` 至 `aps.backup-20260601T192308Z`，並刷新 skill |
| post-upgrade doctor | 通過 | A / B 兩邊 doctor 仍通過 |
| repo regression | 通過 | 主 repo `npm test` 通過 Project Context Index regression |
| whitespace check | 通過 | `git diff --check` 只有 CRLF 轉換 warning，無 whitespace error |
| Agent Handoff Kit doctor | 通過 | v0.3.22，45 checks，`status: passed`；另有 SESSION_LOG N-rule warning，需於下次 full closeout 推進 |

## 測試 workspace

| 角色 | 本地 workspace | APS agent_id |
|---|---|---|
| A | `dev/qc/evidence/2026-06-01-latest-two-agent-full-audit/agent_adam_uat` | `adam_latest_uat` |
| B | `dev/qc/evidence/2026-06-01-latest-two-agent-full-audit/agent_jay_uat` | `jay_latest_uat` |

Google Drive 測試 project：

`G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\aps_latest_full_audit_20260601`

## 主要產物

| 產物 | 狀態 |
|---|---|
| `_ack/adam_latest_uat.ack.json` | 通過 |
| `_ack/jay_latest_uat.ack.json` | 通過 |
| `from_adam_latest_uat/packets/20260601T190144Z__latest_install_uat__v1/packet.md` | 通過 |
| `from_jay_latest_uat/packets/20260601T190318Z__latest_install_uat_reply__v1/packet.md` | 通過 |
| `_context/from_adam_latest_uat/context.log.md` | 通過 |
| `_context/from_jay_latest_uat/context.log.md` | 通過 |
| `_context/overview.html` | 通過，但 browser render 受阻 |
| `_context/dashboard.html` | 通過，但 browser render 受阻 |

## 阻擋項

1. Browser render check 受阻：Codex Browser 安全政策拒絕開啟本機 `file://` HTML。已停止，不以 raw CDP、其他 browser surface 或間接方式繞過。
2. 真跨機同步延遲未驗證：本次是同一部 Windows 機上的兩個 workspace，使用真實 Google Drive folder，但不等於 Jay 實機或第二部電腦的同步延遲驗證。

## 警告

1. `npx aps` 在沙盒內曾因 npm cache 權限失敗；改用已安裝套件的本地 CLI：`node node_modules\@adamchanadam\aps\bin\aps.js`。這仍是公開 latest 安裝後的 CLI。
2. 早段在測試 workspace 尚未建立 `package.json` 時，`npm install` 曾向上找到主 repo 並改動 root `package.json`。已撤回該無關變更，`package-lock.json` 亦已移除。
3. 正式 `aps upgrade` 會刷新全域 APS skill。本次已獲 Adam 追加確認後執行；備份路徑為 `C:\Users\adam\.claude\skills\aps.backup-20260601T192308Z` 與 `C:\Users\adam\.codex\skills\aps.backup-20260601T192308Z`。
4. Agent Handoff Kit doctor 狀態為 passed，但提示 SESSION_LOG entry count = 11；下次 full closeout 必須推進 N-rule archive / collapse 維護。

## 未觸發 / 不適用項

| 項目 | 狀態 | 原因 |
|---|---|---|
| GitHub release / npm publish / tag / push | 不適用 | 本次只做 latest 實測與 full audit，不發佈 |
| 多 peer 三人隔離 | 未觸發 | 本次用兩個 agent 驗證全新安裝、雙向交接與升級；三人 A→B / A→C 隔離仍需另開測試 |
| 遠端第二部電腦 | 受阻 | 本 session 沒有 Jay 實機可操作 |
| 外部 WhatsApp / Email 通知實發 | 不適用 | APS 只產生 copy-ready 通知，未代發外部訊息 |

## 可交付判斷

0.2.15 latest 在「同機兩 workspace + 真實 Google Drive folder」範圍內可用：安裝、交接、收件、ack、close、context、dashboard、upgrade 均能走通。仍不可把本報告解讀為「真跨機 Google Drive 同步延遲已驗證」或「production-ready」。
