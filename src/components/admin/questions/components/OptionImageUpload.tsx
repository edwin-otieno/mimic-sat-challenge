import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OptionImageUploadProps {
  onImageUploaded: (imageUrl: string) => void;
  currentText?: string;
}

const OptionImageUpload = ({ onImageUploaded, currentText }: OptionImageUploadProps) => {
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
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `option-images/${fileName}`;

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

      // Insert image HTML into text
      const imageHtml = `<img src="${publicUrl}" alt="Option image" style="max-width: 100%; height: auto;" />`;
      const newText = currentText ? `${currentText}\n${imageHtml}` : imageHtml;
      
      onImageUploaded(newText);
      
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

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input 
        type="file" 
        className="hidden" 
        accept="image/*"
        onChange={handleImageChange}
        ref={fileInputRef}
        disabled={isUploading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleButtonClick}
        className="w-full"
        disabled={isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Image className="h-4 w-4 mr-1" />
            Add Image
          </>
        )}
      </Button>
    </>
  );
};

export default OptionImageUpload;

