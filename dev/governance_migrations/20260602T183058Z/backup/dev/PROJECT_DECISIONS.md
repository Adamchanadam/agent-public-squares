# Project Decisions Log

這個檔保存項目的長期演進、決策、架構取捨與學習觀察 narrative。屬 warm 資料層 —— AI 開工**不需要讀**本檔。

🔹 短期 single-task project：本檔保持近空，你不需要 maintain
🔹 長期持續演進項目：AI 會自動 maintain；當你問「我們之前為何這樣做」時，AI 會在這裡找答案

不需要你手動寫 —— AI 在收工時自動 update。

---

## Evolution Timeline

任務需求演進的長期 narrative。Newest first。AI 觀察到 substantive task evolution 時 append。

- 2026-06-02 (S62) — APS 0.2.16 由「嚴格交接候選版」正式推到「公開 latest」。這一版把 Adam 關注的新手一句話交接問題變成產品行為：AI 不應聽到「幫我用 APS 整理交接包給 Jay」就直接發包，而要先做交接定義、補齊共同目標 / 雙方任務 / 交接點 / `--items` / 證據 / 風險，再用 `publish --strict-handoff` 阻止空標題、佔位字和缺行動項的正式包。發佈後下一步不再是 release 準備，而是觀察真機採用：Jay 或另一部機要用 `@latest` 驗證安裝、`check Drive`、dashboard、嚴格交接 intake 與 Google Drive 真實同步延遲。

- 2026-06-01 (S57) — APS 0.2.15 已由「候選功能」推到「公開 latest」後，工作重心轉為真實採用監察：Project Context Index / Daily Index / readable `check Drive` 已發佈並讀回，下一步不是再發版，而是看 Jay 或新加入者在真機上是否能用三問安裝、加入頁、收件摘要、read-only dashboard 完成日常流程。同日 Agent Handoff Kit 升級到 v0.3.22，closeout 把 0.3.21 / 0.3.22 漂移、prompt mirror、SESSION_LOG N-rule 一併清掉，避免下一位代理讀到舊治理狀態。

- 2026-05-30 (S48) — 0.2.13「人性化上手」由「本機完成、未發佈」推到「公開已發佈」。第五段 gated release 行完整條線:升版 → 外發前檢 + 全面檢全綠 → `npm publish` → `git push` → GitHub Pages → GitHub pre-release,每個對外動作逐項授權,四個對外面(npm latest / repo main / Pages / GitHub release)逐項讀回對齊。產品正式對外提供三問安裝 + items 明示契約 + `Agent_Public_Squares` 預設 + 可轉發邀請訊息 + 加入教學頁。0.2.x 一條「人性化上手」主線(0.2.9 Reliable Peer Handoff → 0.2.12 正名與框架 → 0.2.13 人性化上手)告一段落。下一刀係治理工具升級(Agent Handoff Kit 0.3.14→0.3.17)同延後嘅本機 / Drive hub 改名、Project Context Index。

- 2026-05-29 (S47) — 0.2.13「人性化上手」做到淨剩發佈:第三段公開頁全部對齊三問 / items(清咗 9(d) 公開頁 blocker);starter pack 由「填表 + 命令塞晒入去」重寫成一封可轉發嘅邀請訊息 + 一版專為「被邀請者」而設嘅教學頁(`docs/guides/aps-join-invite.html`),把 terminal / 命令 / 排錯嘅複雜度搬離訊息。同時把共用資料夾預設名由 `AI_Public_Squares` 統一做 `Agent_Public_Squares`(切走同產品改名撞嘅舊名陷阱;既有資料夾相容)。第四段 UAT 喺隔離沙盒行綠。產品由「協定可上手」推到「邀請體驗對非技術人都跟得到」。下一刀淨係 gated release(第五段)。

- 2026-05-29 (S46) — 0.2.13「人性化上手」由設計進入落地:第一段(CLI 冇對方都用得模型 + items 明示契約)同第二段(skill 對齊三問 / items / 邀請)已 build + 驗 + 本機 commit。產品由「協定 + 候選功能」明確向「非技術新手真實可上手」推進。同時治理層成熟一階:QC 由「查結構」升級到「行為真源對齊」(`bin/aps.js` 為行為真源,skill + 公開頁跟),並把分階段落地嘅 drift 由「靠 AI 記住」變成明文 blocking 閘。

