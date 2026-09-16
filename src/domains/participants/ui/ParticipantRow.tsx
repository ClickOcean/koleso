import { ActionIcon, Checkbox, Group, Text, TextInput, Tooltip } from '@mantine/core';
import { IconCheck, IconPencil, IconTrash, IconX } from '@tabler/icons-react';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Participant } from '../model/types';

interface ParticipantRowProps {
  participant: Participant;
  color?: string;
  onToggle: (isActive: boolean) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}

const ParticipantRow = ({ participant, color, onToggle, onRename, onRemove }: ParticipantRowProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(participant.name);

  const startEditing = () => {
    setDraft(participant.name);
    setIsEditing(true);
  };

  const commit = () => {
    const name = draft.trim();
    if (name && name !== participant.name) {
      onRename(name);
    }
    setIsEditing(false);
  };

  return (
    <Group
      gap='xs'
      wrap='nowrap'
      className={clsx('rounded-md px-2 py-1 hover:bg-paper-transparent-600', { 'opacity-50': !participant.isActive })}
    >
      <Tooltip label={participant.isActive ? t('participants.inWheel') : t('participants.inactiveHint')}>
        <Checkbox
          checked={participant.isActive}
          onChange={(event) => onToggle(event.currentTarget.checked)}
          aria-label={participant.name}
        />
      </Tooltip>
      <span
        className='inline-block h-3 w-3 flex-shrink-0 rounded-full'
        style={{ backgroundColor: participant.isActive ? color : 'var(--mantine-color-dark-3)' }}
      />
      {isEditing ? (
        <TextInput
          size='xs'
          style={{ flex: 1 }}
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') setIsEditing(false);
          }}
        />
      ) : (
        <Text style={{ flex: 1 }} truncate onDoubleClick={startEditing}>
          {participant.name}
        </Text>
      )}
      {isEditing ? (
        <>
          <ActionIcon variant='subtle' color='green' onClick={commit} aria-label={t('common.save')}>
            <IconCheck size={18} />
          </ActionIcon>
          <ActionIcon variant='subtle' color='gray' onClick={() => setIsEditing(false)} aria-label={t('common.cancel')}>
            <IconX size={18} />
          </ActionIcon>
        </>
      ) : (
        <>
          <ActionIcon variant='subtle' color='gray' onClick={startEditing} aria-label={t('participants.rename')}>
            <IconPencil size={18} />
          </ActionIcon>
          <ActionIcon variant='subtle' color='red' onClick={onRemove} aria-label={t('participants.remove')}>
            <IconTrash size={18} />
          </ActionIcon>
        </>
      )}
    </Group>
  );
};

export default ParticipantRow;
