import type { IconProps } from "../../@types";

export const CopyIcon = ({ className, color}: IconProps) => (
    <svg class={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clip-path="url(#clip0_4007_182)">
        <path d="M13.3335 5.33334H6.66683C5.93045 5.33334 5.3335 5.93029 5.3335 6.66667V13.3333C5.3335 14.0697 5.93045 14.6667 6.66683 14.6667H13.3335C14.0699 14.6667 14.6668 14.0697 14.6668 13.3333V6.66667C14.6668 5.93029 14.0699 5.33334 13.3335 5.33334Z" stroke={color || "#3E3E3E"} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2.66683 10.6667C1.9335 10.6667 1.3335 10.0667 1.3335 9.33334V2.66667C1.3335 1.93334 1.9335 1.33334 2.66683 1.33334H9.3335C10.0668 1.33334 10.6668 1.93334 10.6668 2.66667" stroke={color || "#3E3E3E"} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <defs>
        <clipPath id="clip0_4007_182">
        <rect width="16" height="16" fill="white"/>
        </clipPath>
        </defs>
    </svg>
)