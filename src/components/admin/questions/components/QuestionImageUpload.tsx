import React, { useRef, useState } from 'react';
import { FormLabel } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Trash, Image, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QuestionImageUploadProps {
  previewImage: string | null;
  setPreviewImage: (url: string | null) => void;
  setImageFile: (file: File | null) => void;
  onImageUrlChange?: (url: string | null) => void; // Callback to update form field with URL
}

const QuestionImageUpload = ({ previewImage, setPreviewImage, setImageFile, onImageUrlChange }: QuestionImageUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
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
    
    try {
      // Upload to Supabase storage immediately (like option images)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `question-images/${fileName}`;

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

      // Update preview with the uploaded URL
      setPreviewImage(publicUrl);
      
      // Update form field with the URL (so it persists in the database)
      if (onImageUrlChange) {
        onImageUrlChange(publicUrl);
      }
      
      // Clear the file reference since we've uploaded it
      setImageFile(null);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    setPreviewImage(null);
    setImageFile(null);
    // Clear the URL in the form field
    if (onImageUrlChange) {
      onImageUrlChange(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <FormLabel>Question Image (Optional)</FormLabel>
      <div className="flex flex-col space-y-2">
        <input 
          type="file" 
          className="hidden" 
          accept="image/*"
          onChange={handleImageChange}
          ref={fileInputRef}
        />
        {previewImage ? (
          <div className="relative">
            <img 
              src={previewImage} 
              alt="Question" 
              className="w-full max-h-60 object-contain border rounded-md" 
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={removeImage}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md">
            {isUploading ? (
              <>
                <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
                <p className="mt-2 text-sm text-gray-500">Uploading image...</p>
              </>
            ) : (
              <>
                <Image className="h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Upload an image for this question</p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleButtonClick}
                  className="mt-2"
                  disabled={isUploading}
                >
                  Select Image
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionImageUpload;
