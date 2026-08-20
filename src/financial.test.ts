import { describe, expect, it } from "vitest";
import { deriveRecord, factor, parseAmount, sample, validate } from "./financial";
import { exportSvg, highGranularityTemplate, parsePastedTable } from "./FinancialApp";

describe("財務計算", () => {
  it("単位を円換算する", () => {
    expect(factor("円")).toBe(1);
    expect(factor("千円")).toBe(1_000);
    expect(factor("百万円")).toBe(1_000_000);
  });

  it("カンマ付き金額と空欄を読み取る", () => {
    expect(parseAmount("1,234")).toBe(1234);
    expect(parseAmount(" ")).toBe(0);
  });

  it("その他項目を合計との差額で計算する", () => {
    const record = deriveRecord(sample("test"));
    expect(record.otherCurrentAssets).toBe(80);
    expect(record.otherFixedAssets).toBe(140);
    expect(record.otherCurrentLiabilities).toBe(130);
  });

  it("整合するサンプルには警告を出さない", () => {
    expect(validate(sample("test"), "high").warnings).toEqual([]);
  });

  it("BSとPLの不一致を検出する", () => {
    const record = { ...sample("test"), equity: 400, operatingProfit: 50 };
    const warnings = validate(record, "medium").warnings.join("\n");
    expect(warnings).toContain("BS不一致");
    expect(warnings).toContain("PL不一致");
  });

  it("債務超過と負のその他項目を警告する", () => {
    const record = { ...sample("test"), equity: -100, currentAssets: 400 };
    const warnings = validate(record, "high").warnings.join("\n");
    expect(warnings).toContain("BS不一致");
    expect(warnings).toContain("その他");
  });

  it("高粒度テンプレートをそのまま読み込める", () => {
    const result = parsePastedTable(highGranularityTemplate("\t"));
    expect(result.granularity).toBe("high");
    expect(result.records[0]).toMatchObject({ company: "A社", year: "2026", unit: "百万円" });
    expect(result.records[0].otherCurrentAssets).toBe(80);
  });

  it("旧見出しの会社名も後方互換として読み込める", () => {
    const input = highGranularityTemplate(",").replace("企業名", "会社名");
    expect(parsePastedTable(input).records[0].company).toBe("A社");
  });

  it("営業損失を売上高側へSVG出力する", () => {
    const record = { ...sample("loss"), costOfSales: 700, sga: 400, operatingProfit: -100 };
    const svg = exportSvg([record], "medium", "actual", "pl", false);
    expect(svg).toContain("営業損失");
    expect(svg.indexOf("売上高")).toBeLessThan(svg.indexOf("営業損失"));
  });
});
