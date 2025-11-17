import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, EyeOff, Image, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Passage, PassageFormValues, PassageQuestionFormValues } from './types';
import { getTestPassages, savePassage, deletePassage } from '@/services/testService';
import { QuestionType } from '../questions/types';
import SentenceSelector from './SentenceSelector';
import PassageContentEditor from './PassageContentEditor';
import PassageImageUpload from './PassageImageUpload';
import OptionImageUpload from '../questions/components/OptionImageUpload';
import { supabase } from '@/integrations/supabase/client';

// Form schema for passage creation/editing
const passageFormSchema = z.object({
  id: z.string().optional(),
  test_id: z.string(),
  module_type: z.enum(['reading', 'science', 'english']),
  title: z.string().optional(),
  content: z.string().min(10, 'Passage content must be at least 10 characters'),
  passage_order: z.number().min(1, 'Passage order must be at least 1'),
  questions: z.array(z.object({
    id: z.string().optional(),
    text: z.string().min(3, 'Question text must be at least 3 characters'),
    question_number: z.number().min(1, 'Question number must be at least 1'),
    options: z.array(z.object({
      id: z.string().optional(),
      text: z.string().min(1, 'Option text is required'),
      is_correct: z.boolean()
    })).optional(),
    explanation: z.string().optional(),
    imageUrl: z.string().optional(),
    question_type: z.nativeEnum(QuestionType),
    correct_answer: z.string().optional(),
    sentence_references: z.array(
      z.union([
        z.number(),
        z.object({
          sentenceIndex: z.number(),
          start: z.number(),
          end: z.number()
        })
      ])
    ).optional()
  })).min(1, 'At least one question is required')
});

interface PassageManagerProps {
  testId: string;
  testTitle: string;
}

