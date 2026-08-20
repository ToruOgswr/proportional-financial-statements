"use client";

import { useMemo, useState } from "react";
import {
  aggregate, deriveRecord, factor, fmt, parseAmount, sample, validate,
  type FinancialRecord, type Granularity, type ScaleMode, type ViewMode,
} from "./financial";

type Sheet = "both" | "bs" | "pl";
type Part = [string, number, string];

const baseFields = [["流動資産", "currentAssets"], ["固定資産", "fixedAssets"], ["流動負債", "currentLiabilities"], ["固定負債", "fixedLiabilities"], ["純資産", "equity"]] as const;
const highFields = [["現預金", "cash", false], ["売上債権", "receivables", false], ["棚卸資産", "inventory", false], ["その他の流動資産（自動）", "otherCurrentAssets", true], ["有形固定資産", "tangibleAssets", false], ["その他の固定資産（自動）", "otherFixedAssets", true], ["仕入債務", "payables", false], ["その他の流動負債（自動）", "otherCurrentLiabilities", true]] as const;

const plFields = [["売上高", "sales"], ["売上原価", "costOfSales"], ["販売費及び一般管理費", "sga"], ["営業利益", "operatingProfit"]] as const;
const colors: Record<string, string> = {
  cash: "#0B6FA4", receivables: "#3B9FC4", inventory: "#2A9D8F", otherCurrentAssets: "#67C5B5",
  tangibleAssets: "#625578", intangibleAssets: "#785878", otherFixedAssets: "#87617F",
  currentAssets: "#2D8FB8", fixedAssets: "#684C7D", payables: "#E69F00", interestDebt: "#D55E00",
  otherCurrentLiabilities: "#F0C94C", otherFixedLiabilities: "#B65A83", currentLiabilities: "#E28A1C",
  fixedLiabilities: "#B14A62", equity: "#5A3825", costOfSales: "#343A40", sga: "#7A8288",
  operatingProfit: "#009FE3", loss: "#F04438",
};
const lightTextKeys = new Set(["cash", "tangibleAssets", "otherFixedAssets", "fixedAssets", "otherFixedLiabilities", "fixedLiabilities", "equity", "costOfSales", "sga", "operatingProfit", "loss"]);

const csvColumns = [
  ["企業名", "company"], ["年度", "year"], ["単位", "unit"], ["流動資産", "currentAssets"],
  ["固定資産", "fixedAssets"], ["流動負債", "currentLiabilities"], ["固定負債", "fixedLiabilities"],
  ["純資産", "equity"], ["売上高", "sales"], ["売上原価", "costOfSales"], ["販売費及び一般管理費", "sga"],
  ["営業利益", "operatingProfit"], ["現預金", "cash"], ["売上債権", "receivables"],
  ["棚卸資産", "inventory"], ["その他の流動資産", "otherCurrentAssets"], ["有形固定資産", "tangibleAssets"],
  ["無形固定資産", "intangibleAssets"], ["その他の固定資産", "otherFixedAssets"], ["仕入債務", "payables"],
  ["有利子負債", "interestDebt"], ["その他の流動負債", "otherCurrentLiabilities"], ["その他の固定負債", "otherFixedLiabilities"],
] as const;

const highInputColumns = [
  ["企業名", "company"], ["年度", "year"], ["単位", "unit"],
  ["流動資産", "currentAssets"], ["固定資産", "fixedAssets"], ["流動負債", "currentLiabilities"], ["固定負債", "fixedLiabilities"],
  ["現預金", "cash"], ["売上債権", "receivables"], ["棚卸資産", "inventory"],
  ["有形固定資産", "tangibleAssets"],
  ["仕入債務", "payables"],
  ["純資産", "equity"], ["売上高", "sales"], ["売上原価", "costOfSales"],
  ["販売費及び一般管理費", "sga"], ["営業利益", "operatingProfit"],
] as const;

const csvAliases: readonly (readonly [string, keyof FinancialRecord])[] = [
  ...csvColumns,
  // 過去のテンプレートや一般的な略称も読み込めるようにする後方互換用の別名。
  ["会社名", "company"], ["負債", "currentLiabilities"],
  ["現金及び預金", "cash"], ["現金・預金", "cash"], ["現金預金", "cash"],
  ["受取手形及び売掛金", "receivables"], ["受取手形・売掛金", "receivables"],
  ["たな卸資産", "inventory"], ["棚卸し資産", "inventory"],
  ["有形固定資産合計", "tangibleAssets"], ["無形固定資産合計", "intangibleAssets"],
  ["販管費", "sga"], ["その他流動資産", "otherCurrentAssets"], ["その他固定資産", "otherFixedAssets"],
  ["その他流動負債", "otherCurrentLiabilities"], ["その他固定負債", "otherFixedLiabilities"],
];

function Segment({ part, total, normalized }: { part: Part; total: number; normalized: boolean }) {
  const percent = Math.max(0, part[1]) / Math.max(1, total) * 100;
  return <div className="segment" style={{ height: `${Math.max(4, percent)}%`, background: colors[part[2]], color: lightTextKeys.has(part[2]) ? "#FFFFFF" : "#17212B" }} title={`${part[0]}\n${fmt(part[1])}\n${percent.toFixed(1)}%`}>
    <span>{part[0]}</span><b>{normalized ? `${percent.toFixed(1)}%` : fmt(part[1])}</b>
  </div>;
}

function BsChart({ r, g, normalized, height }: { r: FinancialRecord; g: Granularity; normalized: boolean; height: number }) {
  const d = deriveRecord(r), a = aggregate(d, g), v = validate(d, g);
  const assets: Part[] = g === "medium"
    ? [["流動資産", a.currentAssets, "currentAssets"], ["固定資産", a.fixedAssets, "fixedAssets"]]
    : [["現預金", d.cash, "cash"], ["売上債権", d.receivables, "receivables"], ["棚卸資産", d.inventory, "inventory"], ["その他の流動資産", d.otherCurrentAssets, "otherCurrentAssets"], ["有形固定資産", d.tangibleAssets, "tangibleAssets"], ["その他の固定資産", d.otherFixedAssets, "otherFixedAssets"]];
  const debts: Part[] = g === "medium"
    ? [["流動負債", a.currentLiabilities, "currentLiabilities"], ["固定負債", a.fixedLiabilities, "fixedLiabilities"]]
    : [["仕入債務", d.payables, "payables"], ["その他の流動負債", d.otherCurrentLiabilities, "otherCurrentLiabilities"], ["固定負債", d.fixedLiabilities, "fixedLiabilities"]];
  const rightTotal = Math.max(v.assets, a.currentLiabilities + a.fixedLiabilities + Math.max(0, d.equity));
  if (v.assets <= 0) return <div className="empty-chart">総資産を入力してください</div>;
  return <div className="bs" style={{ height }}>
    <div>{assets.map(p => <Segment key={p[0]} part={p} total={v.assets} normalized={normalized} />)}</div>
    <div>{debts.map(p => <Segment key={p[0]} part={p} total={rightTotal} normalized={normalized} />)}
      {d.equity >= 0 ? <Segment part={["純資産", d.equity, "equity"]} total={rightTotal} normalized={normalized} /> : <Loss label="債務超過" value={d.equity} total={rightTotal} />}
    </div>
  </div>;
}

function PlChart({ r, normalized, height }: { r: FinancialRecord; normalized: boolean; height: number }) {
  if (r.sales <= 0) return <div className="empty-chart">売上高を入力してください</div>;
  const costs: Part[] = [["売上原価", r.costOfSales, "costOfSales"], ["販売費及び一般管理費", r.sga, "sga"]];
  const isLoss = r.operatingProfit < 0;
  const total = isLoss ? r.sales + Math.abs(r.operatingProfit) : r.sales;
  return <div className="pl" style={{ height }}>
    <div>{costs.map(p => <Segment key={p[0]} part={p} total={total} normalized={normalized} />)}
      {!isLoss && <Segment part={["営業利益", r.operatingProfit, "operatingProfit"]} total={total} normalized={normalized} />}
    </div>
    <div><div className="sales" style={{ height: `${r.sales / total * 100}%` }}><span>売上高</span><b>{normalized ? `${(r.sales / total * 100).toFixed(1)}%` : fmt(r.sales)}</b></div>
      {isLoss && <Loss label="営業損失" value={r.operatingProfit} total={total} />}
    </div>
  </div>;
}

function Loss({ label, value, total }: { label: string; value: number; total: number }) {
  return <div className="segment loss" style={{ height: `${Math.max(15, Math.abs(value) / Math.max(1, total) * 100)}%` }} title={`${label} ${fmt(value)}`}><span>{label}</span><b>{fmt(value)}</b></div>;
}

