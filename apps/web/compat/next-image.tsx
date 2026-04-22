"use client";

import {
  forwardRef,
  type ImgHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
};

const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  { className, fill, alt, ...props },
  ref,
) {
  return (
    <img
      ref={ref}
      alt={alt}
      className={cn(fill ? "absolute inset-0 h-full w-full" : undefined, className)}
      {...props}
    />
  );
});

export default Image;
