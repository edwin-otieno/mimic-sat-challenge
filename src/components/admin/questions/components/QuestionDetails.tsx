import React, { useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { QuestionType } from '../types';
import { DEFAULT_MODULES } from '../../tests/types';
import { QuestionFormValues } from '../schema';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Subscript, 
  Superscript,
  Plus,
  Minus,
  Divide,
  X,
  Equal,
  Pi,
  Infinity,
  Radical,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react';

interface QuestionDetailsProps {
  // No additional props needed as we'll use useFormContext
}

const QuestionDetails = ({}: QuestionDetailsProps) => {
  const { control, watch, setValue } = useFormContext<QuestionFormValues>();
  const moduleType = watch('module_type');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const insertSymbol = (symbol: string) => {
    const currentText = watch('text');
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = currentText.substring(0, start) + symbol + currentText.substring(end);
    setValue('text', newText);

    // Set cursor position after the inserted symbol
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  const formatText = (format: string) => {
    const currentText = watch('text');
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = currentText.substring(start, end);

    let newText = currentText;
    let newCursorStart = start;
    let newCursorEnd = end;

    switch (format) {
      case 'bold':
        newText = currentText.substring(0, start) + `<strong>${selectedText}</strong>` + currentText.substring(end);
        newCursorStart = start + 8;
        newCursorEnd = end + 8;
        break;
      case 'italic':
        newText = currentText.substring(0, start) + `<em>${selectedText}</em>` + currentText.substring(end);
        newCursorStart = start + 4;
        newCursorEnd = end + 4;
        break;
      case 'underline':
        newText = currentText.substring(0, start) + `<u>${selectedText}</u>` + currentText.substring(end);
        newCursorStart = start + 3;
        newCursorEnd = end + 3;
        break;
      case 'strikethrough':
        newText = currentText.substring(0, start) + `<s>${selectedText}</s>` + currentText.substring(end);
        newCursorStart = start + 3;
        newCursorEnd = end + 3;
        break;
      case 'subscript':
        newText = currentText.substring(0, start) + `<sub>${selectedText}</sub>` + currentText.substring(end);
        newCursorStart = start + 5;
        newCursorEnd = end + 5;
        break;
      case 'superscript':
        newText = currentText.substring(0, start) + `<sup>${selectedText}</sup>` + currentText.substring(end);
        newCursorStart = start + 5;
        newCursorEnd = end + 5;
        break;
      case 'heading1':
        newText = currentText.substring(0, start) + `<h1>${selectedText}</h1>` + currentText.substring(end);
        newCursorStart = start + 4;
        newCursorEnd = end + 4;
        break;
      case 'heading2':
        newText = currentText.substring(0, start) + `<h2>${selectedText}</h2>` + currentText.substring(end);
        newCursorStart = start + 4;
        newCursorEnd = end + 4;
        break;
      case 'heading3':
        newText = currentText.substring(0, start) + `<h3>${selectedText}</h3>` + currentText.substring(end);
        newCursorStart = start + 4;
        newCursorEnd = end + 4;
        break;
      case 'list':
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          const formattedLines = lines.map(line => `<li>${line}</li>`).join('\n');
          newText = currentText.substring(0, start) + `<ul>\n${formattedLines}\n</ul>` + currentText.substring(end);
          newCursorStart = start + 5;
          newCursorEnd = start + formattedLines.length + 10;
        } else {
          newText = currentText.substring(0, start) + `<ul>\n<li>${selectedText}</li>\n</ul>` + currentText.substring(end);
          newCursorStart = start + 5;
          newCursorEnd = start + selectedText.length + 10;
        }
        break;
      case 'ordered-list':
        if (selectedText.includes('\n')) {
          const lines = selectedText.split('\n');
          const formattedLines = lines.map(line => `<li>${line}</li>`).join('\n');
          newText = currentText.substring(0, start) + `<ol>\n${formattedLines}\n</ol>` + currentText.substring(end);
          newCursorStart = start + 5;
          newCursorEnd = start + formattedLines.length + 10;
        } else {
          newText = currentText.substring(0, start) + `<ol>\n<li>${selectedText}</li>\n</ol>` + currentText.substring(end);
          newCursorStart = start + 5;
          newCursorEnd = start + selectedText.length + 10;
        }
        break;
      case 'align-left':
        newText = currentText.substring(0, start) + `<div style="text-align: left">${selectedText}</div>` + currentText.substring(end);
        newCursorStart = start + 25;
        newCursorEnd = end + 25;
        break;
      case 'align-center':
        newText = currentText.substring(0, start) + `<div style="text-align: center">${selectedText}</div>` + currentText.substring(end);
        newCursorStart = start + 27;
        newCursorEnd = end + 27;
        break;
      case 'align-right':
        newText = currentText.substring(0, start) + `<div style="text-align: right">${selectedText}</div>` + currentText.substring(end);
        newCursorStart = start + 26;
        newCursorEnd = end + 26;
        break;
    }

    setValue('text', newText);

    // Set cursor position after the formatted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  };
  
  return (
    <div className="space-y-4">
      {/* Module selection */}
      <FormField
        control={control}
        name="module_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Module</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DEFAULT_MODULES.map((module) => (
                  <SelectItem key={module.type} value={module.type}>
                    {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Question type selection */}
      <FormField
        control={control}
        name="question_type"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Question Type</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={QuestionType.MultipleChoice} id="multiple-choice" />
                  <FormLabel htmlFor="multiple-choice" className="font-normal">
                    Multiple Choice
                  </FormLabel>
                </div>
                {moduleType === "math" && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={QuestionType.TextInput} id="text-input" />
                    <FormLabel htmlFor="text-input" className="font-normal">
                      Text Input (Math only)
                    </FormLabel>
                  </div>
                )}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Question text with formatting toolbar */}
      <FormField
        control={control}
        name="text"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Question Text</FormLabel>
            <div className="space-y-2">
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
                  <Button type="button" variant="ghost" size="sm" onClick={() => formatText('list')} title="Bullet List">
                  <List className="h-4 w-4" />
                </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => formatText('ordered-list')} title="Numbered List">
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

                {/* Math Symbols (only for math module) */}
                {moduleType === "math" && (
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertSymbol('+')} title="Plus">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertSymbol('−')} title="Minus">
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertSymbol('×')} title="Multiply">
                      <X className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertSymbol('÷')} title="Divide">
                      <Divide className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertSymbol('=')} title="Equals">
                      <Equal className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertSymbol('π')} title="Pi">
                      <Pi className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertSymbol('∞')} title="Infinity">
                      <Infinity className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => insertSymbol('√')} title="Square Root">
                      <Radical className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => formatText('subscript')} title="Subscript">
                      <Subscript className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => formatText('superscript')} title="Superscript">
                      <Superscript className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <FormControl>
                <Textarea 
                  {...field}
                  ref={textareaRef}
                  placeholder="Enter question text..."
                  className="min-h-[200px]"
                />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Explanation field */}
      <FormField
        control={control}
        name="explanation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Explanation (Optional)</FormLabel>
            <FormControl>
              <Textarea 
                {...field}
                placeholder="Enter explanation..." 
                className="min-h-[100px]"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default QuestionDetails;
