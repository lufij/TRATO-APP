// Ambient shims for optional UI libraries to satisfy TypeScript typecheck.
// These modules are only used in isolated UI components; at runtime they may be swapped or tree-shaken.

declare module 'react-day-picker' {
  export const DayPicker: any;
}

declare module 'embla-carousel-react' {
  const useEmblaCarousel: any;
  export type UseEmblaCarouselType = any;
  export default useEmblaCarousel;
}

declare module 'cmdk' {
  export const Command: any;
}

declare module 'vaul' {
  export const Drawer: any;
}

declare module 'react-hook-form' {
  export const Controller: any;
  export const useForm: any;
  export const useFormContext: any;
  export const useFormState: any;
  export const FormProvider: any;
  export type FieldValues = any;
  export type FieldPath<TFieldValues = any> = any;
  export type ControllerRenderProps = any;
  export type ControllerProps<TFieldValues = any, TName = any> = any;
}

declare module 'input-otp' {
  export const OTPInput: any;
  export const OTPInputContext: any;
}

declare module 'react-resizable-panels' {
  export const PanelGroup: any;
  export const Panel: any;
  export const PanelResizeHandle: any;
}
