import { createEffect, createSignal, Show  } from "solid-js";
import { Search } from "../Search";
import { fetchMultipleDOIInfo } from "../../api/backend";
import type { DOIAPIResponse } from "../../@types";
import { ReplicationSummary } from "./ReplicationSummary";
import { Skeleton } from "../Skeleton";
import { query } from "../../utils/http";
import { ResearchNotFound } from "./ResearchNotFount";

type ReplicationSearchPanelProps = {
    onSuccess?: (data: DOIAPIResponse[]) => void;
};
export const ReplicationSearchPanel = (props: ReplicationSearchPanelProps) => {
    const [searchTerm, setSearch] = createSignal(query.get('doi') || '');
    const [dois, setDois] = createSignal<DOIAPIResponse[] | null>(null);
    const [isLoading, setIsLoading] = createSignal(false);
    const [emptyResults, setEmptyResults] = createSignal(false);
    
    createEffect(() => {
        const q = searchTerm();
        if (q.trim() === '') {
            setDois(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const params = q.split(',').map(doi => doi.trim()).filter(doi => doi !== '');
        
        // Debounce the API call by 1 second
        const timeoutId = setTimeout(() => {
            setEmptyResults(false);
            fetchMultipleDOIInfo(params).then(res => {
                if (res.length === 0) {
                    setEmptyResults(true);
                } else {
                    res.forEach(r => {
                        r.data.then(data => {
                            console.log(data);
                            setDois(prev => [...(prev || []), data]);
                            props.onSuccess?.([data]);
                            setIsLoading(false);
                        });
                    });
                }
            }).catch(error => {
                console.error('Error fetching DOI info:', error);
                setIsLoading(false);
                setEmptyResults(true);
            });
        }, 300);

        // Cleanup function to clear timeout if searchTerm changes before timeout completes
        return () => clearTimeout(timeoutId);
    });

    createEffect(() => {
        const ds = dois();
        if (ds && ds.length === 0) {
            setEmptyResults(true);
        } else if (ds && ds.length > 0) {
            let empty = true;
            Object.values(ds).forEach(d => {
                if (d.results !== null) {
                    for (const key in d.results) {
                        if (d.results[key].candidate !== null) {
                            empty = false;
                            break;
                        }
                    }
                }
            });
            setEmptyResults(empty);
        }
    });
    
    return (
        <div class="p-4">
            <h2 class="text-lg font-bold mb-2">Search for Replications</h2>
            <Search value={searchTerm()} placeholder="Begin typing your doi (document object id)" onChange={q => setSearch(q)} />
            <Show when={isLoading()}>
                <section class="p-4 rounded-md flex justify-center">
                    <Skeleton />
                </section>
            </Show>
            <Show when={dois() !== null && !isLoading()}>
                {
                    dois()?.map((d, i, arr) => (
                        Object.values(d.results).map((res) => (
                            <ReplicationSummary defaultOpen={i === (arr.length - 1)} data={res} />
                        ))
                    ))
                }
            </Show>
            <Show when={emptyResults() && searchTerm().trim() !== '' && !isLoading()}>
                <ResearchNotFound />
            </Show>
        </div>
    );
}