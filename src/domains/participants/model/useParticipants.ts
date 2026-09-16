import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { participantsRepository } from '../api/participantsRepository';

export const PARTICIPANTS_QUERY_KEY = ['participants'];

export const useParticipants = () =>
  useQuery({
    queryKey: PARTICIPANTS_QUERY_KEY,
    queryFn: participantsRepository.getAll,
    staleTime: Infinity,
  });

/**
 * Mutations for the roster. Every mutation invalidates the participants query
 * so the wheel and the list re-render from the same source of truth.
 */
export const useParticipantsMutations = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: PARTICIPANTS_QUERY_KEY });

  const addMany = useMutation({ mutationFn: participantsRepository.addMany, onSuccess: invalidate });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => participantsRepository.rename(id, name),
    onSuccess: invalidate,
  });
  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => participantsRepository.setActive(id, isActive),
    onSuccess: invalidate,
  });
  const setAllActive = useMutation({ mutationFn: participantsRepository.setAllActive, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: participantsRepository.remove, onSuccess: invalidate });

  return { addMany, rename, setActive, setAllActive, remove };
};
