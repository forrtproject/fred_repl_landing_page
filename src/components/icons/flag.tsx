import type { IconProps } from "../../@types";

export const FlagIcon = ({ className, color}: IconProps) => (
    <svg class={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 14.6667V1.86667C3.99992 1.77494 4.0235 1.68474 4.06845 1.60479C4.11341 1.52484 4.17823 1.45783 4.25665 1.41025C4.33506 1.36266 4.42443 1.3361 4.5161 1.33314C4.60778 1.33018 4.69867 1.35091 4.78 1.39333L12.3667 5.18667C12.4568 5.23034 12.5329 5.29853 12.5861 5.38342C12.6393 5.46831 12.6675 5.56648 12.6675 5.66667C12.6675 5.76686 12.6393 5.86502 12.5861 5.94991C12.5329 6.03481 12.4568 6.10299 12.3667 6.14667L4 10.3333" stroke={color || "#3E3E3E"} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
)
