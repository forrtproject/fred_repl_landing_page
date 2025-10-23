import type { IconProps } from "../../@types";

export const BulbIcon = ({ className, color}: IconProps) => (
    <svg class={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 9.33334C10.1333 8.66667 10.4667 8.2 11 7.66667C11.6667 7.06667 12 6.2 12 5.33334C12 4.27247 11.5786 3.25505 10.8284 2.50491C10.0783 1.75476 9.06087 1.33334 8 1.33334C6.93913 1.33334 5.92172 1.75476 5.17157 2.50491C4.42143 3.25505 4 4.27247 4 5.33334C4 6 4.13333 6.8 5 7.66667C5.46667 8.13334 5.86667 8.66667 6 9.33334" stroke="#3E3E3E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6 12H10" stroke={color || "#3E3E3E"} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6.6665 14.6667H9.33317" stroke={color || "#3E3E3E"} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
)
