"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
}

const categories = [
  { id: "construction", label: "Construction", color: "blue" },
  { id: "healthcare", label: "Healthcare", color: "green" },
  { id: "infrastructure", label: "Infrastructure", color: "amber" },
  { id: "it", label: "IT & Technology", color: "indigo" },
  { id: "energy", label: "Energy", color: "rose" }
];

export function FilterDrawer({ isOpen, onClose, onApply }: FilterDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[400px] bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Filter Sections */}
          <div className="space-y-6">
            {/* Keyword Search */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Keyword search
              </Label>
              <Input 
                placeholder="Search in tender details..."
                className="w-full"
              />
            </div>

            {/* Categories */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Categories
              </Label>
              <div className="space-y-2">
                {categories.map((category) => (
                  <label 
                    key={category.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
                  >
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {category.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Location
              </Label>
              <Input 
                placeholder="Enter location..."
                className="w-full"
              />
            </div>

            {/* Budget Range */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Budget range
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input 
                    type="number"
                    placeholder="Min"
                    className="w-full"
                  />
                </div>
                <div>
                  <Input 
                    type="number"
                    placeholder="Max"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Deadline Range */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Deadline range
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input 
                    type="date"
                    className="w-full"
                  />
                </div>
                <div>
                  <Input 
                    type="date"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Status
              </Label>
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white">
                  Active
                </button>
                <button className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                  Closed
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
            >
              Clear All
            </Button>
            <Button 
              className="flex-1"
              onClick={() => {
                onApply({});
                onClose();
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

