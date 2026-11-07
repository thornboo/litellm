import { describe, expect, it } from "vitest";

import { englishName, Locales, LOCALES, nativeName, resolveLanguage, supportedLanguages } from "./languages";

const locales: Locales = new Map([["ja", async () => ({})]]);

describe("resolveLanguage", () => {
  it("uses the stored language when it has translations", () => {
    expect(resolveLanguage("ja", locales)).toBe("ja");
  });

  it.each([null, "", "en", "fr", "JA", "ja-JP", "__proto__"])("shows English when the stored value is %j", (stored) => {
    expect(resolveLanguage(stored, locales)).toBe("en");
  });

  it("shows English when no language besides English has translations", () => {
    expect(resolveLanguage("ja", new Map())).toBe("en");
  });
});

describe("supportedLanguages", () => {
  it("loads the registered Simplified Chinese login and navigation labels", async () => {
    const messages = await LOCALES.get("zh-CN")?.();

    expect(resolveLanguage("zh-CN", LOCALES)).toBe("zh-CN");
    expect(supportedLanguages(LOCALES)).toContain("zh-CN");
    expect(messages).toMatchObject({
      login: { form: { title: "登录" } },
      shell: { nav: { items: { virtualKeys: "虚拟密钥" } } },
    });
  });
  it("puts English first, then every language with translations", () => {
    expect(supportedLanguages(locales)).toEqual(["en", "ja"]);
    expect(supportedLanguages(new Map())).toEqual(["en"]);
  });
});

describe("language names", () => {
  it("identifies Simplified Chinese by its script", () => {
    expect(nativeName("zh-CN")).toBe("简体中文");
  });
  it("names a language in itself, starting with a capital letter", () => {
    const spanish = nativeName("es");

    expect(spanish.toLocaleLowerCase("es")).toBe(
      new Intl.DisplayNames(["es"], { type: "language" }).of("es")?.toLocaleLowerCase("es"),
    );
    expect(spanish.charAt(0)).toBe(spanish.charAt(0).toLocaleUpperCase("es"));
  });

  it("names a language in English for the secondary label", () => {
    expect(englishName("ja")).toBe(new Intl.DisplayNames(["en"], { type: "language" }).of("ja"));
    expect(englishName("ja")).not.toBe(nativeName("ja"));
  });
});
