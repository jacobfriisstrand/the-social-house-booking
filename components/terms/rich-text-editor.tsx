"use client";

// The terms editor (#102): Tiptap with the minimal toolbar the three texts
// need — two heading levels, bold/italic, the two list kinds, link, and
// undo/redo. The schema lives in lib/terms/rich-text.ts; the server stores
// only markup that schema generates, so the toolbar is the whole format.
import { EditorContent, useEditor } from "@tiptap/react";
import {
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  ItalicIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toggleVariants } from "@/components/ui/toggle";
import {
  isAllowedTermsHref,
  termsExtensions,
  termsHtmlStyles,
} from "@/lib/terms/rich-text";
import { messages } from "@/messages/da";

const copy = messages.terms.admin;
// The visible label and the contenteditable share this id, so activating
// the label focuses the editor. The editable is inside the bordered box.
const CONTENT_ID = "field-content";

interface ToolbarButton {
  action: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
}

interface TermsRichTextEditorProps {
  content: string;
  invalid?: boolean;
  onChange: (html: string) => void;
}

interface LinkRowProps {
  apply: () => void;
  close: () => void;
  href: string;
  onHrefChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onHrefKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

// The link dialog under the editor: href input, apply and remove. The
// parent owns the open/closed state (the toolbar's link button opens it
// with the selection's current href) and the input's handlers; the row
// renders them and the "not allowed" line.
function LinkRow({
  apply,
  close,
  onHrefChange,
  onHrefKeyDown,
  href,
}: LinkRowProps) {
  const invalidHref =
    href.trim().length > 0 && !isAllowedTermsHref(href.trim());
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          aria-label={copy.link.href}
          onChange={onHrefChange}
          onKeyDown={onHrefKeyDown}
          placeholder="https://"
          value={href}
        />
        <Button
          disabled={!isAllowedTermsHref(href.trim())}
          onClick={apply}
          size="sm"
          type="button"
        >
          {copy.link.apply}
        </Button>
        <Button onClick={close} size="sm" type="button" variant="outline">
          {copy.link.remove}
        </Button>
      </div>
      {invalidHref ? (
        <p className="text-destructive text-sm">{copy.link.invalid}</p>
      ) : null}
    </div>
  );
}

export function TermsRichTextEditor({
  content,
  invalid = false,
  onChange,
}: TermsRichTextEditorProps) {
  // null while the row is closed; "" or the current href while it is open.
  const [linkHref, setLinkHref] = useState<string | null>(null);
  const editor = useEditor({
    content,
    editorProps: {
      attributes: {
        "aria-label": messages.terms.content,
        class: `min-h-64 outline-none ${termsHtmlStyles}`,
        id: CONTENT_ID,
      },
    },
    extensions: termsExtensions(),
    immediatelyRender: false,
    onUpdate: ({ editor: updated }) => onChange(updated.getHTML()),
    shouldRerenderOnTransaction: true,
  });

  const applyLink = useCallback(() => {
    const href = (linkHref ?? "").trim();
    if (!isAllowedTermsHref(href)) {
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkHref(null);
  }, [editor, linkHref]);

  const removeLink = useCallback(() => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkHref(null);
  }, [editor]);

  const onLinkHrefChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setLinkHref(event.target.value),
    []
  );

  // An input inside the form: Enter must apply the link, not publish the
  // version.
  const onLinkHrefKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyLink();
      }
    },
    [applyLink]
  );

  // Clicking a toolbar button must not steal the editor's focus or its
  // selection.
  const keepFocus = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  }, []);

  if (!editor) {
    return null;
  }

  const buttons: ToolbarButton[] = [
    {
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      icon: <BoldIcon />,
      label: copy.toolbar.bold,
    },
    {
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      icon: <ItalicIcon />,
      label: copy.toolbar.italic,
    },
    {
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive("heading", { level: 1 }),
      icon: <Heading1Icon />,
      label: copy.toolbar.heading1,
    },
    {
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
      icon: <Heading2Icon />,
      label: copy.toolbar.heading2,
    },
    {
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
      icon: <ListIcon />,
      label: copy.toolbar.bulletList,
    },
    {
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
      icon: <ListOrderedIcon />,
      label: copy.toolbar.orderedList,
    },
    {
      action: () =>
        setLinkHref(
          editor.isActive("link")
            ? (editor.getAttributes("link").href ?? "")
            : ""
        ),
      active: editor.isActive("link"),
      icon: <Link2Icon />,
      label: copy.toolbar.link,
    },
    {
      action: () => editor.chain().focus().undo().run(),
      disabled: !editor.can().undo(),
      icon: <Undo2Icon />,
      label: copy.toolbar.undo,
    },
    {
      action: () => editor.chain().focus().redo().run(),
      disabled: !editor.can().redo(),
      icon: <Redo2Icon />,
      label: copy.toolbar.redo,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-fit flex-wrap gap-0.5 rounded-lg bg-secondary p-1">
        {buttons.map((button) => (
          <button
            aria-label={button.label}
            aria-pressed={button.active}
            className={toggleVariants({ size: "sm" })}
            disabled={button.disabled}
            key={button.label}
            onClick={button.action}
            onMouseDown={keepFocus}
            title={button.label}
            type="button"
          >
            {button.icon}
          </button>
        ))}
      </div>
      <div
        aria-invalid={invalid}
        className="rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40"
      >
        <EditorContent editor={editor} />
      </div>
      {linkHref === null ? null : (
        <LinkRow
          apply={applyLink}
          close={removeLink}
          href={linkHref}
          onHrefChange={onLinkHrefChange}
          onHrefKeyDown={onLinkHrefKeyDown}
        />
      )}
    </div>
  );
}
