import { Button, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { participantsToWheelItems } from '@domains/wheel/lib/participantsToWheelItems';

import { Participant } from '../model/types';
import { useParticipantsMutations } from '../model/useParticipants';

import AddParticipantsForm from './AddParticipantsForm';
import ParticipantRow from './ParticipantRow';

interface ParticipantsPanelProps {
  participants: Participant[];
}

const ParticipantsPanel = ({ participants }: ParticipantsPanelProps) => {
  const { t } = useTranslation();
  const { addMany, rename, setActive, setAllActive, remove } = useParticipantsMutations();

  const colorById = useMemo(
    () => new Map(participantsToWheelItems(participants).map((item) => [item.id, item.color])),
    [participants],
  );
  const activeCount = participants.filter((participant) => participant.isActive).length;

  const confirmRemove = (participant: Participant) => {
    modals.openConfirmModal({
      title: t('participants.removeConfirmTitle'),
      children: <Text size='sm'>{t('participants.removeConfirmText', { name: participant.name })}</Text>,
      labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: () => remove.mutate(participant.id),
    });
  };

  return (
    <Stack gap='sm' style={{ height: '100%', minHeight: 0 }}>
      <AddParticipantsForm onAdd={(names) => addMany.mutateAsync(names)} isAdding={addMany.isPending} />
      <Group justify='space-between' align='center'>
        <Text size='sm' c='dimmed'>
          {t('participants.activeCount', { active: activeCount, total: participants.length })}
        </Text>
        <Group gap={4}>
          <Button size='compact-xs' variant='subtle' onClick={() => setAllActive.mutate(true)}>
            {t('participants.enableAll')}
          </Button>
          <Button size='compact-xs' variant='subtle' color='gray' onClick={() => setAllActive.mutate(false)}>
            {t('participants.disableAll')}
          </Button>
        </Group>
      </Group>
      {participants.length === 0 ? (
        <Text c='dimmed' ta='center' py='lg'>
          {t('participants.empty')}
        </Text>
      ) : (
        <ScrollArea style={{ flex: 1, minHeight: 0 }} type='auto' offsetScrollbars>
          <Stack gap={2}>
            {participants.map((participant) => (
              <ParticipantRow
                key={participant.id}
                participant={participant}
                color={colorById.get(participant.id)}
                onToggle={(isActive) => setActive.mutate({ id: participant.id, isActive })}
                onRename={(name) => rename.mutate({ id: participant.id, name })}
                onRemove={() => confirmRemove(participant)}
              />
            ))}
          </Stack>
        </ScrollArea>
      )}
    </Stack>
  );
};

export default ParticipantsPanel;
