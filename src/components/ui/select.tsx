"use client";
import * as React from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { value: string; label: React.ReactNode; disabled?: boolean };

function collectOptions(children: React.ReactNode): Option[] {
  const out: Option[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as {
      children?: React.ReactNode;
      value?: string | number;
      disabled?: boolean;
    };
    if (child.type === React.Fragment) {
      out.push(...collectOptions(props.children));
    } else if (child.type === "option") {
      out.push({
        value: String(props.value ?? ""),
        label: props.children,
        disabled: props.disabled,
      });
    }
  });
  return out;
}

const nativeValue = () =>
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!;

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  placeholder?: string;
};

/**
 * Custom select with the native <select> API: takes <option> children,
 * `value`/`onChange`, or react-hook-form's `register()`. A hidden native
 * <select> keeps form semantics; the visible part is an animated menu with
 * keyboard navigation and typeahead (Radix).
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      className,
      children,
      id,
      disabled,
      value,
      defaultValue,
      placeholder = "Select…",
      "aria-label": ariaLabel,
      "aria-invalid": ariaInvalid,
      ...rest
    },
    ref,
  ) {
    const options = collectOptions(children);
    const controlled = value !== undefined;
    const nativeRef = React.useRef<HTMLSelectElement | null>(null);
    const [inner, setInner] = React.useState(
      String(defaultValue ?? options[0]?.value ?? ""),
    );
    const [open, setOpen] = React.useState(false);
    const current = controlled ? String(value) : inner;
    const selected = options.find((o) => o.value === current);

    // react-hook-form writes `el.value = x` directly (no event). Intercept those
    // writes so the visible trigger always shows what the form holds.
    const setRefs = React.useCallback(
      (el: HTMLSelectElement | null) => {
        nativeRef.current = el;
        if (el && !controlled) {
          const d = nativeValue();
          Object.defineProperty(el, "value", {
            configurable: true,
            get: () => d.get!.call(el),
            set: (v: string) => {
              d.set!.call(el, v);
              setInner(String(d.get!.call(el)));
            },
          });
          setInner(String(d.get!.call(el)));
        }
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      },
      [ref, controlled],
    );

    function choose(v: string) {
      const el = nativeRef.current;
      if (!el) return;
      nativeValue().set!.call(el, v);
      if (!controlled) setInner(v);
      // React's onChange for <select> listens to the native "change" event.
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }

    return (
      <>
        <select
          {...rest}
          ref={setRefs}
          value={controlled ? value : undefined}
          defaultValue={controlled ? undefined : defaultValue}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        >
          {children}
        </select>
        <DM.Root open={open} onOpenChange={setOpen}>
          <DM.Trigger asChild disabled={disabled}>
            <button
              type="button"
              id={id}
              aria-label={ariaLabel}
              data-invalid={ariaInvalid ? "true" : undefined}
              className={cn(
                "group border-input bg-card shadow-elev-1 flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-sm",
                "hover:border-foreground/30 transition-[border-color,box-shadow] duration-150",
                "focus-visible:border-primary focus-visible:ring-primary/15 focus-visible:ring-[3px] focus-visible:outline-none",
                "data-[state=open]:border-primary data-[state=open]:ring-primary/15 data-[state=open]:ring-[3px]",
                "data-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
                className,
              )}
            >
              <span
                className={cn("truncate", !selected && "text-muted-foreground")}
              >
                {selected?.label ?? placeholder}
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </button>
          </DM.Trigger>
          <DM.Portal>
            <DM.Content
              align="start"
              sideOffset={6}
              collisionPadding={12}
              className={cn(
                "bg-card shadow-elev-3 z-[60] border-border/80 max-h-[min(var(--radix-dropdown-menu-content-available-height),20rem)] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-lg border p-1",
                "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              )}
            >
              <DM.RadioGroup value={current} onValueChange={choose}>
                {options.map((o) => (
                  <DM.RadioItem
                    key={o.value}
                    value={o.value}
                    disabled={o.disabled}
                    className={cn(
                      "relative flex cursor-pointer items-center rounded-md py-2 pr-9 pl-3 text-sm outline-none select-none",
                      "transition-colors duration-100 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                      "data-[state=checked]:font-medium data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    )}
                  >
                    {o.label}
                    <DM.ItemIndicator className="text-primary absolute right-3">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </DM.ItemIndicator>
                  </DM.RadioItem>
                ))}
              </DM.RadioGroup>
            </DM.Content>
          </DM.Portal>
        </DM.Root>
      </>
    );
  },
);
