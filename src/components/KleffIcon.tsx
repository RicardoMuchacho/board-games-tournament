import { cn } from "@/lib/utils";

interface KleffIconProps {
  className?: string;
}

const KleffIcon = ({ className }: KleffIconProps) => (
  <img
    src="/assets/icons/kleffIconSmall.svg"
    alt="KLEFF"
    className={cn("inline-block", className)}
  />
);

export default KleffIcon;
