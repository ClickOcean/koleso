import { Button, Group, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUserPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AddParticipantsFormProps {
  onAdd: (names: string[]) => Promise<number>;
  isAdding: boolean;
}

/** One name per line; Enter adds, Shift+Enter inserts a new line. */
const AddParticipantsForm = ({ onAdd, isAdding }: AddParticipantsFormProps) => {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  const names = value.split('\n').map((name) => name.trim()).filter(Boolean);

  const submit = async () => {
    if (!names.length) return;

    const added = await onAdd(names);

    if (added > 0) {
      setValue('');
      notifications.show({ message: t('participants.added', { count: added }), color: 'green' });
    } else {
      notifications.show({ message: t('participants.nothingAdded'), color: 'yellow' });
    }
  };

  return (
    <Group align='flex-start' gap='xs' wrap='nowrap'>
      <Textarea
        style={{ flex: 1 }}
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        placeholder={t('participants.addPlaceholder')}
        autosize
        minRows={1}
        maxRows={6}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <Button leftSection={<IconUserPlus size={18} />} onClick={submit} loading={isAdding} disabled={!names.length}>
        {t('participants.add')}
      </Button>
    </Group>
  );
};

export default AddParticipantsForm;
