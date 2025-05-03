
import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TestDialogsProps {
  showConfirmSubmit: boolean;
  setShowConfirmSubmit: (show: boolean) => void;
  showTimeUpDialog: boolean;
  setShowTimeUpDialog: (show: boolean) => void;
  onSubmitTest: () => void;
}

const TestDialogs: React.FC<TestDialogsProps> = ({
  showConfirmSubmit,
  setShowConfirmSubmit,
  showTimeUpDialog,
  setShowTimeUpDialog,
  onSubmitTest,
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
            <Button onClick={onSubmitTest}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Time Up Dialog */}
      <Dialog open={showTimeUpDialog} onOpenChange={setShowTimeUpDialog}>
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