- 2026-05-29 (S45) — Jay 真機 UAT 回傳,確認跨機交接 + 「check Drive」喺真正第二部機行得通,APS 由「協定 + 候選功能」進入「真實雙機可用」階段。同時產品邊界再收斂:自動化／背景通知／排程由「延後路線」改判為「非 APS 範圍」—— APS 定位鎖死為手動、human-in-loop、靠同步資料夾嘅結構化交接,自動喚醒交返畀 AI 工具／OS／通訊軟件。下一刀係 0.2.13 人性化上手(install 三問 + 四項耦合 CLI 改動 + items 明示契約)。

- 2026-05-29 — APS 方向收斂為先做「正名與框架(0.2.12)」、人性化安裝四項拆去 0.2.13。觸發點:Adam 發現 onboarding walkthrough 仍純兩人框架 + 仍用舊詞「Hub」,反映文檔 QC 只查結構唔查內容模型。由此 Adam 定案:過去無真實公眾用過「check Hub」(只得佢同 Jay),索性全面切「check Drive」+ 把產品正名為 Agent Public Squares(同姊妹 Agent Handoff Kit 同家族;簡寫 APS 不變、npm 套件名不改)。產品身份由「AI Public Squares」過渡為「Agent Public Squares」,舊名保留為可識別 alias。

- 2026-05-28 — APS 的方向再進一步:由「0.2.9 Reliable Peer Handoff 候選」演進到「人性化上手」。真機 UAT(Jay 用 Mac)暴露兩個同源問題 —— 安裝時強迫填對方名字、以及活躍 peer 仍卡 `provisional` 反過嚟擋住對方回覆 —— 令 Adam 提出把產品由「工程師式預填所有參數先開工」轉向「邊做邊加組員」:安裝只設定自己嗰邊,協作對象用緊先邀請。同時把內部術語「Hub」對外改為「共用 Drive 資料夾」,貼近非技術用戶本身已識的 Google Drive。這次演進把焦點由「協定正確」推向「非技術新手的真實上手體驗」。0.2.10 / 0.2.11 為此鋪路(hub-root 方括號修正、peer 參與即確認),人性化上手本身留待下一版。

- 2026-05-28 — APS 的近期方向從 0.2.7 Reliable Pair 進一步演進為 0.2.9 Reliable Peer Handoff 候選：一個 project 可以有多位 peers，但每個 packet 仍然只發給一位 peer，並保留 human-in-the-loop。這次轉折來自 Adam 的 UAT 反饋：長任務可能 part 1 交給 Jay、part 2 交給 Fanny、part 3 交給 Jackie；因此 `.aps/config.json` 的 `otherAgentId` 只能是舊二人相容預設，不可代表整個 project 永久只限一名協作對象。

- 2026-05-28 — APS 的 post-0.2.6 方向從「多人協作、watch、通知、Contacts selector」收窄為 0.2.7 Reliable Pair：先把二人交接做到可依賴，再把 Contacts selector、`_notify`、`aps watch`、桌面通知、平台排程、正式 Dropbox / OneDrive 支援與多收件人封包延後。這次演進降低了落地風險，也避免公開文件過早承諾真正多人平台能力。

- 2026-05-26 — APS 在 0.2.0 pre-release 發布後，立即進入本地 0.2.1 候選硬化：CLI 從最小收發閉環擴展到可修訂、可撤回未讀封包、可只讀診斷 Hub；技能與公開文件同步標明「0.2.0 已發布、0.2.1 仍未發布」的邊界。這次演進把「出錯補救」從人工文件指引推進到可驗證命令，但仍需正式外發前檢、提交決策及後續自然語言操作演練，才可考慮發布。

