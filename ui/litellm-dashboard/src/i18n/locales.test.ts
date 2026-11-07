import { describe, expect, it } from "vitest";
import { createInstance } from "i18next";

import i18n from "./i18n";
import en from "./locales/en.json";
import zh from "./locales/zh-CN.json";

type Messages = { readonly [key: string]: string | Messages };

const isGroup = (value: unknown): value is Messages =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const leaves = (node: Messages, prefix: string): ReadonlyArray<readonly [string, unknown]> =>
  Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return isGroup(value) ? leaves(value, path) : [[path, value] as const];
  });

const pluralCounterpart = (key: string): string | null => {
  if (key.endsWith("_one")) return `${key.slice(0, -"_one".length)}_other`;
  if (key.endsWith("_other")) return `${key.slice(0, -"_other".length)}_one`;
  return null;
};

const entries = leaves(en, "");
const keys = new Set(entries.map(([key]) => key));

describe("en.json", () => {
  it("has a non-empty string at every leaf", () => {
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.filter(([, value]) => typeof value !== "string" || value === "").map(([key]) => key)).toEqual([]);
  });

  it("only uses placeholders named like identifiers, with an optional lowercase format", () => {
    expect(entries.some(([, value]) => String(value).includes("{{"))).toBe(true);
    const malformed = entries.filter(([, value]) => {
      const text = String(value);
      const wellFormed = text.match(/\{\{[A-Za-z_][A-Za-z0-9_]*(?:, [a-z]+)?\}\}/g)?.length ?? 0;
      return text.split("{{").length - 1 !== wellFormed || text.split("}}").length - 1 !== wellFormed;
    });
    expect(malformed.map(([key]) => key)).toEqual([]);
  });

  it("pairs every _one key with an _other key and back", () => {
    expect([...keys].some((key) => pluralCounterpart(key) !== null)).toBe(true);
    const unpaired = [...keys].filter((key) => {
      const counterpart = pluralCounterpart(key);
      return counterpart !== null && !keys.has(counterpart);
    });
    expect(unpaired).toEqual([]);
  });

  it("is what the i18n instance resolves keys from", () => {
    expect(i18n.t("workflows.drawer.eventCount", { count: 2 })).toBe("2 events");
  });
});

describe("Simplified Chinese", () => {
  const translated = leaves(zh, "");
  const english = new Map(entries);
  const placeholders = (value: unknown) =>
    String(value)
      .match(/\{\{[^}]+\}\}/g)
      ?.sort() ?? [];
  const tags = (value: unknown) =>
    String(value)
      .match(/<\/?[A-Za-z][A-Za-z0-9]*\s*\/?>/g)
      ?.sort() ?? [];

  it("preserves every interpolation and component tag required by translated messages", () => {
    expect(translated.length).toBeGreaterThan(0);
    for (const [key, value] of translated) {
      expect(english.has(key), key).toBe(true);
      expect(typeof value, key).toBe("string");
      expect(value, key).not.toBe("");
      expect(placeholders(value), key).toEqual(placeholders(english.get(key)));
      expect(tags(value), key).toEqual(tags(english.get(key)));
    }
  });

  it("translates whole resource groups without missing entries", () => {
    const expected = entries.filter(([key]) => Object.hasOwn(zh, key.split(".")[0])).map(([key]) => key);
    expect(translated.map(([key]) => key).sort()).toEqual(expected.sort());
  });

  it("renders Chinese messages, count interpolation and English fallback", async () => {
    const instance = createInstance();
    await instance.init({
      lng: "zh-CN",
      fallbackLng: "en",
      resources: {
        en: { translation: en },
        "zh-CN": { translation: { login: zh.login, shared: zh.shared, shell: zh.shell } },
      },
    });

    expect(instance.t("login.form.title")).toBe("登录");
    expect(instance.t("shared.dataTable.pagination.showing", { start: 1, end: 10, total: 25 })).toBe(
      "第 1 至 10 条，共 25 条",
    );
    for (const count of [0, 1, 2]) {
      expect(instance.t("shell.notifications.release.newFeatures", { count })).toBe(`${count} 项新功能`);
    }
    expect(instance.t("modelsAndEndpoints.page.tabs.add")).toBe(en.modelsAndEndpoints.page.tabs.add);
    await instance.changeLanguage("en");
    expect(instance.t("login.form.title")).toBe(en.login.form.title);
  });

  it("renders core management pages in Chinese and keeps machine CSV headers stable", async () => {
    const instance = createInstance();
    await instance.init({
      lng: "zh-CN",
      fallbackLng: "en",
      resources: { en: { translation: en }, "zh-CN": { translation: zh } },
    });

    for (const [key, label] of [
      ["apiKeys.virtualKeysTable.title", "虚拟密钥"],
      ["modelsAndEndpoints.page.title", "模型管理"],
      ["logs.detail.drawer.title", "请求详情"],
      ["usage.viewSelect.title", "用量"],
      ["teams.teamInfo.settings.title", "团队设置"],
      ["organizations.view.settings.title", "组织设置"],
      ["users.createUser.title", "邀请用户"],
      ["budgets.panel.title", "预算"],
      ["costOptimization.view.title", "成本优化"],
    ] as const) {
      expect(instance.t(key)).toBe(label);
    }
    expect(zh.costTracking.exportReport.csv).toEqual(en.costTracking.exportReport.csv);
  });
});
