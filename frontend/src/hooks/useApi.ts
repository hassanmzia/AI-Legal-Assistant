import { useQuery, useMutation, useQueryClient, UseQueryOptions } from 'react-query';
import toast from 'react-hot-toast';

export function useFetch<T>(
  key: string | string[],
  fetcher: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, Error>(
    key,
    fetcher,
    {
      onError: (error: Error) => {
        toast.error(error.message || 'Failed to fetch data');
      },
      ...options,
    }
  );
}

export function useCreate<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void;
    invalidateKeys?: string[];
    successMessage?: string;
  }
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>(mutationFn, {
    onSuccess: (data) => {
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries(key);
        });
      }
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Operation failed');
    },
  });
}

export function useUpdate<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void;
    invalidateKeys?: string[];
    successMessage?: string;
  }
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>(mutationFn, {
    onSuccess: (data) => {
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries(key);
        });
      }
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Update failed');
    },
  });
}

export function useDelete(
  mutationFn: (id: string) => Promise<void>,
  options?: {
    onSuccess?: () => void;
    invalidateKeys?: string[];
    successMessage?: string;
  }
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>(mutationFn, {
    onSuccess: () => {
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries(key);
        });
      }
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Delete failed');
    },
  });
}