- 2026-05-26 — APS 從只公開 `bridge-pack` 的 0.1.1 版本，推進到已發布的 0.2.0 pre-release：CLI 新增 Claude Code / Codex 技能安裝、Hub 骨架生成、最小 publish / inbox / consume / close 流程；技能文件完成 setup-first 與日常收發首稿；隔離技能演練、零認知 throw-away-folder 流程、正式外發前檢、全面檢、一次 Adam ↔ Jay 真實 Google Drive 跨機往返、GitHub pre-release、npm publish 與發布後讀回均已完成。下一個決策點不是發布，而是 pre-release 硬化：自然語言日常操作、補救流程、Layer D 文檔重定位，以及新真實項目的逐項 Drive 驗證。

## Decisions Archive

由 SESSION_HANDOFF.md 的「Confirmed Decisions」或同類 decisions section 累積至 30+ 時，AI 自動 split 落這裡的舊條目。Newest first。

(empty)

## Architecture Choices

主要架構取捨與 rationale。AI 在 plan 涉及 multi-option trade-off 時 append，並等用戶 confirm。

- 2026-05-30 (S48) — Project Context Index 人類呈現層取捨。揀「來源 markdown(`_context/*.md`,AI 讀寫)→ CLI 按需生成唯讀 HTML 速覽(人類睇)」兩層分開,而非(a)淨係叫人揭 markdown(唔夠專業、難睇大局)或(b)叫 AI 直接維護 HTML(會撞 memory `feedback-no-hardcode-ai-content-parsing`,標籤一亂就讀錯)。HTML 呈現層守三條界線:衍生唯讀 + 時間戳 + 以 packet 為準(每項指返來源);按需生成、不自動刷新(背景自動刷新屬非 APS 範圍);永遠唯讀總覽,不可長出看板 / 排程 / 指派(防膨脹)。沿用 docs/ 視覺語言。已整參考樣板(假資料、gitignored)`dev/qc/evidence/2026-05-30-context-index-mock/`,render 過、同公開頁同一家族。落地仍延後(核心驗證後先做);現已併入 roadmap §4.4 作單一設計真源。

- 2026-05-29 (S47) — 四個架構/產品取捨,starter-pack 設計嗰個經 codex 只讀覆核。(1) **共用資料夾預設名統一做 `Agent_Public_Squares`**(Adam 拍板)而非沿用舊 `AI_Public_Squares`(同產品名撞、必中坑)或維持用戶自填(無統一):只改新安裝預設 + scrub 用戶面舊名,既有資料夾 / config 相容,`docs/plans/*.md` 記錄嘅真實 hub 路徑當事實保留;本機 dev folder + 真 Drive hub 改名延後(live cwd / 共享外部風險,唔喺 session 內做)。(2) **starter pack = 可轉發短訊 + 連去 HTML 教學頁**,而非「命令塞入 pack / 叫對方開 Drive 個檔照做」:訊息短、命令同排錯放教學頁;codex 指出全新加入者部 AI 未必預載 APS skill,所以教學頁要有真實三條安裝命令,唔可以淨係「叫你個 AI 教我用 APS」。(3) **工作資料夾維持本機獨立**,唔可以做共用 Drive hub 嘅 sub-folder(否則本機 repo 全 sync 上雲 + 兩邊改撞,正正係 APS 要解決嘅問題)。(4) **呢批摺入 0.2.13** 而非另開版本:starter pack 既然係「人性化上手」核心,出緊呢個 build 但邀請信仲技術化係自打嘴巴。

- 2026-05-29 (S46) — 0.2.13 第一段三個架構取捨,全部經 codex 兩輪只讀覆核(計劃 + 實作)確認。(1) **publish 收件資格閘覆蓋所有收件來源**:明示 `--to`(新多 peer 路)失敗即擋,舊 config 預設對方(fallback)只警告不擋 —— 揀呢個而非「只喺 `--to` 檢查」(codex 指出嘅不一致窿)或「一刀切都擋」(會整爛舊二人『先發包、對方後加入』嘅 documented smoke)。(2) **items frontmatter-only 解析 + revise 預設保留**:揀明示契約(`--items` / `--items-file` 逐字入 frontmatter、reader 只讀 frontmatter 區塊)而非全文 regex(會誤抽正文 stray `- id:`);revise 唔傳沿用上一版而非清空(避免靜默資料丟失),清空要明示 `--clear-items`。(3) **三問安裝(純三條)**:揀 codex 偏好嘅乾淨三問 + 用緊先邀請,而非保留可選第四條問對方;最清楚、最貼「設定自己、邊做邊加」。另一治理取捨:把「結構過≠行為對齊」嘅防漂移由 HTML 推廣到 CLI↔skill↔docs(外發前檢 9(d)),揀「擴充既有第 9 項 + 立 memory + blocking 閘」而非「補一個窄 case patch」(根因治理)。

