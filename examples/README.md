# Demo fixtures(MVP 驗證之 Bridge Pack 副本)

此資料夾收錄兩份 Bridge Pack fixture,作為設置教學中讀者抄錄之 source。

| 資料夾 | 角色 | 用於 |
|---|---|---|
| `demo-agent-a/dev/rules/aps-bridge.md` | User A 角色之 Bridge Pack 副本 | 發起接駁的一方(設置教學 §5)|
| `demo-agent-b/dev/rules/aps-bridge.md` | User B 角色之 Bridge Pack 副本 | 對方(設置教學 §6)|

兩份 file 之 procedural body 完全相同;僅 Identity section 中的 example 角色標註不同(User A vs User B,以及對應之 example agent_id)。

## 如何使用

跨機接駁時,讀者:

1. 將此資料夾中對應角色之 `aps-bridge.md` 抄至自己 runtime workspace 之 `dev/rules/aps-bridge.md`
2. 將 Identity section 中的 `<your_agent_id>` / `<your_project_slug>` / `<your_shared_drive_folder_absolute_path>` / `<counterpart_agent_id>` 改為實際值

詳細安裝步驟見 [設置教學](../docs/guides/aps-onboarding-walkthrough.html) §5 與 §6。

## MVP 驗證之歷史

兩份 fixture 源自 MVP 驗證(2026-05-20)時於 sibling 之 `Demo_Agent_Adam_Public_Squares/` 與 `Demo_Agent_Jay_Public_Squares/` workspace 中之實際運作版本,Identity section 已 sanitize 為佔位符。procedural body 對應 APS PROTOCOL.md v1.0 凍結;若 PROTOCOL.md 升級至 v1.1+,此 fixture 須同步重新驗證。