function StatementCard({ r, g, scale, maxAssets, maxSales, sheet, emphasizeYear }: { r: FinancialRecord; g: Granularity; scale: ScaleMode; maxAssets: number; maxSales: number; sheet: Sheet; emphasizeYear: boolean }) {
  const v = validate(r, g), normalized = scale === "normalized";
  const bsHeight = normalized ? 300 : 300 * (v.assets * factor(r.unit) / maxAssets);
  const plTotal = r.operatingProfit < 0 ? r.sales + Math.abs(r.operatingProfit) : r.sales;
  const plHeight = normalized ? 300 : 300 * (plTotal * factor(r.unit) / maxSales);
  return <article className={`statement-card sheet-${sheet}`}>
    <header><div>{emphasizeYear
      ? <><h3>{r.year || "年度未入力"}年度</h3><p>{r.company || "企業名未入力"}・{r.unit}</p></>
      : <><h3>{r.company || "企業名未入力"}</h3><p>{r.year || "年度未入力"}年度・{r.unit}</p></>
    }</div><i>{normalized ? "構成比" : "実額"}</i></header>
    {v.warnings.length > 0 && <details className="warning"><summary>⚠ 入力値に不整合があります</summary>{v.warnings.map(x => <p key={x}>{x}</p>)}</details>}
    <div className="charts">
      {(sheet === "both" || sheet === "bs") && <section><h4>貸借対照表 <small>総資産 {fmt(v.assets)}</small></h4><BsChart r={r} g={g} normalized={normalized} height={bsHeight} /></section>}
      {(sheet === "both" || sheet === "pl") && <section><h4>損益計算書 <small>売上高 {fmt(r.sales)}</small></h4><PlChart r={r} normalized={normalized} height={plHeight} /></section>}
    </div>
  </article>;
}

