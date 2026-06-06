import { useQuery } from "@tanstack/react-query";
import { getOrganization } from "../services/organizationService";

export function useOrgDarkLogo() {
  const { data: org } = useQuery({
    queryKey: ["organization"],
    queryFn: getOrganization,
    staleTime: 10 * 60 * 1000,
  });
  return org?.logo_dark_url || "/ShreeVidhyaDark.png";
}