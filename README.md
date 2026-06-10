# Agent Public Squares

Agent Public Squares 是一個讓兩邊 AI 透過共用 Google Drive 資料夾交接工作的工具。

最適合新手的安裝方法，不是先學命令，而是請本機 AI 代理帶你安裝。

## 快速入口

- [公眾入口頁](https://adamchanadam.github.io/agent-public-squares/docs/index.html)
- [教學中心](https://adamchanadam.github.io/agent-public-squares/docs/guides/index.html)
- [第一次安裝教學](https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-onboarding-walkthrough.html)
- [AI 代理安裝指引](https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-ai-agent-install.html)
- [收到邀請時加入](https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-join-invite.html)

## 第一次安裝

在你想使用 APS 的本機項目資料夾打開 Codex、Claude Code 或同等本機代理型 AI，貼上以下整段：

```text
請在目前本機項目資料夾，按這頁指引帶我安裝和設定 Agent Public Squares：
https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-ai-agent-install.html

你要先讀完整頁面，再檢查目前資料夾是否適合安裝。任何會安裝套件、寫入檔案、修改設定或寫入共用 Drive 資料夾的步驟，先列出將會做甚麼，等我確認後才執行。Google Drive 本機路徑、項目代號、我的 agent id 由我提供。
```

你仍然要準備三件資料：

- Google Drive 同步到本機的共用資料夾路徑
- 這個合作項目的項目代號
- 你自己的 agent id

AI 會問你這三件事。不要把邀請人電腦上的本機路徑照抄到自己電腦；每部電腦都要使用自己看到的 Google Drive 本機路徑。

請先把 Google Drive 的 APS 共用資料夾設為「可離線使用」。在 Windows 下，到 Google Drive 的目標資料夾，按右鍵，選「顯示其他選項」→「離線存取」→「可離線使用」。參考圖在 [第一次安裝教學](https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-onboarding-walkthrough.html)。

普通網頁聊天 AI 如果不能讀寫你的本機資料夾，就不適合直接安裝。它最多只能解釋步驟。

## APS 做甚麼

你這邊的 AI 做到一半，要交給另一個人、另一部電腦或另一個 AI 接手時，APS 會把一句「你接手吧」變成一份可追蹤的交接包。

交接包會說清楚：

- 共同目標是甚麼
- 目前做到哪裡
- 請對方做甚麼
- 哪些地方不要誤解
- 證據或檔案在哪裡
- 還有甚麼風險或未決事項

對方那邊不用靠記憶猜。他只要在自己的項目資料夾叫 AI `check Drive`，AI 就會從共用 Drive 資料夾讀取交接包，先整理摘要與風險，再判斷能否接手。

## 目前狀態

目前公開版本是：

```text
@adamchanadam/aps@0.2.16
```

它已經可以安裝，並可用於受控實際試行。它仍是前期測試版，不應承諾為生產級工具。

適合：真項目中的受控試行、雙方 AI 交接測試、日常協作流程打磨。

不適合：不可中斷、不可出錯、沒有人工覆核的重要生產流程。

## 它不是甚麼

Agent Public Squares 不是自動通知系統。

它不會在對方電腦彈出提示，也不會自動打開對方的 AI。發出交接後，你仍然要把 AI 生成的摘要通知貼到 WhatsApp、Email、Telegram 或你們平常使用的通訊工具，請對方在自己的電腦上 `check Drive`。

它也不是群組任務平台。
同一個項目可以有多位協作對象，但每一份交接包仍然只發給一位對象。

## 命令備用路徑

如果你熟悉終端機，也可以手動執行。新項目順序是：

```powershell
npx --yes @adamchanadam/agent-handoff-kit@latest init
npm install --save-dev @adamchanadam/aps@latest
npx aps init
npx aps doctor
```

舊項目升級：

```powershell
npm install --save-dev @adamchanadam/aps@latest
npx aps upgrade
npx aps doctor
```

命令只是備用路徑。新手主路徑仍然是請本機 AI 代理讀取 AI 代理安裝指引，再由它帶你一步一步完成。

## 日常怎樣用

你不需要記住很多命令。最理想的用法，是直接向 AI 說你想做甚麼。

交給對方接手：

```text
幫我用 APS 交給 Jay 接手。
```

查看對方有沒有新交接：

```text
check Drive
```

查對方是否已處理：

```text
看看 Jay 處理了沒有。
```

AI 應該先整理交接定義、缺漏與風險，讓你確認後才寫入共用 Drive 資料夾。它不應該未經確認就發正式交接包。

## 想深入了解

- [GitHub Issues](https://github.com/Adamchanadam/agent-public-squares/issues)

## 授權

Apache License 2.0
