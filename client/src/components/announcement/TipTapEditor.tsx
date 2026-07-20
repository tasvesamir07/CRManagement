import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { FONTS_LIST, loadGoogleFont } from '../../lib/fontLoader';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Code, List, ListOrdered, Trash2, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, AlignJustify
} from 'lucide-react';

interface TipTapEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function TipTapEditor({ value, onChange, placeholder = 'Write your notice content here...' }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      TextStyle,
      FontFamily,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // If editor is empty (e.g. just "<p></p>"), send empty string
      if (html === '<p></p>') {
        onChange('');
      } else {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[160px] p-3 text-sm text-ink bg-canvas leading-relaxed',
      },
    },
  });

  // Sync value from parent if it changes outside (e.g. presets)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '<p></p>', false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const handleFontChange = (family: string) => {
    if (family === 'default') {
      editor.commands.unsetFontFamily();
    } else {
      loadGoogleFont(family);
      editor.commands.setFontFamily(family);
    }
  };

  // Helper to find currently active font
  const getActiveFont = () => {
    for (const font of FONTS_LIST) {
      if (editor.isActive('textStyle', { fontFamily: font.family })) {
        return font.family;
      }
    }
    return 'default';
  };

  const activeFont = getActiveFont();

  return (
    <div className="border border-hairline rounded-sm overflow-hidden bg-canvas hover:border-hairline-strong transition-colors duration-150 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-hairline bg-canvas-soft select-none">
        
        {/* Font Selection Dropdown */}
        <div className="relative flex items-center mr-1">
          <select
            value={activeFont}
            onChange={(e) => handleFontChange(e.target.value)}
            className="h-8 pl-2 pr-7 py-1 text-xs border border-hairline rounded bg-canvas text-ink font-semibold focus:outline-none focus:border-primary cursor-pointer appearance-none min-w-[130px]"
          >
            <option value="default">Default Font</option>
            {FONTS_LIST.map((font) => (
              <option key={font.family} value={font.family} style={{ fontFamily: font.family }}>
                {font.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-ink-mute">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="h-6 w-px bg-hairline mx-1" />

        {/* Formatting Buttons */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            editor.isActive('bold') ? 'bg-primary/20 text-primary font-bold' : 'text-ink-mute hover:bg-canvas hover:text-ink'
          }`}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            editor.isActive('italic') ? 'bg-primary/20 text-primary' : 'text-ink-mute hover:bg-canvas hover:text-ink'
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            editor.isActive('underline') ? 'bg-primary/20 text-primary' : 'text-ink-mute hover:bg-canvas hover:text-ink'
          }`}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            editor.isActive('strike') ? 'bg-primary/20 text-primary' : 'text-ink-mute hover:bg-canvas hover:text-ink'
          }`}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-hairline mx-1" />

        {/* Code & Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            editor.isActive('code') ? 'bg-primary/20 text-primary' : 'text-ink-mute hover:bg-canvas hover:text-ink'
          }`}
          title="Code"
        >
          <Code className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            editor.isActive('bulletList') ? 'bg-primary/20 text-primary' : 'text-ink-mute hover:bg-canvas hover:text-ink'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            editor.isActive('orderedList') ? 'bg-primary/20 text-primary' : 'text-ink-mute hover:bg-canvas hover:text-ink'
          }`}
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-hairline mx-1" />

        {/* Alignment Controls */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-primary/20 text-primary' : 'text-ink-mute hover:bg-canvas hover:text-ink'
          }`}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-primary/20 text-primary' : 'text-ink-mute hover:bg-canvas hover:text-ink'
          }`}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-primary/20 text-primary' : 'text-ink-mute hover:bg-canvas hover:text-ink'
          }`}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`p-1.5 rounded transition-all cursor-pointer ${
            editor.isActive({ textAlign: 'justify' }) ? 'bg-primary/20 text-primary' : 'text-ink-mute hover:bg-canvas hover:text-ink'
          }`}
          title="Align Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-hairline mx-1" />

        {/* Clear formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().unsetTextAlign().run()}
          className="p-1.5 rounded text-ink-mute hover:bg-accent-tomato/10 hover:text-accent-tomato transition-all cursor-pointer"
          title="Clear Formatting"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* EDITOR CONTENT */}
      <div className="relative min-h-[160px]">
        <EditorContent editor={editor} />
        {editor.isEmpty && (
          <div className="absolute top-3 left-3 text-xs text-ink-faint pointer-events-none select-none font-sans">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
