import { createEffect, createSignal, Show  } from "solid-js";
import { Search } from "./Search";
import { fetchDOIInfo } from "../api/backend";
import type { DOIAPIResponse } from "../@types";
import { ReplicationSummary } from "./ReplicationSummary";
import { Skeleton } from "./Skeleton";

export const ReplicationSearchPanel = () => {
    const [searchTerm, setSearch] = createSignal('');
    const [doi, setDoi] = createSignal<DOIAPIResponse | null>(null);
    const [isLoading, setIsLoading] = createSignal(false);
    
    createEffect(() => {
        const query = searchTerm();
        console.log("Search term changed:", query);
        if (query.trim() === '') {
            setDoi(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        
        // Debounce the API call by 1 second
        const timeoutId = setTimeout(() => {
            fetchDOIInfo(query).then(data => {
                console.log(data);
                setDoi(data);
                setIsLoading(false);
            }).catch(error => {
                console.error('Error fetching DOI info:', error);
                setIsLoading(false);
            });
        }, 300);

        // Cleanup function to clear timeout if searchTerm changes before timeout completes
        return () => clearTimeout(timeoutId);
    });
    
    return (
        <div class="p-4">
            <h2 class="text-lg font-bold mb-2">Search for Replications</h2>
            <Search placeholder="Begin typing your doi (document object id)" onChange={q => setSearch(q)} />
            <Show when={isLoading()}>
                <section class="p-4 rounded-md flex justify-center">
                    <Skeleton />
                </section>
            </Show>
            <Show when={doi() !== null && !isLoading()}>
                {
                    Object.values(doi()?.results ?? {}).map(result => <ReplicationSummary data={result} />)
                }
            </Show>
        </div>
    );
}