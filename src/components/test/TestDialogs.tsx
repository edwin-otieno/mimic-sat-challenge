import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TestDialogsProps {
  showConfirmSubmit: boolean;
  setShowConfirmSubmit: (show: boolean) => void;
  showTimeUpDialog: boolean;
  setShowTimeUpDialog: (show: boolean) => void;
  showSaveExitDialog: boolean;
  setShowSaveExitDialog: (show: boolean) => void;
  onSubmitTest: () => void;
  onDiscardTest: () => void;
  onSaveAndExit: () => Promise<void>;
  isSaving?: boolean;
}

const TestDialogs: React.FC<TestDialogsProps> = ({
  showConfirmSubmit,
  setShowConfirmSubmit,
  showTimeUpDialog,
  setShowTimeUpDialog,
  showSaveExitDialog,
  setShowSaveExitDialog,
  onSubmitTest,
  onDiscardTest,
  onSaveAndExit,
  isSaving = false,
}) => {
  return (
    <>
      {/* Confirm Submit Dialog */}
      <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Test?</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your test? You won't be able to change your answers after submission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmSubmit(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowConfirmSubmit(false);
              onSubmitTest();
            }}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Save & Exit Dialog */}
      <Dialog open={showSaveExitDialog} onOpenChange={setShowSaveExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save & Exit Test?</DialogTitle>
            <DialogDescription>
              Your current progress will be saved and you can resume the test later from where you left off.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveExitDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={onSaveAndExit}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? "Saving..." : "Save & Exit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Time Up Dialog */}
      <Dialog 
        open={showTimeUpDialog} 
        onOpenChange={(open) => {
          setShowTimeUpDialog(open);
          if (!open) onDiscardTest();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Time's Up!</DialogTitle>
            <DialogDescription>
              Your time has expired. Your test will be submitted with your current answers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onSubmitTest}>
              View Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TestDialogs;
