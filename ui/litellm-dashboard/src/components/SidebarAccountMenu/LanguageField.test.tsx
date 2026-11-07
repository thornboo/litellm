import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { englishName, Locales, LOCALES, nativeName } from "@/i18n/languages";

import LanguageField from "./LanguageField";

const locales: Locales = new Map([
  ["ja", async () => ({})],
  ["es", async () => ({})],
]);

const renderField = (fieldLocales: Locales) => {
  const store = { read: () => null, write: vi.fn() };
  const reload = vi.fn();
  const view = render(<LanguageField locales={fieldLocales} store={store} reload={reload} />);
  return { ...view, store, reload };
};

describe("LanguageField", () => {
  it("offers Simplified Chinese, warns about reload and saves the language code", async () => {
    const { store, reload } = renderField(LOCALES);

    expect(screen.getByText("Changing language reloads the page. Unsaved input will be lost.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("combobox", { name: /Language/ }));
    await userEvent.click(await screen.findByRole("option", { name: /简体中文/ }));

    expect(store.write).toHaveBeenCalledWith("zh-CN");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("can clear a saved language after its resource failed and English is displayed", async () => {
    const store = { read: () => "zh-CN", write: vi.fn() };
    const reload = vi.fn();
    render(<LanguageField locales={LOCALES} store={store} reload={reload} />);

    await userEvent.click(screen.getByRole("combobox", { name: /Language/ }));
    await userEvent.click(await screen.findByRole("option", { name: nativeName("en") }));

    expect(store.write).toHaveBeenCalledWith("en");
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("stays hidden while English is the only language", () => {
    const { container } = renderField(new Map());

    expect(container).toBeEmptyDOMElement();
  });

  it("lists each language by its own name with the English name beside it", async () => {
    renderField(locales);
    expect(screen.getByRole("combobox", { name: /Language/ })).toHaveTextContent(nativeName("en"));

    await userEvent.click(screen.getByRole("combobox", { name: /Language/ }));

    const japanese = await screen.findByRole("option", { name: new RegExp(nativeName("ja")) });
    expect(japanese).toHaveTextContent(englishName("ja"));
    expect(screen.getByRole("option", { name: new RegExp(nativeName("es")) })).toHaveTextContent(englishName("es"));
    expect(screen.getByRole("option", { name: nativeName("en") })).toBeInTheDocument();
  });

  it("links the fallback note to where translations live", () => {
    renderField(locales);

    expect(screen.getByRole("link", { name: "Help translate" })).toHaveAttribute(
      "href",
      expect.stringContaining("ui/litellm-dashboard/src/i18n/locales"),
    );
  });

  it("saves the chosen language and reloads the page", async () => {
    const { store, reload } = renderField(locales);

    await userEvent.click(screen.getByRole("combobox", { name: /Language/ }));
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(nativeName("ja")) }));

    expect(store.write).toHaveBeenCalledWith("ja");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the current language is picked again", async () => {
    const { store, reload } = renderField(locales);

    await userEvent.click(screen.getByRole("combobox", { name: /Language/ }));
    await userEvent.click(await screen.findByRole("option", { name: nativeName("en") }));

    expect(store.write).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