- 2026-05-29 (S45) — 兩個架構取捨,均經 codex 只讀覆核。(1) **自動化層「出範圍」而非「延後」**:把 `aps watch`、檔案式 `_notify`、OS 及 AI 平台排程、桌面通知、Telegram bot 自動代發剔出 roadmap。理由:同步資料夾本質保證唔到即時推送或喚醒 AI;呢類能力屬 AI 工具／OS／通訊軟件或另一項產品,收入 APS 只會擴大權限同「見到提醒=已處理」嘅誤解,違背低門檻、人手確認定位。codex:剪裁安全、無流程斷絕、無功能缺口,只需同步 triggers / registry 口徑(已做)。(2) **packet `items` 用「AI 明示申報」契約**(`--items` / `--items-file`)而非喺正文逆向抽:正文係 AI 自由生成,認固定標題／標點會睇 AI 點寫而漏抽或抽錯(Jay 真包根本冇「請對方做的事」標題);機器要讀嘅資料一定要走明示欄位。evidence:`dev/qc/evidence/2026-05-29-codex-items-generality/` + `dev/qc/evidence/2026-05-29-codex-roadmap-prune/`。

- 2026-05-29 — 決定 0.2.12「正名與框架」版的範圍與次序。品牌正式定為 Agent Public Squares(AI Public Squares 降為仍可識別 legacy alias);收件 trigger「check Hub」→「check Drive」、概念詞「Hub」→「共用 Drive 資料夾」(只改 prose;內部 hubRoot / _hub/ / 協定結構詞保留;check Hub 留隱藏 alias)。npm 套件名 @adamchanadam/aps 不改(簡寫不變、零安裝斷裂);GitHub repo slug 改 agent-public-squares;歷史紀錄與本機 folder 不改(folder 留待無 session 時專做)。人性化安裝四項拆去 0.2.13 獨立 UAT。經 codex(gpt-5.5、只讀、高 reasoning)獨立覆核補入要害:觸發詞活在 skill + bin/aps.js 生成文字(淨改 docs 無效,既有用戶要 reinstall + upgrade + 重啟);prose 與結構詞要分(PROTOCOL 結構詞不改);改名涵蓋 npm tarball 全部檔含 examples;GitHub 改名次序為先 rename → 驗 Pages 200 → 同步 URL + remote → 後 publish;0.2.12 文件不可承諾 0.2.13 三問安裝;既有 Hub 已寫協定檔不自動改名。Codex 全文:dev/qc/evidence/2026-05-29-codex-0212-naming-review/codex_review.txt。

- 2026-05-28 — 選擇「參與即自我確認 + 三檔可達性」作為 peer 確認 root-fix(0.2.11),而不是單靠 `init` 確認或放寬到「有 lane 就放行」。理由:真機 UAT 證明只靠 `init` 確認會令活躍 agent 卡在 `provisional`、反過嚟擋住對方回覆;而「有 lane」唔代表已加入(`init` 會為雙方建 lane)。所以改為:`publish` / `consume` 自動確認執行者自己的 peer card(只確認自己、override 身份時唔做);收件人閘改成 confirmed / provisional-但有真實活動 / 擋,三檔。授權永遠唔用 role。經兩次獨立 codex 只讀覆核確認。

- 2026-05-28 — 決定把「安裝時對方名字」由必填改為可留空(人性化上手,下一版),而非維持工程式預填。理由:真實工作流程係邊做邊決定交畀邊個;底層 Project Peers 已支援後加 peer。關鍵架構風險係 4 處必須一齊改(doctor 拆本機 / peer 健康、`publish` 無對方時提示而非靜默失敗、舊二人相容、starter pack 改喺邀請時生成),否則上手會「表面簡化、實際仍卡舊模型」—— 此為 codex 點出的要害。詞彙「Hub→共用 Drive 資料夾」屬外層改、保留 `check Hub` 相容,內部路徑不動。

