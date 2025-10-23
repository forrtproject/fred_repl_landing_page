import type { DOIAPIResponse } from "../@types";
import { createHttp } from "../utils/http";

const backend = createHttp({
  baseURL: import.meta.env.VITE_BACKEND_URL || "https://ouj1xoiypb.execute-api.eu-central-1.amazonaws.com/v1/original-lookup",
});

export const fetchDOIInfo = async (doi: string) => {
  const response = await backend.get<DOIAPIResponse>('', { params: { doi } });

  return response.data;
};
