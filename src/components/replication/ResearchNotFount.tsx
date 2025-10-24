export const ResearchNotFound = () => {
    return (
        <div class="p-4 rounded-md flex justify-center">
            <div class="card max-w-full bg-base-100">
                <div class="card-body">
                    <h2 class="card-title">Oops! Not Found</h2>
                    <div role="alert" class="alert alert-error alert-soft flex flex-col flex-1">
                        <span>No replication data found for the provided DOI. Please check the DOI and try again.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}