- 2026-05-28 — 選擇 Project Peers + Sent Status 作為 0.2.9 候選，而不是把 project 擴展成真正多人平台或多收件人 packet。理由：它解決「同一 project 不應只限一名協作對象」的核心 UX 問題，同時保留單收件 packet、單寫 lane、ack 語義、人工通知與人工確認，避免過早引入群組權限、同步廣播、自動通知或平台排程複雜度。

- 2026-05-28 — 選擇 Reliable Pair 先行，而不是立即做真正多人平台、Contacts selector、watch、通知或平台排程。理由：當前最有價值的產品風險在 AI 是否能穩定完成二人交接的讀設定、診斷、草稿、確認、發包、收件摘要、補資料與共識流程；在這條主線未穩前加入多人與通知層，會擴大權限、狀態、同步與使用者期望風險。Contacts selector 保留為日後體驗層，不改變底層單收件封包模型。

## Insights & Learnings

累積式學習、反思、觀察。AI 觀察到多 session 累積 pattern 時 append。

- 2026-06-02 (S62) — 0.2.16 再次證明「結構存在」不等於「內容可交接」。嚴格交接初版只看標題會放過空段落和 `未確認` / `TBD` 這類佔位文字；root-fix 後改為檢查每個核心 section 是否有實質內容，並要求 `--items` 這種機器可讀行動項。這與早前「結構過不等於行為對齊」是同一類問題：凡是 AI 產生、另一個 AI 或 CLI 要消費的內容，都要用明示欄位和可驗證內容作閘口，不能靠標題、格式或好像齊全的外觀。

- 2026-05-30 (S48) — 兩條發佈執行學習。(1) **分段受閘發佈(逐項授權 + 即時讀回)行得順又安全**:把不可逆動作逐個拆開確認,每個發完即刻讀回(`npm view` / `npx @latest` / Pages 探針 / `gh release view` / `ls-remote`),令「以為發咗」同「真係發咗」唔會混淆;呢套已成穩定 release 範式,值得沿用。(2) **release-check 同先前 UAT 多數重疊但唔可以省**:第四段 UAT 同第五段 release-check 之間只差版本字串(runtime 行為相同),但 release notes 自己寫住「verification NOT YET RUN」,照貼出 release body 就會講大話 —— 所以實跑一次攞新鮮證據 + 改正 release body 狀態係必要,唔可以用『同 UAT 一樣』省略。另:GitHub Pages 推完約 15 秒就 rebuild,但唔可以假設即時;用新增檔案(加入頁)做 200 探針至準,index 200 但內容仲係舊都可能發生。

- 2026-05-29 (S47) — 三條累積學習。(1) **舊名遺留係改名工程嘅長尾陷阱**:產品由 AI Public Squares 改做 Agent Public Squares,但共用資料夾預設名、本機 folder、真 Drive hub 仲叫舊名,任何一處用戶可見嘅舊名都會令新手揀錯 / 撞名(Adam:「單是目錄用 AI Public Squares 就是坑」)。教訓:改名要分「用戶可見預設 / 示例」(即刻 scrub)同「事實記錄 / 既有資料」(保留,唔可 falsify 真實路徑);真實 folder 改名係 live-cwd / 共享外部操作,要無 session / 人手做,唔好 mid-session。(2) **dynamic Workflow 對細任務係用大咗**:今次第三段盤點 6 個 agent 燒約 65 萬 token,結果同 inline 差距唔大,而且行號漂移要自己對返真檔;workflow 真正抵用喺檔多(十幾廿個以上)/ 要對抗式多角度覆核 / 讀大到塞爆主 context。輸出當第二意見,唔當 patch 座標。(3) **外部下載連結要核官方文件先寫落公開頁**:join 教學頁嘅 Google Drive / Node 下載連結經 codex + WebFetch 核實(Google support `answer/10838124`、`nodejs.org/en/download`),唔靠記憶 —— 公開頁畀錯連結係真 defect。

