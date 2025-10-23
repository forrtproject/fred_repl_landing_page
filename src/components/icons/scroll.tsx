type IconProps = {
    className?: string;
    color?: string;
};
export const ScrollIcon = (props: IconProps) => (
    <svg class={props.className} width="24" height="26" viewBox="0 0 24 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 14H10" stroke={props.color || "white"} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M15 10H10" stroke={props.color || "white"} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19 19V7C19 6.46957 18.7893 5.96086 18.4142 5.58579C18.0391 5.21071 17.5304 5 17 5H4" stroke={props.color || "white"} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 23H20C20.5304 23 21.0391 22.7893 21.4142 22.4142C21.7893 22.0391 22 21.5304 22 21V20C22 19.7348 21.8946 19.4804 21.7071 19.2929C21.5196 19.1054 21.2652 19 21 19H11C10.7348 19 10.4804 19.1054 10.2929 19.2929C10.1054 19.4804 10 19.7348 10 20V21C10 21.5304 9.78929 22.0391 9.41421 22.4142C9.03914 22.7893 8.53043 23 8 23ZM8 23C7.46957 23 6.96086 22.7893 6.58579 22.4142C6.21071 22.0391 6 21.5304 6 21V7C6 6.46957 5.78929 5.96086 5.41421 5.58579C5.03914 5.21071 4.53043 5 4 5C3.46957 5 2.96086 5.21071 2.58579 5.58579C2.21071 5.96086 2 6.46957 2 7V9C2 9.26522 2.10536 9.51957 2.29289 9.70711C2.48043 9.89464 2.73478 10 3 10H6" stroke={props.color || "white"} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
);