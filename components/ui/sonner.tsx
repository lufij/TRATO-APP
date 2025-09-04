import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({
  ...props
}: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      offset="80px"
      toastOptions={{
        duration: 2000,
        style: {
          background: 'white',
          color: 'black',
          border: '1px solid #e5e7eb',
          fontSize: '14px',
          padding: '8px 12px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          maxWidth: '200px',
          right: '20px',
          bottom: '90px'
        },
        classNames: {
          toast:
            "group toast !bg-white !text-black !border-gray-200 !shadow-sm !text-sm !p-2 !rounded-md !max-w-[200px]",
          description: "group-[.toast]:text-gray-700 !text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }