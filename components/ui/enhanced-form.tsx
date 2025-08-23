import React from 'react';
import { Input } from './input';
import { Textarea } from './textarea';
import { Label } from './label';
import { cn } from './utils';

interface EnhancedInputProps extends React.ComponentProps<typeof Input> {
  label?: string;
  required?: boolean;
  error?: string;
}

interface EnhancedTextareaProps extends React.ComponentProps<typeof Textarea> {
  label?: string;
  required?: boolean;
  error?: string;
}

export function EnhancedInput({ 
  label, 
  required, 
  error, 
  className, 
  ...props 
}: EnhancedInputProps) {
  return (
    <div className="form-field-group">
      {label && (
        <Label className="form-field-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        className={cn(
          "form-input-enhanced",
          error && "border-red-500 focus:border-red-500",
          className
        )}
        style={{
          backgroundColor: '#ffffff',
          color: '#000000',
          fontSize: '16px' // Prevent zoom on iOS
        }}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}

export function EnhancedTextarea({ 
  label, 
  required, 
  error, 
  className, 
  ...props 
}: EnhancedTextareaProps) {
  return (
    <div className="form-field-group">
      {label && (
        <Label className="form-field-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Textarea
        className={cn(
          "form-textarea-enhanced",
          error && "border-red-500 focus:border-red-500",
          className
        )}
        style={{
          backgroundColor: '#ffffff',
          color: '#000000',
          fontSize: '16px' // Prevent zoom on iOS
        }}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}
