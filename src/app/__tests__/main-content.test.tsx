import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <div data-testid="file-system-provider">{children}</div>,
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <div data-testid="chat-provider">{children}</div>,
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat Interface</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">File Tree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">Code Editor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview Frame</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">Header Actions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: any) => (
    <div className={className} data-testid="resizable-panel-group">{children}</div>
  ),
  ResizablePanel: ({ children, className }: any) => (
    <div className={className} data-testid="resizable-panel">{children}</div>
  ),
  ResizableHandle: ({ className }: any) => (
    <div className={className} data-testid="resizable-handle" />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

test("renders with preview view by default", () => {
  render(<MainContent />);

  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
  expect(screen.queryByTestId("file-tree")).toBeNull();
});

test("renders both toggle buttons", () => {
  render(<MainContent />);

  const previewButton = screen.getByRole("tab", { name: /preview/i });
  const codeButton = screen.getByRole("tab", { name: /code/i });

  expect(previewButton).toBeDefined();
  expect(codeButton).toBeDefined();
});

test("preview button is active by default", () => {
  render(<MainContent />);

  const previewButton = screen.getByRole("tab", { name: /preview/i });
  const codeButton = screen.getByRole("tab", { name: /code/i });

  expect(previewButton.getAttribute("data-state")).toBe("active");
  expect(codeButton.getAttribute("data-state")).toBe("inactive");
});

test("clicking code button switches to code view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeButton = screen.getByRole("tab", { name: /code/i });

  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();

  await user.click(codeButton);

  expect(screen.queryByTestId("preview-frame")).toBeNull();
  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.getByTestId("file-tree")).toBeDefined();
});

test("clicking preview button after code button switches back to preview view", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeButton = screen.getByRole("tab", { name: /code/i });
  const previewButton = screen.getByRole("tab", { name: /preview/i });

  await user.click(codeButton);
  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();

  await user.click(previewButton);
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("toggle buttons update their active state correctly", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const previewButton = screen.getByRole("tab", { name: /preview/i });
  const codeButton = screen.getByRole("tab", { name: /code/i });

  expect(previewButton.getAttribute("data-state")).toBe("active");
  expect(codeButton.getAttribute("data-state")).toBe("inactive");

  await user.click(codeButton);

  expect(previewButton.getAttribute("data-state")).toBe("inactive");
  expect(codeButton.getAttribute("data-state")).toBe("active");

  await user.click(previewButton);

  expect(previewButton.getAttribute("data-state")).toBe("active");
  expect(codeButton.getAttribute("data-state")).toBe("inactive");
});

test("renders chat interface in left panel regardless of toggle state", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  expect(screen.getByTestId("chat-interface")).toBeDefined();

  const codeButton = screen.getByRole("tab", { name: /code/i });
  await user.click(codeButton);

  expect(screen.getByTestId("chat-interface")).toBeDefined();
});

test("renders with user and project props", () => {
  const user = { id: "123", email: "test@example.com" };
  const project = {
    id: "proj-123",
    name: "Test Project",
    messages: [],
    data: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  render(<MainContent user={user} project={project} />);

  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.getByTestId("chat-interface")).toBeDefined();
});