- 2026-05-29 (S46) — 三條累積學習。(1) **「結構過≠行為對齊」是跨教學層通病,非 HTML 獨有**:S44/S45(入口頁 vs walkthrough)同 S46(CLI vs skill)同源 —— description 長度 / YAML / 觸發詞 / section 結構檢查全過,但行為模型已漂移。已把外發前檢第 9 項由只審 HTML 擴成 CLI↔skill↔docs 行為真源對齊(9(d)),並立 memory `feedback-structure-vs-behaviour-drift`。教訓:確定性真源(`bin/aps.js`)一改行為,教學層(skill / docs)必須對齊或明文 blocking。(2) **分階段落地嘅 drift 要做成 QC blocking 閘,唔好靠 AI 記住**:第一段 CLI 先行、docs 後補嗰段,必須喺 handoff Risks + release gate 明文 blocking,先唔會發佈時漏對齊。(3) **耦合主路徑改動,動手前同改完後各做一次 codex 只讀覆核都有回報**:計劃覆核揪出原計劃漏咗 `upgrade` / `config` / `inbox` 等耦合(否則三問安裝係假);實作覆核揪出 starter pack 舊文案、巢狀 items 解析、修訂互斥三個位。

- 2026-05-29 (S45) — 兩條跨項目工程教訓,已寫入跨 session memory。(1) 確定性工具要消費「另一個 AI 自由生成嘅內容」時,機器要讀嘅資料一定要走明示契約(frontmatter / JSON / 參數),唔好認標題／標點／格式逆向估 —— 估法會睇 AI 寫法而漏／錯,規則愈加愈膨脹兼互撞;呢個係 APS `items` bug 嘅根因。(2) 喺 git bash(MSYS)永不用 `cmd /c` 包 `codex` / `claude -p`:`/c` 會被當成路徑,cmd 只彈 banner 唔執行,中文 prompt 又被 codepage 搞亂;直接 call,長／中文 prompt 用 UTF-8 檔餵入。正確 codex 方法已記入 `GENERIC_OPERATIONAL_RUNBOOK.md` §3i / §5k。

- 2026-05-29 — 文檔 QC 只查結構(標記 / 連結 / section 配對)會放過「內容模型漂移」:同一次改寫,入口頁已轉多 peer 而 walkthrough 仍純兩人,兩頁都過結構檢查。已在外發前檢加第 9 項「user-facing 文檔內容與產品模型深審」。另一教訓:rebrand 不可盲改字串 —— 畀人睇的 prose 詞與結構詞(hubRoot / _hub/ / 協定 schema)要分開,否則為咗文案一致會整爛協定可讀性與設定相容(codex 點出)。

- 2026-05-28 — 真機 UAT 是揪出設計缺陷最有效的手段,而且不同 AI 工具的容忍度不同。Codex 對 skill frontmatter `description` 有 1024 硬上限、Claude 沒有 —— 只在 Claude 端驗證會 miss 純 codex 的 blocker(skill 載入失敗、靜悄悄退用舊 backup)。教訓:跨工具產品的外發前檢,要對每個目標工具做明確機器檢查,不可假設一個工具過到、另一個就過到。

- 2026-05-28 — 「簡化上手」的陷阱:減少問題很容易,但若底層命令(doctor / publish)仍假設舊模型,簡化只是表面,新手會在第二步才撞板。真正人性化要求一組耦合改動一齊落地。獨立第二意見(codex 只讀覆核)在這類主路徑重構特別有價值,值得在動手前先取得;本 session 三次用 codex 覆核(role 邏輯、peer 確認 root-fix、上手設計)都收窄或修正了原方案。

- 2026-05-28 — 對 APS 這類協作工具，最危險的漂移不是功能缺失，而是「命名與路由以為自己知道」。`Agent Public Squares` 與 `AI Public Squares` 必須被視為同一品牌；AI 入口、Handoff Kit route、skill 觸發詞、README 與 public docs 要共同覆蓋自然語言名稱變體，否則真實用戶一改說法就會掉到錯誤 onboarding。

- 2026-05-28 — 當預估成功率低於約七成時，這不是單純開發難度，而是產品範圍風險。對 APS 這類面向非技術用戶的工具，可靠的二人閉環比早期多人平台更重要；公開文件與 QC 必須阻止「可研究」被寫成「已支援」。
