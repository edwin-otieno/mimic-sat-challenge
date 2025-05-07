
import React from 'react';
import { FormLabel } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Trash, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuestionImageUploadProps {
  previewImage: string | null;
  setPreviewImage: (url: string | null) => void;
  setImageFile: (file: File | null) => void;
}

const QuestionImageUpload = ({ previewImage, setPreviewImage, setImageFile }: QuestionImageUploadProps) => {
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    
    setImageFile(file);
    
    // Create a preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setPreviewImage(null);
    setImageFile(null);
  };

  return (
    <div className="space-y-2">
      <FormLabel>Question Image (Optional)</FormLabel>
      <div className="flex flex-col space-y-2">
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
            <Image className="h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Upload an image for this question</p>
            <label className="mt-2">
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageChange}
              />
              <Button type="button" variant="outline" size="sm">
                Select Image
              </Button>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionImageUpload;
