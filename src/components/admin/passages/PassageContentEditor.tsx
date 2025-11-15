import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Image } from 'lucide-react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  IndentIncrease,
  IndentDecrease,
} from 'lucide-react';

interface PassageContentEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const PassageContentEditor: React.FC<PassageContentEditorProps> = ({ content, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const formatText = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Save selection before doing anything (selection might be lost when button is clicked)
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    // Ensure textarea has focus
    textarea.focus();
    
    let newText = content;
    let newCursorStart = start;
    let newCursorEnd = end;

    switch (format) {
      case 'bold':
        newText = content.substring(0, start) + `<strong>${selectedText}</strong>` + content.substring(end);
        newCursorStart = start + 8;
        newCursorEnd = end + 8;
        break;
      case 'italic':
        newText = content.substring(0, start) + `<em>${selectedText}</em>` + content.substring(end);
        newCursorStart = start + 4;
        newCursorEnd = end + 4;
        break;
      case 'underline':
        newText = content.substring(0, start) + `<u>${selectedText}</u>` + content.substring(end);
        newCursorStart = start + 3;
        newCursorEnd = end + 3;
        break;
      case 'strikethrough':
        newText = content.substring(0, start) + `<s>${selectedText}</s>` + content.substring(end);
        newCursorStart = start + 3;
        newCursorEnd = end + 3;
        break;
      case 'heading1':
        newText = content.substring(0, start) + `<h1>${selectedText}</h1>` + content.substring(end);
        newCursorStart = start + 4;
        newCursorEnd = end + 4;
        break;
      case 'heading2':
        newText = content.substring(0, start) + `<h2>${selectedText}</h2>` + content.substring(end);
        newCursorStart = start + 4;
        newCursorEnd = end + 4;
        break;
      case 'heading3':
        newText = content.substring(0, start) + `<h3>${selectedText}</h3>` + content.substring(end);
        newCursorStart = start + 4;
        newCursorEnd = end + 4;
        break;
      case 'list':
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          const formattedLines = lines.map(line => `<li>${line}</li>`).join('\n');
          newText = content.substring(0, start) + `<ul>\n${formattedLines}\n</ul>` + content.substring(end);
          newCursorStart = start + 5;
          newCursorEnd = start + formattedLines.length + 10;
        } else {
          newText = content.substring(0, start) + `<ul>\n<li>${selectedText}</li>\n</ul>` + content.substring(end);
          newCursorStart = start + 5;
          newCursorEnd = start + selectedText.length + 10;
        }
        break;
      case 'ordered-list':
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          const formattedLines = lines.map(line => `<li>${line}</li>`).join('\n');
          newText = content.substring(0, start) + `<ol>\n${formattedLines}\n</ol>` + content.substring(end);
          newCursorStart = start + 5;
          newCursorEnd = start + formattedLines.length + 10;
        } else {
          newText = content.substring(0, start) + `<ol>\n<li>${selectedText}</li>\n</ol>` + content.substring(end);
          newCursorStart = start + 5;
          newCursorEnd = start + selectedText.length + 10;
        }
        break;
      case 'align-left':
        newText = content.substring(0, start) + `<div style="text-align: left">${selectedText}</div>` + content.substring(end);
        newCursorStart = start + 25;
        newCursorEnd = end + 25;
        break;
      case 'align-center':
        newText = content.substring(0, start) + `<div style="text-align: center">${selectedText}</div>` + content.substring(end);
        newCursorStart = start + 27;
        newCursorEnd = end + 27;
        break;
      case 'align-right':
        newText = content.substring(0, start) + `<div style="text-align: right">${selectedText}</div>` + content.substring(end);
        newCursorStart = start + 26;
        newCursorEnd = end + 26;
        break;
      case 'indent':
        // Wrap selected text in a span with padding-left for indentation
        if (selectedText.trim()) {
          // Wrap selected text in padding span
          const indentPrefix = `<span style="padding-left: 2em;">`;
          const indentSuffix = `</span>`;
          newText = content.substring(0, start) + indentPrefix + selectedText + indentSuffix + content.substring(end);
          // Position cursor at the end of the selected text (inside the span, before closing tag)
          newCursorStart = start + indentPrefix.length + selectedText.length;
          newCursorEnd = newCursorStart;
        } else {
          // If no selection, insert an indented block at cursor
          const indentBlock = `<span style="padding-left: 2em;">\n  \n</span>`;
          newText = content.substring(0, start) + indentBlock + content.substring(start);
          // Position cursor inside the indented block
          newCursorStart = start + 34; // After "<span style="padding-left: 2em;">\n  "
          newCursorEnd = newCursorStart;
        }
        break;
      case 'outdent':
        // Remove indentation by unwrapping spans with padding-left
        if (selectedText.trim()) {
          let processedText = selectedText;
          // Match opening span with padding-left style (handle various formats)
          const paddingSpanRegex = /^<span\s+style\s*=\s*"padding-left:\s*\d+em;?"\s*>((?:.|\n)*?)<\/span>$/s;
          const match = processedText.match(paddingSpanRegex);
          if (match) {
            // Unwrap the outermost padding span
            processedText = match[1];
            newCursorStart = start;
            newCursorEnd = start + processedText.length;
            newText = content.substring(0, start) + processedText + content.substring(end);
          } else {
            // If no padding wrapper found, check if we can remove leading spaces
            // For plain text, just return as-is (no change)
            newText = content;
            newCursorStart = start;
            newCursorEnd = end;
          }
        } else {
          // If no selection, find the context around cursor and try to outdent
          // Look backward to find the start of current block/line
          let lineStart = start;
          while (lineStart > 0 && content[lineStart - 1] !== '\n') {
            lineStart--;
          }
          // Look forward to find the end of current line
          let lineEnd = start;
          while (lineEnd < content.length && content[lineEnd] !== '\n') {
            lineEnd++;
          }
          const currentLineText = content.substring(lineStart, lineEnd);
          
          // Try to unwrap padding span if cursor is inside one
          const beforeCursor = content.substring(0, start);
          const afterCursor = content.substring(start);
          // Find the nearest opening span with padding-left before cursor
          const lastSpanStart = beforeCursor.lastIndexOf('<span style="padding-left:');
          if (lastSpanStart !== -1) {
            // Find matching closing span after cursor
            const closeSpan = afterCursor.indexOf('</span>');
            if (closeSpan !== -1) {
              // Extract content between span tags
              const spanEnd = beforeCursor.indexOf('>', lastSpanStart) + 1;
              const spanContent = content.substring(spanEnd, start + closeSpan);
              newText = content.substring(0, lastSpanStart) + spanContent + content.substring(start + closeSpan + 7);
              const removedChars = (start + closeSpan + 7) - spanEnd;
              newCursorStart = Math.max(0, start - removedChars);
              newCursorEnd = Math.max(0, end - removedChars);
            } else {
              newText = content;
              newCursorStart = start;
              newCursorEnd = end;
            }
          } else {
            // No padding span found, try removing leading whitespace from line
            const trimmedLine = currentLineText.replace(/^\s+/, '');
            if (trimmedLine !== currentLineText) {
              newText = content.substring(0, lineStart) + trimmedLine + content.substring(lineEnd);
              const diff = currentLineText.length - trimmedLine.length;
              newCursorStart = Math.max(0, start - diff);
              newCursorEnd = Math.max(0, end - diff);
            } else {
              newText = content;
              newCursorStart = start;
              newCursorEnd = end;
            }
          }
        }
        break;
    }

    onChange(newText);

    // Set cursor position after the formatted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    // Check file type
    if (!file.type.match('image.*')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image file size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const start = textarea.selectionStart;

    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `passage-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('questions')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('questions')
        .getPublicUrl(filePath);

      // Insert image HTML at cursor position
      const imageHtml = `<img src="${publicUrl}" alt="Passage image" style="max-width: 100%; height: auto; margin: 10px 0;" />`;
      const newText = content.substring(0, start) + imageHtml + content.substring(start);
      onChange(newText);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Set cursor position after the inserted image
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + imageHtml.length, start + imageHtml.length);
      }, 0);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="content">Passage Content</Label>
      <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-gray-50">
        {/* Text Style */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => formatText('bold')} title="Bold">
            <Bold className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => formatText('italic')} title="Italic">
            <Italic className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => formatText('underline')} title="Underline">
            <Underline className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => formatText('strikethrough')} title="Strikethrough">
            <Strikethrough className="h-4 w-4" />
          </Button>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => formatText('heading1')} title="Heading 1">
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => formatText('heading2')} title="Heading 2">
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => formatText('heading3')} title="Heading 3">
            <Heading3 className="h-4 w-4" />
          </Button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => formatText('list')} title="Unordered List">
            <List className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => formatText('ordered-list')} title="Ordered List">
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => formatText('align-left')} title="Align Left">
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => formatText('align-center')} title="Align Center">
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => formatText('align-right')} title="Align Right">
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Indentation */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onMouseDown={(e) => {
              e.preventDefault();
              formatText('indent');
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            title="Increase Indent"
          >
            <IndentIncrease className="h-4 w-4" />
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onMouseDown={(e) => {
              e.preventDefault();
              formatText('outdent');
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            title="Decrease Indent"
          >
            <IndentDecrease className="h-4 w-4" />
          </Button>
        </div>

        {/* Insert Image */}
        <div className="flex gap-1">
          <input 
            type="file" 
            className="hidden" 
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            disabled={isUploading}
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={handleImageButtonClick} 
            title="Insert Image"
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Image className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        placeholder="Enter the passage text here... You can use HTML formatting or the toolbar above."
        className="font-mono text-sm"
      />
      <p className="text-xs text-gray-500">
        Tip: Select text and use the toolbar buttons above to format it, or write HTML directly in the textarea.
      </p>
    </div>
  );
};

export default PassageContentEditor;

