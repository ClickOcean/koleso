import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { spinsRepository } from '../api/spinsRepository';

export const SPINS_QUERY_KEY = ['spins'];

export const useSpinHistory = () =>
  useQuery({
    queryKey: SPINS_QUERY_KEY,
    queryFn: spinsRepository.getAll,
    staleTime: Infinity,
  });

export const useSpinHistoryMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: SPINS_QUERY_KEY });

  const add = useMutation({ mutationFn: spinsRepository.add, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: spinsRepository.remove, onSuccess: invalidate });
  const clear = useMutation({ mutationFn: spinsRepository.clear, onSuccess: invalidate });

  return { add, remove, clear };
};
