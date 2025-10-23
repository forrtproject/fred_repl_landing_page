type SearchProps = {
    placeholder?: string;
    onChange?: (value: string) => void;
};
export const Search = (props: SearchProps) => {
    return (
        <label class="input w-full">
            <svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <g
                stroke-linejoin="round"
                stroke-linecap="round"
                stroke-width="2.5"
                fill="none"
                stroke="currentColor"
                >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
                </g>
            </svg>
            <input onInput={(e) => props.onChange?.(e.currentTarget.value)} type="search" required placeholder={props.placeholder || "Search"} />
        </label>
    )
}