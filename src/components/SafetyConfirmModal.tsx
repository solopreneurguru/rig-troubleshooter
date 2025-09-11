"use client";
import { useState } from "react";

type SafetyConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (confirmedBy: string, checklist: string[]) => void;
  checklist?: string[];
  stepInstruction?: string;
};

export default function SafetyConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  checklist = [], 
  stepInstruction 
}: SafetyConfirmModalProps) {
  const [confirmedBy, setConfirmedBy] = useState("");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCheckChange = (item: string, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [item]: checked }));
  };

  const handleConfirm = async () => {
    if (!confirmedBy.trim()) {
      alert("Please enter your name");
      return;
    }

    const checkedList = checklist.filter(item => checkedItems[item]);
    
    setSubmitting(true);
    try {
      await onConfirm(confirmedBy.trim(), checkedList);
      onClose();
      // Reset form
      setConfirmedBy("");
      setCheckedItems({});
    } catch (error) {
      console.error("Safety confirmation failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const allRequiredChecked = checklist.length === 0 || checklist.every(item => checkedItems[item]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-red-700 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-red-100">⚠️ Safety Confirmation Required</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 transition-colors"
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        {stepInstruction && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded text-red-100 text-sm">
            <strong>Step:</strong> {stepInstruction}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-200 mb-2">
            Safety Checklist
          </label>
          {checklist.length === 0 ? (
            <div className="text-sm text-neutral-400 italic">
              No specific checklist items for this step
            </div>
          ) : (
            <div className="space-y-2">
              {checklist.map((item, index) => (
                <label key={index} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checkedItems[item] || false}
                    onChange={(e) => handleCheckChange(item, e.target.checked)}
                    className="w-4 h-4"
                    disabled={submitting}
                  />
                  <span className="text-neutral-200">{item}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-200 mb-2">
            Your Name *
          </label>
          <input
            type="text"
            value={confirmedBy}
            onChange={(e) => setConfirmedBy(e.target.value)}
            placeholder="Enter your full name"
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-neutral-100 placeholder:text-neutral-400"
            disabled={submitting}
          />
        </div>

        <div className="text-xs text-neutral-400 mb-4">
          By confirming, you certify that all safety procedures have been followed 
          and it is safe to proceed with this step.
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-300 hover:text-neutral-100 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmedBy.trim() || !allRequiredChecked || submitting}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded transition-colors"
          >
            {submitting ? "Confirming..." : "Confirm Safety"}
          </button>
        </div>
      </div>
    </div>
  );
}
