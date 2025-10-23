import { EyeOpenIcon } from "../icons/eye-open";
import { ScrollIcon } from "../icons/scroll";

export const ReplicationToolbar = (props: { title?: string | null, doi?: string | null }) => {
    return (
        <div class="navbar bg-neutral shadow-sm max-w-full rounded-t-sm">
            <div class="navbar-start">
                <div class="w-10 rounded">
                    <ScrollIcon />
                </div>
                <div class="ml-2 font-bold flex flex-col max-h-10 max-w-full text-white">
                    <span class="text-sm">Original Research</span>
                    <span class="text-xs truncate max-w-full">{props.title}</span>
                </div>
            </div>
            {
                props.doi ? (
                    <div class="navbar-end">
                        <a class="btn btn-sm" href={`https://doi.org/${props.doi}`} target="__blank">
                            <span class="mr-2"><EyeOpenIcon /></span>
                            <span>View Research</span>
                        </a>
                    </div>
                ) : null
            }
        </div>
    );
}