import { cn } from "@/lib/utils";

/** null-portal emblem: adapts shield/book stroke to theme ink, keeps gold star. */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="none"
      aria-hidden="true"
      className={cn("h-7 w-7 shrink-0 text-[#132642] dark:text-[#e8e4dc]", className)}
    >
      <path
        d="M66 94V70C89 70 110 65 128 55C146 65 167 70 190 70V94"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M76 104H66V154C88 152 110 158 128 172"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M180 104H190V154C168 152 146 158 128 172"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M114 103C103 94 92 89 82 88V138C99 142 114 150 128 166"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      <path
        d="M142 103C153 94 164 89 174 88V138C157 142 142 150 128 166"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      <path
        d="M124 145L128 154L132 145V169L128 173L124 169V145Z"
        fill="currentColor"
      />
      <path
        d="M84 161C94 178 109 191 128 200C147 191 162 178 172 161"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      <path
        d="M128 84L135 105L156 112L135 119L128 140L121 119L100 112L121 105Z"
        fill="#E89D24"
      />
    </svg>
  );
}
