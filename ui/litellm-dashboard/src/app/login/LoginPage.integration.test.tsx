import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n/i18n";
import { LANGUAGE_STORAGE_KEY, LOCALES } from "@/i18n/languages";
import LoginPage from "./LoginPage";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockMutate = vi.fn();
const mockSelectWorker = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush, replace: mockReplace })),
}));

vi.mock("@/app/(dashboard)/hooks/uiConfig/useUIConfig", () => ({
  useUIConfig: vi.fn(),
}));

vi.mock("@/utils/cookieUtils", () => ({
  clearTokenCookies: vi.fn(),
  getCookieFromDocument: vi.fn(() => null),
}));

vi.mock("@/utils/jwtUtils", () => ({
  isJwtExpired: vi.fn(() => true),
}));

vi.mock("@/components/networking", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/networking")>();
  return {
    ...actual,
    getProxyBaseUrl: vi.fn(() => "http://localhost:4000"),
    switchToWorkerUrl: vi.fn(),
    exchangeLoginCode: vi.fn(),
  };
});

vi.mock("@/app/(dashboard)/hooks/login/useLogin", () => ({
  useLogin: vi.fn(() => ({ mutate: mockMutate, isPending: false, error: null })),
}));

vi.mock("@/hooks/useWorker", () => ({
  useWorker: vi.fn(() => ({
    isControlPlane: false,
    workers: WORKERS,
    selectedWorkerId: null,
    selectedWorker: null,
    selectWorker: mockSelectWorker,
    disconnectFromWorker: vi.fn(),
  })),
}));

import { useUIConfig } from "@/app/(dashboard)/hooks/uiConfig/useUIConfig";
import { switchToWorkerUrl } from "@/components/networking";

let WORKERS: { worker_id: string; name: string; url: string }[] = [];

const renderLoginPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>,
  );
};

const setSearch = (search: string) => {
  Object.defineProperty(window, "location", {
    value: { ...window.location, pathname: "/ui/login", search, href: `http://localhost:3000/ui/login${search}` },
    writable: true,
  });
};

const originalLocation = window.location;

describe("LoginPage submit payload", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    vi.clearAllMocks();
    WORKERS = [];
    setSearch("");
    (useUIConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        auto_redirect_to_sso: false,
        server_root_path: "/",
        proxy_base_url: null,
        sso_configured: false,
      },
      isLoading: false,
    });
  });

  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage("en");
    window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    Object.defineProperty(window, "location", { value: originalLocation, writable: true });
  });

  it.each([
    { language: "en", title: "Login", username: "Username", password: "Password" },
    { language: "zh-CN", title: "登录", username: "用户名", password: "密码" },
  ])("keeps the login payload unchanged in $language", async ({ language, title, username, password }) => {
    const messages = await LOCALES.get(language)?.();
    if (messages) i18n.addResourceBundle(language, "translation", messages);
    await i18n.changeLanguage(language);
    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: title });

    fireEvent.change(screen.getByLabelText(username), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText(password), { target: { value: "sk-9876" } });
    await user.click(screen.getByRole("button", { name: title, exact: true }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate.mock.calls[0][0]).toStrictEqual({ username: "admin", password: "sk-9876", useV3: false });
    expect(switchToWorkerUrl).not.toHaveBeenCalled();
  });

  it("saves a language choice without submitting the login form", async () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, reload }, writable: true });
    renderLoginPage();
    await screen.findByRole("heading", { name: "Login" });

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "sk-9876" } });
    await userEvent.click(screen.getByRole("combobox", { name: /Language/ }));
    await userEvent.click(await screen.findByRole("option", { name: /简体中文/ }));

    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("zh-CN");
    expect(reload).toHaveBeenCalledTimes(1);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("validates empty credentials in Chinese", async () => {
    const messages = await LOCALES.get("zh-CN")?.();
    if (messages) i18n.addResourceBundle("zh-CN", "translation", messages);
    await i18n.changeLanguage("zh-CN");
    renderLoginPage();
    await screen.findByRole("heading", { name: "登录" });

    await userEvent.click(screen.getByRole("button", { name: "登录", exact: true }));

    expect(await screen.findByText("请输入用户名")).toBeInTheDocument();
    expect(screen.getByText("请输入密码")).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submits on Enter from the password field", async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: "Login" });

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "admin" } });
    await user.type(screen.getByLabelText("Password"), "sk-9876{Enter}");

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate.mock.calls[0][0]).toStrictEqual({ username: "admin", password: "sk-9876", useV3: false });
  });

  it("blocks submit and shows both required messages when the fields are empty", async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await screen.findByRole("heading", { name: "Login" });

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Please enter your username")).toBeInTheDocument();
    expect(screen.getByText("Please enter your password")).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("sends useV3:true for a worker chosen from the Worker picker", async () => {
    const user = userEvent.setup();
    WORKERS = [
      { worker_id: "worker-a", name: "Worker A", url: "http://worker-a:4000" },
      { worker_id: "worker-b", name: "Worker B", url: "http://worker-b:4000" },
    ];
    (useUIConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        auto_redirect_to_sso: false,
        server_root_path: "/",
        proxy_base_url: null,
        sso_configured: false,
        is_control_plane: true,
      },
      isLoading: false,
    });

    renderLoginPage();
    await screen.findByRole("heading", { name: "Login" });

    await user.click(screen.getAllByRole("combobox")[0]);
    await user.click(await screen.findByText("Worker B"));
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "sk-9876" } });
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate.mock.calls[0][0]).toStrictEqual({ username: "admin", password: "sk-9876", useV3: true });
    expect(switchToWorkerUrl).toHaveBeenCalledWith("http://worker-b:4000");
  });

  it("switches to the selected worker url and sends useV3:true when a worker is preselected", async () => {
    const user = userEvent.setup();
    WORKERS = [{ worker_id: "worker-a", name: "Worker A", url: "http://worker-a:4000" }];
    setSearch("?worker=worker-a");
    (useUIConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        auto_redirect_to_sso: false,
        server_root_path: "/",
        proxy_base_url: null,
        sso_configured: false,
        is_control_plane: true,
      },
      isLoading: false,
    });

    renderLoginPage();
    await screen.findByRole("heading", { name: "Login" });

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "sk-9876" } });
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    expect(mockMutate.mock.calls[0][0]).toStrictEqual({ username: "admin", password: "sk-9876", useV3: true });
    expect(switchToWorkerUrl).toHaveBeenCalledWith("http://worker-a:4000");
  });
});