const PassageManager: React.FC<PassageManagerProps> = ({ testId, testTitle }) => {
  const [passages, setPassages] = useState<Passage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPassage, setEditingPassage] = useState<Passage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [passagePreviewImage, setPassagePreviewImage] = useState<string | null>(null);
  const [passageImageFile, setPassageImageFile] = useState<File | null>(null);
  const [questionImageFiles, setQuestionImageFiles] = useState<Record<number, File>>({});
  const [questionPreviewImages, setQuestionPreviewImages] = useState<Record<number, string>>({});
  const [uploadingQuestionImages, setUploadingQuestionImages] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  const form = useForm<PassageFormValues>({
    resolver: zodResolver(passageFormSchema),
    defaultValues: {
      test_id: testId,
      module_type: 'reading',
      content: '',
      passage_order: 1,
      questions: []
    }
  });

  // Load passages on component mount
  useEffect(() => {
    loadPassages();
  }, [testId]);

  const loadPassages = async () => {
    try {
      setIsLoading(true);
      const data = await getTestPassages(testId);
      setPassages(data);
    } catch (error) {
      console.error('Error loading passages:', error);
      toast({
        title: "Error",
        description: "Failed to load passages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePassage = () => {
    setEditingPassage(null);
    setPassagePreviewImage(null);
    setPassageImageFile(null);
    setQuestionImageFiles({});
    setQuestionPreviewImages({});
    form.reset({
      test_id: testId,
      module_type: 'reading',
      content: '',
      passage_order: passages.length + 1,
      questions: []
    });
    setIsDialogOpen(true);
  };

  const handleEditPassage = (passage: Passage) => {
    setEditingPassage(passage);
    setPassagePreviewImage(null);
    setPassageImageFile(null);
    setQuestionImageFiles({});
    setQuestionPreviewImages({});
    form.reset({
      id: passage.id,
      test_id: passage.test_id,
      module_type: passage.module_type,
      title: passage.title || '',
      content: passage.content,
      passage_order: passage.passage_order,
      questions: passage.questions?.map(q => ({
        id: q.id,
        text: q.text,
        question_number: q.question_number,
        options: q.options?.map(opt => ({
          id: opt.id,
          text: opt.text,
          is_correct: opt.is_correct
        })),
        explanation: q.explanation || '',
        imageUrl: q.imageUrl || '',
        question_type: q.question_type,
        correct_answer: q.correct_answer || '',
        sentence_references: q.sentence_references || []
      })) || []
    });
    setIsDialogOpen(true);
  };

  const handleDeletePassage = async (passageId: string) => {
    if (!confirm('Are you sure you want to delete this passage and all its questions?')) {
      return;
    }

    try {
      await deletePassage(passageId);
      await loadPassages();
      toast({
        title: "Success",
        description: "Passage deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting passage:', error);
      toast({
        title: "Error",
        description: "Failed to delete passage",
        variant: "destructive"
      });
    }
  };

  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('questions')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('questions')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
      return null;
    }
  };

  const onSubmit = async (data: PassageFormValues) => {
    try {
      setIsSaving(true);
      console.log('Form submission started', { data });
      
      // Handle passage image upload
      let passageImageUrl: string | undefined = undefined;
      if (passageImageFile) {
        const uploadedUrl = await uploadImage(passageImageFile, 'passage-images');
        if (uploadedUrl) {
          passageImageUrl = uploadedUrl;
          // Insert image into content if not already there
          if (data.content && !data.content.includes(passageImageUrl)) {
            const imageHtml = `<img src="${passageImageUrl}" alt="Passage image" style="max-width: 100%; height: auto; margin: 10px 0;" />`;
            data.content = imageHtml + '\n\n' + data.content;
          }
        }
      }
      
      // Images are now uploaded immediately when selected, so use the form values directly
      const questionsWithImages = data.questions.map((q) => {
        return {
          ...q,
          image_url: q.imageUrl || undefined
        };
      });

      const passagePayload = {
        id: data.id,
        test_id: data.test_id,
        module_type: data.module_type,
        title: data.title || undefined,
        content: data.content,
        passage_order: data.passage_order,
        questions: questionsWithImages.map(q => ({
          id: q.id,
          text: q.text,
          question_number: q.question_number,
          options: q.options?.map(opt => ({
            id: opt.id,
            text: opt.text,
            is_correct: opt.is_correct
          })),
          explanation: q.explanation || undefined,
          image_url: q.image_url || undefined,
          question_type: q.question_type,
          correct_answer: q.correct_answer || undefined,
          sentence_references: q.sentence_references && q.sentence_references.length > 0 
            ? q.sentence_references 
            : undefined
        }))
      };

      console.log('Passage payload prepared:', passagePayload);
      await savePassage(passagePayload);
      await loadPassages();
      
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: editingPassage ? "Passage updated successfully" : "Passage created successfully"
      });
    } catch (error) {
      console.error('Error saving passage:', error);
      toast({
        title: "Error",
        description: "Failed to save passage",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => {
    const currentQuestions = form.getValues('questions');
    const newQuestion: PassageQuestionFormValues = {
      text: '',
      question_number: currentQuestions.length + 1,
      question_type: QuestionType.MultipleChoice,
      options: [
        { id: '', text: '', is_correct: false },
        { id: '', text: '', is_correct: false },
        { id: '', text: '', is_correct: false },
        { id: '', text: '', is_correct: false }
      ]
    };
    form.setValue('questions', [...currentQuestions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    const currentQuestions = form.getValues('questions');
    const updatedQuestions = currentQuestions.filter((_, i) => i !== index);
    // Renumber questions
    const renumberedQuestions = updatedQuestions.map((q, i) => ({
      ...q,
      question_number: i + 1
    }));
    form.setValue('questions', renumberedQuestions);
  };

  const addOption = (questionIndex: number) => {
    const currentQuestions = form.getValues('questions');
    const question = currentQuestions[questionIndex];
    if (question.options) {
      question.options.push({ id: '', text: '', is_correct: false });
      form.setValue('questions', [...currentQuestions]);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const currentQuestions = form.getValues('questions');
    const question = currentQuestions[questionIndex];
    if (question.options && question.options.length > 2) {
      question.options.splice(optionIndex, 1);
      form.setValue('questions', [...currentQuestions]);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading passages...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Passages for {testTitle}</h2>
          <p className="text-gray-600">Manage passage-based questions for ACT tests</p>
        </div>
        <Button onClick={handleCreatePassage}>
          <Plus className="w-4 h-4 mr-2" />
          Create Passage
        </Button>
      </div>

      <div className="grid gap-4">
        {passages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">No passages created yet</p>
              <Button onClick={handleCreatePassage}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Passage
              </Button>
            </CardContent>
          </Card>
        ) : (
          passages.map((passage) => (
            <Card key={passage.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {passage.title || `Passage ${passage.passage_order}`}
                      <Badge variant="outline">{passage.module_type}</Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      {passage.questions?.length || 0} questions
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPassage(passage)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePassage(passage.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 line-clamp-3">
                  {passage.content}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Passage Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPassage ? 'Edit Passage' : 'Create Passage'}
            </DialogTitle>
          </DialogHeader>
          
          <form 
            onSubmit={form.handleSubmit(
              (data) => {
                console.log('Form validated successfully:', data);
                onSubmit(data);
              },
              (errors) => {
                console.error('Form validation failed:', errors);
                toast({
                  title: "Validation Error",
                  description: "Please check the form for errors. Check console for details.",
                  variant: "destructive"
                });
              }
            )} 
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="module_type">Module Type</Label>
                <Select
                  value={form.watch('module_type')}
                  onValueChange={(value) => form.setValue('module_type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reading">Reading</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="passage_order">Passage Order</Label>
                <Input
                  type="number"
                  {...form.register('passage_order', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title (Optional)</Label>
              <Input {...form.register('title')} placeholder="Passage title" />
            </div>

            <PassageContentEditor
              content={form.watch('content')}
              onChange={(content) => form.setValue('content', content)}
            />

            <PassageImageUpload
              previewImage={passagePreviewImage}
              setPreviewImage={setPassagePreviewImage}
              setImageFile={setPassageImageFile}
            />

            {/* Questions Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <Label>Questions</Label>
                <Button type="button" onClick={addQuestion} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>

              {form.watch('questions').map((question, questionIndex) => (
                <Card key={questionIndex} className="mb-4">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Question {question.question_number}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeQuestion(questionIndex)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Question Text</Label>
                      <Textarea
                        {...form.register(`questions.${questionIndex}.text`)}
                        rows={2}
                        placeholder="Enter question text..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Question Type</Label>
                        <Select
                          value={form.watch(`questions.${questionIndex}.question_type`)}
                          onValueChange={(value) => 
                            form.setValue(`questions.${questionIndex}.question_type`, value as QuestionType)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={QuestionType.MultipleChoice}>Multiple Choice</SelectItem>
                            <SelectItem value={QuestionType.TextInput}>Text Input</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Correct Answer (for Text Input)</Label>
                        <Input
                          {...form.register(`questions.${questionIndex}.correct_answer`)}
                          placeholder="Enter correct answer..."
                        />
                      </div>
                    </div>

                    {/* Question Image Upload */}
                    <div>
                      <Label>Question Image (Optional)</Label>
                      <div className="flex flex-col space-y-2">
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          id={`question-image-${questionIndex}`}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            if (!file.type.match('image.*')) {
                              toast({
                                title: "Error",
                                description: "Please select an image file",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            if (file.size > 5 * 1024 * 1024) {
                              toast({
                                title: "Error",
                                description: "Image file size must be less than 5MB",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            // Upload immediately (like option images)
                            setUploadingQuestionImages(prev => ({ ...prev, [questionIndex]: true }));
                            try {
                              const uploadedUrl = await uploadImage(file, 'question-images');
                              if (uploadedUrl) {
                                // Update form field with the URL immediately
                                form.setValue(`questions.${questionIndex}.imageUrl`, uploadedUrl);
                                // Update preview with the uploaded URL
                                setQuestionPreviewImages(prev => ({ ...prev, [questionIndex]: uploadedUrl }));
                                // Clear the file reference since we've uploaded it
                                setQuestionImageFiles(prev => {
                                  const newObj = { ...prev };
                                  delete newObj[questionIndex];
                                  return newObj;
                                });
                                toast({
                                  title: "Success",
                                  description: "Image uploaded successfully",
                                });
                              }
                            } catch (error) {
                              console.error('Error uploading question image:', error);
                              toast({
                                title: "Error",
                                description: "Failed to upload image. Please try again.",
                                variant: "destructive"
                              });
                            } finally {
                              setUploadingQuestionImages(prev => {
                                const newObj = { ...prev };
                                delete newObj[questionIndex];
                                return newObj;
                              });
                            }
                          }}
                        />
                        {questionPreviewImages[questionIndex] || question.imageUrl ? (
                          <div className="relative">
                            <img 
                              src={questionPreviewImages[questionIndex] || question.imageUrl || ''} 
                              alt="Question" 
                              className="w-full max-h-60 object-contain border rounded-md" 
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => {
                                setQuestionPreviewImages(prev => {
                                  const newObj = { ...prev };
                                  delete newObj[questionIndex];
                                  return newObj;
                                });
                                setQuestionImageFiles(prev => {
                                  const newObj = { ...prev };
                                  delete newObj[questionIndex];
                                  return newObj;
                                });
                                form.setValue(`questions.${questionIndex}.imageUrl`, '');
                                const input = document.getElementById(`question-image-${questionIndex}`) as HTMLInputElement;
                                if (input) input.value = '';
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-md">
                            {uploadingQuestionImages[questionIndex] ? (
                              <>
                                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                                <p className="mt-2 text-xs text-gray-500">Uploading image...</p>
                              </>
                            ) : (
                              <>
                                <Image className="h-8 w-8 text-gray-400" />
                                <p className="mt-2 text-xs text-gray-500">Upload an image for this question</p>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => document.getElementById(`question-image-${questionIndex}`)?.click()}
                                  disabled={uploadingQuestionImages[questionIndex]}
                                  className="mt-2"
                                >
                                  Select Image
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {question.question_type === QuestionType.MultipleChoice && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label>Answer Options</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(questionIndex)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Option
                          </Button>
                        </div>
                        {question.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="space-y-2 mb-4">
                            <div className="flex items-center gap-2">
                              <Textarea
                                {...form.register(`questions.${questionIndex}.options.${optionIndex}.text`)}
                                placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                rows={2}
                                className="flex-1"
                              />
                              <div className="flex flex-col gap-2">
                                <input
                                  type="checkbox"
                                  {...form.register(`questions.${questionIndex}.options.${optionIndex}.is_correct`)}
                                  className="w-4 h-4"
                                  title="Correct Answer"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeOption(questionIndex, optionIndex)}
                                  disabled={question.options!.length <= 2}
                                  title="Remove Option"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <OptionImageUpload
                              onImageUploaded={(newText) => {
                                form.setValue(`questions.${questionIndex}.options.${optionIndex}.text`, newText);
                              }}
                              currentText={form.getValues(`questions.${questionIndex}.options.${optionIndex}.text`) || ''}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <Label>Explanation (Optional)</Label>
                      <Textarea
                        {...form.register(`questions.${questionIndex}.explanation`)}
                        rows={2}
                        placeholder="Enter explanation..."
                      />
                    </div>

                    {/* Sentence Reference Selector */}
                    <div>
                      {(() => {
                        // Use form.watch to trigger re-renders when sentence_references change
                        const currentRefs = form.watch(`questions.${questionIndex}.sentence_references`) || [];
                        const selectedSentences = new Set<number | string>();
                        const selectedRanges = new Map<number, Array<{ start: number; end: number }>>();
                        
                        // Parse current references
                        currentRefs.forEach((ref: any) => {
                          if (typeof ref === 'number') {
                            selectedSentences.add(ref);
                          } else if (ref && typeof ref === 'object' && ref.sentenceIndex !== undefined) {
                            selectedSentences.add(`range-${ref.sentenceIndex}`);
                            if (!selectedRanges.has(ref.sentenceIndex)) {
                              selectedRanges.set(ref.sentenceIndex, []);
                            }
                            selectedRanges.get(ref.sentenceIndex)!.push({ start: ref.start, end: ref.end });
                          }
                        });
                        
                        console.log(`[PassageManager] Question ${questionIndex} - currentRefs:`, currentRefs, 'selectedRanges:', Array.from(selectedRanges.entries()));

                        return (
                          <SentenceSelector
                            passageContent={form.watch('content')}
                            selectedSentences={selectedSentences}
                            selectedRanges={selectedRanges}
                            onToggleSentence={(sentenceIndex) => {
                              const currentRefs = form.getValues(`questions.${questionIndex}.sentence_references`) || [];
                              const updatedRefs = currentRefs.filter((ref: any) => {
                                if (typeof ref === 'number') {
                                  return ref !== sentenceIndex;
                                }
                                if (ref && typeof ref === 'object' && ref.sentenceIndex === sentenceIndex) {
                                  return false; // Remove all ranges for this sentence
                                }
                                return true;
                              });
                              
                              // Add or remove sentence
                              const hasSentence = currentRefs.some((ref: any) => 
                                typeof ref === 'number' && ref === sentenceIndex
                              );
                              
                              if (!hasSentence) {
                                updatedRefs.push(sentenceIndex);
                              }
                              
                              form.setValue(`questions.${questionIndex}.sentence_references`, updatedRefs);
                            }}
                            onToggleRange={(sentenceIndex, start, end) => {
                              const currentRefs = form.getValues(`questions.${questionIndex}.sentence_references`) || [];
                              
                              // Remove sentence index if it exists (full sentence selection)
                              let updatedRefs = currentRefs.filter((ref: any) => 
                                !(typeof ref === 'number' && ref === sentenceIndex)
                              );
                              
                              // Check if this range already exists
                              const existingRangeIndex = updatedRefs.findIndex((ref: any) => 
                                ref && typeof ref === 'object' && 
                                ref.sentenceIndex === sentenceIndex && 
                                ref.start === start && 
                                ref.end === end
                              );
                              
                              if (existingRangeIndex >= 0) {
                                // Remove the range
                                updatedRefs.splice(existingRangeIndex, 1);
                              } else {
                                // Add the range
                                updatedRefs.push({ sentenceIndex, start, end });
                              }
                              
                              form.setValue(`questions.${questionIndex}.sentence_references`, updatedRefs);
                            }}
                            onSelectAll={() => {
                              const passageContent = form.watch('content');
                              if (!passageContent) return;
                              
                              // Count sentences
                              const sentenceRegex = /([.!?]+)\s+/g;
                              const endings: number[] = [];
                              let match;
                              while ((match = sentenceRegex.exec(passageContent)) !== null) {
                                endings.push(match.index + match[0].length);
                              }
                              if (endings.length === 0 || endings[endings.length - 1] < passageContent.length) {
                                endings.push(passageContent.length);
                              }
                              
                              const allIndices = Array.from({ length: endings.length }, (_, i) => i);
                              form.setValue(`questions.${questionIndex}.sentence_references`, allIndices);
                            }}
                            onDeselectAll={() => {
                              form.setValue(`questions.${questionIndex}.sentence_references`, []);
                            }}
                          />
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : editingPassage ? 'Update Passage' : 'Create Passage'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PassageManager;
