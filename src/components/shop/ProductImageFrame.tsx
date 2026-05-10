import type { ReactNode } from "react";

type ProductImageFrameProps = {
  src?: string | null;
  alt: string;
  ratio?: "card" | "square" | "thumb";
  imageClassName?: string;
  className?: string;
  children?: ReactNode;
};

const ratioClass = {
  card: "aspect-[4/3]",
  square: "aspect-square",
  thumb: "aspect-square",
};

const paddingClass = {
  card: "p-3 sm:p-4",
  square: "p-4 sm:p-6",
  thumb: "p-1.5",
};

export default function ProductImageFrame({
  src,
  alt,
  ratio = "card",
  imageClassName = "",
  className = "",
  children,
}: ProductImageFrameProps) {
  return (
    <div className={`relative overflow-hidden border border-[#D8E0EA] bg-[#F5F7FA] ${ratioClass[ratio]} ${className}`}>
      <div className="absolute inset-0 opacity-[0.045] pointer-events-none" aria-hidden="true">
        <div className="absolute -left-8 top-6 rotate-[-18deg] text-[38px] sm:text-[48px] font-display font-900 tracking-[0.08em] text-[#2D4F7A] whitespace-nowrap">COMBAY</div>
        <div className="absolute left-20 bottom-8 rotate-[-18deg] text-[28px] sm:text-[36px] font-display font-900 tracking-[0.08em] text-[#2D4F7A] whitespace-nowrap">SOURCING · STOCK · SUPPLY</div>
        <div className="absolute right-[-30px] top-1/3 rotate-[-18deg] text-[34px] sm:text-[44px] font-display font-900 tracking-[0.08em] text-[#2D4F7A] whitespace-nowrap">COMBAY</div>
      </div>
      <div className={`relative z-[1] w-full h-full flex items-center justify-center ${paddingClass[ratio]}`}>
        {src ? (
          <div className="w-full h-full bg-white/85 border border-white shadow-sm flex items-center justify-center">
            <img src={src} alt={alt} draggable={false} className={`object-contain w-full h-full ${imageClassName}`} />
          </div>
        ) : (
          <div className="w-full h-full bg-white/80 border border-white flex items-center justify-center text-gray-300 text-4xl">📦</div>
        )}
      </div>
      {children}
    </div>
  );
}
