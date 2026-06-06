import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

/**
 * Generic hook for a list page with CRUD operations.
 *
 * @param {string} queryKey - unique key for this list (e.g., 'courses')
 * @param {Function} fetchFn - function that returns the data
 * @param {Function} createFn - function to create a new record
 * @param {Function} updateFn - function to update a record (id, payload)
 * @param {Function} deleteFn - function to delete a record (id)
 * @returns {Object} { data, isLoading, createMutation, updateMutation, deleteMutation }
 */
export function useListQuery(queryKey, fetchFn, createFn, updateFn, deleteFn) {
  const queryClient = useQueryClient();

  const { data = [], isLoading, error } = useQuery({
    queryKey: [queryKey],
    queryFn: fetchFn,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Show error toast if fetch fails
  if (error) {
    toast.error(`Failed to load ${queryKey}`);
  }

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      toast.success(`${queryKey} created`);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: () => toast.error(`Failed to create ${queryKey}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateFn(id, payload),
    onSuccess: () => {
      toast.success(`${queryKey} updated`);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: () => toast.error(`Failed to update ${queryKey}`),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      toast.success(`${queryKey} deleted`);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: () => toast.error(`Failed to delete ${queryKey}`),
  });

  return {
    data,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
  };
}