export function FinancialApp() {
  const [records, setRecords] = useState<FinancialRecord[]>(() => [sample("sample-1")]);
  const [active, setActive] = useState("sample-1");
  const [view, setView] = useState<ViewMode>("single");
  const [g, setG] = useState<Granularity>("medium");
  const [scale, setScale] = useState<ScaleMode>("actual");
  const [sheet, setSheet] = useState<Sheet>("both");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState("");
  const current = records.find(r => r.id === active) ?? records[0];
  const displayed = deriveRecord(current);
  const visible = useMemo(() => view === "single" ? [current] : view === "timeline" ? [...records].filter(r => r.company === current.company).sort((a, b) => a.year.localeCompare(b.year)) : records, [view, current, records]);
  const maxAssets = Math.max(1, ...visible.map(r => validate(r, g).assets * factor(r.unit)));
  const maxSales = Math.max(1, ...visible.map(r => (r.operatingProfit < 0 ? r.sales + Math.abs(r.operatingProfit) : r.sales) * factor(r.unit)));
  const singleCommonMax = Math.max(maxAssets, maxSales);
  const shownSheet: Sheet = view === "single" ? "both" : sheet === "both" ? "bs" : sheet;
  const update = (key: keyof FinancialRecord, value: string) => setRecords(rs => rs.map(r => r.id === active ? deriveRecord({ ...r, [key]: ["company", "year", "unit"].includes(key) ? value : parseAmount(value) } as FinancialRecord) : r));
  const changeView = (next: ViewMode) => { setView(next); setSheet(next === "single" ? "both" : "bs"); };
  const add = () => { if ((view === "companies" && records.length >= 5) || (view === "timeline" && records.length >= 10)) return; const n = { ...sample(), id: crypto.randomUUID(), company: view === "timeline" ? current.company : `比較会社 ${records.length + 1}`, year: view === "timeline" ? String(Number(current.year) - records.length) : current.year }; setRecords(x => [...x, n]); setActive(n.id); };
  const remove = () => { if (records.length < 2) return; const next = records.find(r => r.id !== active)!; setRecords(x => x.filter(r => r.id !== active)); setActive(next.id); };
  const importPaste = () => { try { const { records: imported, granularity } = parsePastedTable(pasteText); const sameCompany = imported.every(r => r.company === imported[0].company); const nextView: ViewMode = imported.length === 1 ? "single" : sameCompany ? "timeline" : "companies"; setRecords(imported); setActive(imported[0].id); setView(nextView); setG(granularity); setSheet(nextView === "single" ? "both" : "bs"); setPasteOpen(false); setPasteError(""); } catch (e) { setPasteError(e instanceof Error ? e.message : "貼り付け内容を確認してください。"); } };
  const svg = () => exportSvg(visible, g, scale, shownSheet, view === "timeline");
  return <main>
    <nav><a className="brand" href="#top">比例縮尺財務諸表の作成webサイト</a></nav>
    <header className="hero" id="top"><p>PROPORTIONAL FINANCIAL STATEMENTS</p><h1><em>比例縮尺</em><br />財務諸表</h1></header>
    <section className="workspace"><aside className="controls">
      <Step n="01" title="表示を選ぶ" sub="目的に合わせて切り替え" />
      <div className="segmented">{([['single', '1社'], ['companies', '複数社'], ['timeline', '時系列']] as const).map(([k, l]) => <button key={k} className={view === k ? "active" : ""} onClick={() => changeView(k)}>{l}</button>)}</div>
      <div className="control-row"><label>粒度<select value={g} onChange={e => setG(e.target.value as Granularity)}><option value="medium">中粒度</option><option value="high">高粒度</option></select></label><label>縮尺<select value={scale} onChange={e => setScale(e.target.value as ScaleMode)}><option value="actual">実額（規模比較）</option><option value="normalized">標準化（構成比較）</option></select></label></div>
      <Step n="02" title="データを入力" sub="個別入力または表を一括貼り付け" />
      <button className="paste-launch" onClick={() => setPasteOpen(x => !x)}>▦ 財務データを一括貼り付け</button>
      {pasteOpen && <PastePanel text={pasteText} setText={setPasteText} error={pasteError} onImport={importPaste} />}
      {records.length > 1 && <div className="record-tabs">{records.map((r, i) => <button key={r.id} className={r.id === active ? "active" : ""} onClick={() => setActive(r.id)}>{i + 1}. {r.company}</button>)}</div>}
      <div className="meta-grid"><label>企業名<input value={current.company} onChange={e => update("company", e.target.value)} /></label><label>年度<input value={current.year} onChange={e => update("year", e.target.value)} /></label><label>単位<select value={current.unit} onChange={e => update("unit", e.target.value)}><option>円</option><option>千円</option><option>百万円</option></select></label></div>
      <div className="accounts"><fieldset><legend>貸借対照表</legend>{baseFields.map(([l, k]) => <label key={k}><span>{l}</span><input inputMode="decimal" value={displayed[k]} onChange={e => update(k, e.target.value)} /></label>)}</fieldset><fieldset><legend>損益計算書</legend>{plFields.map(([l, k]) => <label key={k}><span>{l}</span><input inputMode="decimal" value={current[k]} onChange={e => update(k, e.target.value)} /></label>)}</fieldset><fieldset><legend>高粒度の項目</legend>{highFields.map(([l, k, computed]) => <label key={k}><span>{l}</span><input inputMode="decimal" value={displayed[k]} readOnly={computed} aria-readonly={computed} onChange={e => !computed && update(k, e.target.value)} /></label>)}</fieldset></div>
      <div className="record-actions"><button onClick={add}>＋ {view === "timeline" ? "年度を追加" : "比較データを追加"}</button><button className="danger" disabled={records.length === 1} onClick={remove}>選択中を削除</button></div>
    </aside><section className="output">
      <div className="output-head"><Step n="03" title="図で確かめる" sub={`${visible.length}件を表示中`} /><div><button onClick={() => openSummary(svg())}>まとめて表示</button><button onClick={() => download(new Blob([svg()], { type: "image/svg+xml" }), "proportional-statements.svg")}>SVG</button><button className="primary" onClick={() => png(svg())}>PNGで保存</button></div></div>
      {view !== "single" && <div className="sheet-tabs" role="tablist" aria-label="比較する財務諸表"><button role="tab" aria-selected={shownSheet === "bs"} className={shownSheet === "bs" ? "active" : ""} onClick={() => setSheet("bs")}>貸借対照表（BS）</button><button role="tab" aria-selected={shownSheet === "pl"} className={shownSheet === "pl" ? "active" : ""} onClick={() => setSheet("pl")}>損益計算書（PL）</button></div>}
      <div className={`statements ${visible.length > 2 ? "many" : ""}`}>{visible.map(r => <StatementCard key={r.id} r={r} g={g} scale={scale} maxAssets={view === "single" ? singleCommonMax : maxAssets} maxSales={view === "single" ? singleCommonMax : maxSales} sheet={shownSheet} emphasizeYear={view === "timeline"} />)}</div>
      <p className="hint">各ブロックにカーソルを合わせると、金額と構成比を確認できます。</p>
    </section></section>
    <section className="usage-notice" aria-labelledby="usage-notice-title">
      <h2 id="usage-notice-title">利用上の注意</h2>
      <ul>
        <li>本サイトは教育目的のツールであり、会計・投資・税務その他の専門的判断を提供するものではありません。</li>
        <li>表示結果の完全性・正確性は保証されません。利用にあたっては、必ず有価証券報告書などの原資料と照合してください。</li>
        <li>入力データはサーバーへ送信されず、利用者のブラウザ内でのみ処理されます。ただし、個人情報、未公開情報、その他の機密情報は入力しないでください。</li>
        <li>本サイトは著者が教育目的で公開するものであり、著者の所属機関による公式サービス、承認または内容保証を意味しません。</li>
      </ul>
    </section>
    <footer>© 2026 Toru Ogasawara<span>比例縮尺財務諸表の作成Webサイト　<a href="./third-party-notices.txt">第三者ライセンス</a></span></footer>
  </main>;
}

