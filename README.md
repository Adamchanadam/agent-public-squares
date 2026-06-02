# Agent Public Squares

## 快速入口

- [公眾入口頁](https://adamchanadam.github.io/agent-public-squares/docs/index.html)
- [教學中心](https://adamchanadam.github.io/agent-public-squares/docs/guides/index.html)
- [第一次安裝與測試](https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-onboarding-walkthrough.html)
- [Agent Handoff Kit 是甚麼](https://adamchanadam.github.io/agent-handoff-kit/agent-handoff-kit-intro.html)

Agent Public Squares 是一個讓兩邊 AI 可以清楚交接工作的工具。

你可以把它想像成一個放在 Google Drive 裡的共用交接處。你這邊的 AI 做到一半，要交給另一個人、另一部電腦或另一個 AI 接手時，它不只是留下一句「你接手吧」，而是會整理成一份可追蹤的交接包。

交接包會說清楚：

- 共同目標是甚麼
- 目前做到哪裡
- 請對方做甚麼
- 哪些地方不要誤解
- 證據或檔案在哪裡
- 還有甚麼風險或未決事項

對方那邊不用靠記憶猜。他只要在自己的項目資料夾叫 AI `check Drive`，AI 就會從共用 Drive 資料夾讀取交接包，先整理摘要與風險，再判斷能否接手。

簡單講，Agent Public Squares 把「你接手吧」變成一份可執行、可核對、可追蹤的交接。

## 目前狀態

目前公開版本是：

```text
@adamchanadam/aps@0.2.15
```

它已經可以安裝，並可用於受控實際試行。最新測試已證明，在同一部 Windows 電腦上建立兩個全新 AI 工作資料夾，並使用真實 Google Drive 共用資料夾時，可以完成：

- 全新安裝
- 兩邊初始化
- A 發交接包給 B
- B 用 `check Drive` / `inbox` 收件
- B 標記已處理
- B 回覆 A
- A 收件並標記已處理
- 雙方收結交接
- 產生每日總覽與背景索引
- 舊項目升級

但它仍是前期測試版，不應承諾為生產級工具。仍未完全驗證的地方包括：

- 兩部真實不同電腦之間的 Google Drive 同步延遲
- 每一種新手情景
- 所有出錯補救流程
- 本機 HTML 頁面的瀏覽器畫面驗證

適合：真項目中的受控試行、雙方 AI 交接測試、日常協作流程打磨。

不適合：不可中斷、不可出錯、沒有人工覆核的重要生產流程。

## 它不是甚麼

Agent Public Squares 不是自動通知系統。

它不會在對方電腦彈出提示，也不會自動打開對方的 AI。發出交接後，你仍然要把 AI 生成的摘要通知貼到 WhatsApp、Email、Telegram 或你們平常使用的通訊工具，請對方在自己的電腦上 `check Drive`。

它也不是群組任務平台。
同一個項目可以有多位協作對象，但每一份交接包仍然只發給一位對象。

## 安裝前需要準備甚麼

你需要三樣東西：

1. 一個本機項目資料夾
2. Google Drive 桌面版，並且有一個雙方都能同步的共用 Drive 資料夾
3. 能讀寫本機資料夾的 AI 工具，例如 Claude Code 或 Codex

普通網頁聊天如果不能讀寫你的本機資料夾，就不適合直接使用這個工具。

## 第一次安裝

在你的項目資料夾打開終端機，按以下順序執行：

```powershell
npx --yes @adamchanadam/agent-handoff-kit@latest init
npm install --save-dev @adamchanadam/aps@latest
npx aps init
```

第一行先安裝 Agent Handoff Kit。
這一步很重要，因為 Agent Handoff Kit 會讓項目資料夾具備基本的 AI 開工、收工、紀錄與健康檢查能力。Agent Public Squares 是在這個基礎上加入跨機交接能力。

第二行安裝 Agent Public Squares。

第三行開始設定 APS。它會問你三件事：

| 它會問你 | 你要填甚麼 |
|---|---|
| 共用 Drive 資料夾路徑 | 你電腦上 Google Drive 同步出來的共用資料夾完整路徑 |
| 項目代號 | 這次協作項目的短名，只用小寫英文、數字、底線 |
| 你的名稱 | 你自己在這個共用資料夾裡的 AI 身份，例如 `adam` |

這一步只設定你自己這一邊，不是設定對方。

例子：

```text
Adam 這邊填：adam
Jay 這邊填：jay
```

兩邊要使用同一個項目代號，並指向同一個共用 Drive 資料夾。

設定完成後，建議先檢查一次：

```powershell
npx aps doctor
```

如果通過，就可以打開 AI 工具，在同一個項目資料夾輸入：

```text
教我用 APS
```

或者：

```text
教我用 Agent Public Squares
```

AI 應該會讀取本地設定，檢查共用 Drive 資料夾，然後帶你做第一次測試交接。

## 舊項目升級

如果你的項目已經裝過 APS，不要重新建立新的共用 Drive 資料夾。

在原本項目資料夾執行：

```powershell
npm install --save-dev @adamchanadam/aps@latest
npx aps upgrade
```

`npx aps upgrade` 會讀取既有設定，刷新 APS skill，更新本地橋接檔與項目登記，並檢查共用 Drive 資料夾。它不應覆寫既有交接包、已讀紀錄或共用 Drive 協定檔。

升級後，重新啟動你的 AI 工具，再回到項目資料夾輸入：

```text
教我用 APS
```

## 日常怎樣用

你不需要記住很多命令。最理想的用法，是直接向 AI 說你想做甚麼。

### 交給對方接手

你可以說：

```text
幫我用 APS 交給 Jay 接手。
```

AI 應該整理交接內容，補齊目標、現況、請對方做的事、證據位置與風險。它會先讓你確認，確認後才寫入共用 Drive 資料夾。

寫入後，AI 會生成一段可複製貼上的通知。你把它貼到 WhatsApp、Email 或平常使用的通訊工具，請對方 `check Drive`。

### 查看對方有沒有新交接

你可以說：

```text
check Drive
```

AI 應該檢查共用 Drive 資料夾，列出新交接包，並先告訴你：

- 對方交了甚麼
- 對方請你做甚麼
- 是否足夠接手
- 有沒有風險或缺漏
- 建議下一步是甚麼

如果資料不足，AI 不應直接開工，而應整理缺漏，讓你向對方要求補充。

### 查對方是否已處理

你可以說：

```text
看看 Jay 處理了沒有。
```

AI 應該根據交接包狀態和對方已讀紀錄，告訴你對方是否已標記處理。

## 可用命令

日常主路徑應該是自然語言，但命令列可以用來檢查和排錯。

```powershell
npx aps doctor
npx aps config
npx aps peers
npx aps publish --to <對方> --topic <主題> --body-file <檔案>
npx aps inbox
npx aps check-drive
npx aps consume --packet-id <id> --version <n> --result "<處理結果>"
npx aps status --packet-id <id>
npx aps revise --packet-id <id> --body-file <檔案> --reason "<原因>"
npx aps withdraw --packet-id <id> --reason "<原因>"
npx aps close --packet-id <id> --reason "<原因>"
npx aps dashboard
npx aps context check
npx aps context add --from-packet <id> --version <n>
npx aps context html
npx aps upgrade
```

長正文、表格或多行內容，建議使用 `--body-file`，不要把大段內容塞進一條命令。

## 怎樣邀請新的協作對象

設定好自己這邊後，可以叫 AI：

```text
邀請 Jay 加入這個 APS 項目。
```

AI 應該協助你產生給 Jay 的起步說明。Jay 需要在自己的電腦完成 Agent Handoff Kit 和 APS 設定，並使用同一個共用 Drive 資料夾與同一個項目代號。

在對方完成設定之前，不應把對方視為已準備好接正式交接。

## 常見問題

### 我可以只說「你接手吧」嗎？

可以，但不應只靠這一句。

比較好的說法是：

```text
幫我用 APS 整理交接包給 Jay，請他接手下一步。
```

AI 的責任是把這句話變成一份清楚的交接包，而不是只把原句丟給對方。

### 一定要先裝 Agent Handoff Kit 嗎？

是。

Agent Handoff Kit 提供本機 AI 項目的基本開工、收工、狀態紀錄與健康檢查。Agent Public Squares 依賴這個基礎，才能讓 AI 在項目資料夾內可靠地找到 APS 規則與設定。

新項目順序是：

```powershell
npx --yes @adamchanadam/agent-handoff-kit@latest init
npm install --save-dev @adamchanadam/aps@latest
npx aps init
```

### 它會自動通知對方嗎？

不會。

AI 會幫你生成通知文字，但由你手動貼給對方。這是刻意保留的人類確認步驟。

### 它支援多個人嗎？

支援一個項目內有多位協作對象，但每一份交接包仍然是一對一。

它目前不是多人群組平台，也不是群發系統。

### 它可以正式使用嗎？

可以用於受控實際試行。

它已經可以安裝，也能完成核心交接流程。但它仍是前期測試版，不建議用於不可中斷的重要流程。每個真實項目第一次使用前，都應先做一個測試交接，確認雙方 Google Drive 同步和 AI 設定正常。

## 想深入了解

- [GitHub Issues](https://github.com/Adamchanadam/agent-public-squares/issues)

## 授權

Apache License 2.0
