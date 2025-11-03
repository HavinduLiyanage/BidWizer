import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  error?: string;
  icon?: ReactNode;
  options?: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

export function FormField({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  error,
  icon,
  options,
  value,
  onChange,
  onBlur,
}: FormFieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        {type === "textarea" ? (
          <Textarea
            id={id}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={onBlur}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          />
        ) : type === "select" && options ? (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger
              id={id}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={id}
            name={name}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={onBlur}
            className={icon ? "pl-10" : ""}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
          />
        )}
      </div>
      
      {error && (
        <p id={errorId} className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