function PastePanel({ text, setText, error, onImport }: { text: string; setText: (s: string) => void; error: string; onImport: () => void }) {
  const template = highGranularityTemplate("\t");
  const downloadTemplate = () => download(new Blob(["\uFEFF" + highGranularityTemplate(",")], { type: "text/csv;charset=utf-8" }), "比例縮尺財務諸表_入力テンプレート.csv");
  return <div className="paste-panel"><p>表計算ソフトなどから、見出し行を含む財務データを貼り付けてください。複数行は、企業名がすべて同じなら時系列、異なる企業名を含む場合は複数社比較として読み込みます。空欄の金額は0として扱います。</p><textarea aria-label="財務データを貼り付ける入力欄" value={text} onChange={e => setText(e.target.value)} placeholder={template} /><div><button onClick={downloadTemplate}>テンプレートCSV</button><button onClick={() => setText(template)}>入力例をセット</button><button className="paste-apply" onClick={onImport}>貼り付けデータを読み込む</button></div>{error && <p className="paste-error">⚠ {error}</p>}</div>;
}

export function highGranularityTemplate(delimiter: string) {
  const headers = highInputColumns.map(([label]) => label);
  const example = ["A社", "2026", "百万円", "600", "400", "300", "200", "210", "190", "120", "260", "170", "500", "1000", "600", "300", "100"];
  return `${headers.join(delimiter)}\n${example.join(delimiter)}`;
}

export function parsePastedTable(text: string): { records: FinancialRecord[]; granularity: Granularity } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("見出し行と1行以上のデータを貼り付けてください。");
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const rows = lines.map(line => splitRow(line, delimiter));
  const aliases = new Map<string, keyof FinancialRecord>(csvAliases);
  const headers = rows[0].map(x => aliases.get(x.replace(/^\uFEFF/, "").trim()));
  const missing = highInputColumns.filter(([, key]) => !headers.includes(key)).map(([label]) => label);
  if (missing.length) throw new Error(`高粒度の見出しが不足しています：${missing.join("、")}`);
  const result = rows.slice(1).map((row, index) => {
    const record = sample(crypto.randomUUID());
    (Object.keys(record) as (keyof FinancialRecord)[]).forEach(key => { if (!["id", "company", "year", "unit"].includes(key)) (record[key] as number | string) = 0; });
    headers.forEach((key, i) => { if (!key) return; const value = row[i]?.trim() ?? ""; if (key === "company" || key === "year") (record[key] as string) = value; else if (key === "unit") { if (!["円", "千円", "百万円"].includes(value)) throw new Error(`${index + 2}行目の単位は「円・千円・百万円」から選んでください。`); record.unit = value as FinancialRecord["unit"]; } else { const amount = parseAmount(value); if (!Number.isFinite(amount)) throw new Error(`${index + 2}行目「${rows[0][i]}」の数値を確認してください。`); (record[key] as number | string) = amount; } });
    if (!record.company || !record.year) throw new Error(`${index + 2}行目の企業名または年度が空欄です。`);
    return deriveRecord(record);
  });
  if (result.length > 50) throw new Error("一度に読み込めるデータは50件までです。");
  return { records: result, granularity: "high" };
}

