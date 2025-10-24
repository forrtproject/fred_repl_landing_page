import type { DOIAPIResponse } from "../@types";
import { createHttp } from "../utils/http";

const backend = createHttp({
  baseURL: import.meta.env.VITE_BACKEND_URL || "https://5waa6mryb6.execute-api.eu-central-1.amazonaws.com/v1",
});

export const fetchDOIInfo = async (doi: string) => {
  const response = await backend.get<DOIAPIResponse>('/original-lookup', { params: { doi } });

  return response.data;
};
