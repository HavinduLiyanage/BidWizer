import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepDefinition {
  number: 1 | 2 | 3;
  label: string;
}

interface StepperProps {
  currentStep: 1 | 2 | 3;
  completedSteps?: number[];
  steps?: StepDefinition[];
}

export function Stepper({ currentStep, completedSteps = [], steps }: StepperProps) {
  const defaultSteps: StepDefinition[] = [
    { number: 1, label: "Account Setup" },
    { number: 2, label: "Company Profile" },
    { number: 3, label: "Team Invite" },
  ];

  const renderedSteps = steps ?? defaultSteps;

  const isCompleted = (step: number) => completedSteps.includes(step);
  const isCurrent = (step: number) => step === currentStep;

  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-center">
        {renderedSteps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all",
                  isCompleted(step.number)
                    ? "bg-blue-600 border-blue-600 text-white"
                    : isCurrent(step.number)
                    ? "bg-white border-blue-600 text-blue-600"
                    : "bg-white border-gray-300 text-gray-400"
                )}
                aria-current={isCurrent(step.number) ? "step" : undefined}
                aria-label={`Step ${step.number}: ${step.label}`}
              >
                {isCompleted(step.number) ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <span className="text-lg font-semibold">{step.number}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-sm font-medium",
                  isCompleted(step.number) || isCurrent(step.number)
                    ? "text-blue-600"
                    : "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < renderedSteps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-24 mx-4 transition-all",
                  isCompleted(step.number)
                    ? "bg-blue-600"
                    : "bg-gray-300"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