function splitRow(line: string, delimiter: string) {
  if (delimiter === "\t") return line.split("\t");
  const cells: string[] = []; let cell = "", quoted = false;
  for (let i = 0; i < line.length; i++) { const c = line[i]; if (c === '"' && line[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = !quoted; else if (c === "," && !quoted) { cells.push(cell); cell = ""; } else cell += c; }
  cells.push(cell); return cells;
}

function Step({ n, title, sub }: { n: string; title: string; sub: string }) { return <div className="step"><span>{n}</span><div><b>{title}</b><small>{sub}</small></div></div>; }
function download(blob: Blob, name: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); }
function esc(s: string) { return s.replace(/[<>&'\"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!); }
export function exportSvg(rs: FinancialRecord[], g: Granularity, scale: ScaleMode, sheet: Sheet, emphasizeYear: boolean) {
  const cardWidth = sheet === "both" ? 300 : 210, W = Math.max(720, rs.length * cardWidth + 40);
  const maxAssetBase = Math.max(1, ...rs.map(r => validate(r, g).assets * factor(r.unit)));
  const maxSalesBase = Math.max(1, ...rs.map(r => (r.operatingProfit < 0 ? r.sales + Math.abs(r.operatingProfit) : r.sales) * factor(r.unit)));
  const commonBase = sheet === "both" ? Math.max(maxAssetBase, maxSalesBase) : 0;
  const maxHeight = 260, bottom = 380;
  const parts = rs.map((r, i) => {
    const d = deriveRecord(r), x = 35 + i * cardWidth, a = aggregate(d, g), v = validate(d, g);
    const total = Math.max(v.assets, a.currentLiabilities + a.fixedLiabilities + Math.max(0, d.equity));
    const bsDenominator = sheet === "both" ? commonBase : maxAssetBase;
    const plDenominator = sheet === "both" ? commonBase : maxSalesBase;
    const bsHeight = scale === "normalized" ? maxHeight : maxHeight * (v.assets * factor(r.unit) / bsDenominator);
    const plTotal = r.operatingProfit < 0 ? r.sales + Math.abs(r.operatingProfit) : r.sales;
    const plHeight = scale === "normalized" ? maxHeight : maxHeight * (plTotal * factor(r.unit) / plDenominator);
    let ly = bottom - bsHeight, ry = bottom - bsHeight, py = bottom - plHeight;
    let s = emphasizeYear
      ? `<text x="${x}" y="55" font-size="18" font-weight="700">${esc(r.year)}年度</text><text x="${x}" y="78" font-size="12">${esc(r.company)}・${r.unit}</text>`
      : `<text x="${x}" y="55" font-size="18" font-weight="700">${esc(r.company)}</text><text x="${x}" y="78" font-size="12">${esc(r.year)}年度・${r.unit}</text>`;
    const block = (label: string, n: number, t: number, chartHeight: number, xx: number, yy: number, color: string, key = "") => { const h = Math.abs(n) / Math.max(1, t) * chartHeight; const textColor = lightTextKeys.has(key) ? "#FFFFFF" : "#17212B"; return [`<rect x="${xx}" y="${yy}" width="92" height="${h}" fill="${color}" stroke="#17212B"/><text x="${xx + 4}" y="${yy + Math.min(16, Math.max(10, h - 3))}" font-size="9" fill="${textColor}">${label}</text>`, h] as const; };
    if (sheet !== "pl") { const assetParts: Part[] = g === "medium" ? [["流動資産", a.currentAssets, "currentAssets"], ["固定資産", a.fixedAssets, "fixedAssets"]] : [["現預金", d.cash, "cash"], ["売上債権", d.receivables, "receivables"], ["棚卸資産", d.inventory, "inventory"], ["その他の流動資産", d.otherCurrentAssets, "otherCurrentAssets"], ["有形固定資産", d.tangibleAssets, "tangibleAssets"], ["その他の固定資産", d.otherFixedAssets, "otherFixedAssets"]]; const debtParts: Part[] = g === "medium" ? [["流動負債", a.currentLiabilities, "currentLiabilities"], ["固定負債", a.fixedLiabilities, "fixedLiabilities"]] : [["仕入債務", d.payables, "payables"], ["その他の流動負債", d.otherCurrentLiabilities, "otherCurrentLiabilities"], ["固定負債", d.fixedLiabilities, "fixedLiabilities"]]; for (const p of assetParts) { const [q, h] = block(p[0], p[1], v.assets, bsHeight, x, ly, colors[p[2]], p[2]); s += q; ly += h; } for (const p of [...debtParts, [d.equity < 0 ? "債務超過" : "純資産", d.equity, d.equity < 0 ? "loss" : "equity"] as Part]) { const [q, h] = block(p[0], p[1], total, bsHeight, x + 92, ry, colors[p[2]], p[2]); s += q; ry += h; } }
    if (sheet !== "bs") { const plX = sheet === "both" ? x + 196 : x; const isLoss = r.operatingProfit < 0; const leftParts: Part[] = [["売上原価", r.costOfSales, "costOfSales"], ["販売費及び一般管理費", r.sga, "sga"]]; if (!isLoss) leftParts.push(["営業利益", r.operatingProfit, "operatingProfit"]); for (const p of leftParts) { const [q, h] = block(p[0], p[1], plTotal, plHeight, plX, py, colors[p[2]], p[2]); s += q; py += h; } let salesY = bottom - plHeight; const [sales, salesHeight] = block("売上高", r.sales, plTotal, plHeight, plX + 92, salesY, "#E5E7EB"); s += sales; salesY += salesHeight; if (isLoss) { const [loss] = block("営業損失", r.operatingProfit, plTotal, plHeight, plX + 92, salesY, colors.loss, "loss"); s += loss; } }
    return s;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="430" viewBox="0 0 ${W} 430"><rect width="100%" height="100%" fill="#f6f3eb"/><text x="35" y="25" font-family="sans-serif" font-size="13">比例縮尺財務諸表｜${sheet === "bs" ? "BS" : sheet === "pl" ? "PL" : "BS・PL"}｜${scale === "actual" ? "実額" : "標準化"}・${g === "medium" ? "中" : "高"}粒度</text><g font-family="sans-serif" fill="#173530">${parts}</g></svg>`;
}
function png(svg: string) { const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), image = new Image(); image.onload = () => { const c = document.createElement("canvas"); c.width = image.width * 2; c.height = image.height * 2; const x = c.getContext("2d")!; x.scale(2, 2); x.drawImage(image, 0, 0); c.toBlob(b => b && download(b, "proportional-statements.png")); URL.revokeObjectURL(url); }; image.src = url; }
function openSummary(svg: string) {
  const preview = window.open("", "_blank", "width=1200,height=820");
  if (!preview) { alert("まとめ表示を開けませんでした。ブラウザのポップアップを許可してください。"); return; }
  preview.document.open();
  preview.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>比例縮尺財務諸表｜まとめて表示</title><style>*{box-sizing:border-box}body{margin:0;background:#eef1f4;color:#17212b;font-family:"Hiragino Sans","Yu Gothic",system-ui,sans-serif}.bar{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 22px;background:#fff;border-bottom:1px solid #cbd4dd}.bar h1{margin:0;font-size:17px}.actions{display:flex;gap:8px}.actions button{border:1px solid #9aa8b5;border-radius:7px;background:#fff;padding:8px 12px;font:700 12px inherit;cursor:pointer}.actions .primary{border-color:#0072b2;background:#0072b2;color:#fff}.canvas{min-height:calc(100vh - 62px);padding:24px;overflow:auto}.sheet{width:max-content;min-width:100%;padding:20px;background:#fff;box-shadow:0 8px 28px rgba(23,33,43,.12)}svg{display:block;max-width:none;height:auto;margin:auto}@media print{body{background:#fff}.bar{display:none}.canvas{padding:0}.sheet{box-shadow:none;padding:0}}</style></head><body><header class="bar"><h1>比例縮尺財務諸表｜まとめて表示</h1><div class="actions"><button onclick="window.print()">印刷</button><button class="primary" onclick="savePng()">PNGで保存</button><button onclick="window.close()">閉じる</button></div></header><main class="canvas"><div class="sheet">${svg}</div></main><script>function savePng(){const source=document.querySelector('svg');const xml=new XMLSerializer().serializeToString(source);const url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml'}));const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=image.width*2;canvas.height=image.height*2;const context=canvas.getContext('2d');context.scale(2,2);context.drawImage(image,0,0);canvas.toBlob(blob=>{const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='proportional-statements.png';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),500)},'image/png');URL.revokeObjectURL(url)};image.src=url}</script></body></html>`);
  preview.document.close();
}
