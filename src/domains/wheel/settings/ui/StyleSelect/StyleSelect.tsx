import { Group, Select, SelectProps, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Controller } from 'react-hook-form';
import clsx from 'clsx';
import { CSSProperties, useState } from 'react';

import { resolveWheelStyle, THEME_IDS, THEMES } from '@domains/theme/config/themes';
import { ThemeSelectStyle } from '@domains/theme/model/types';
import { WheelStyle } from '@models/wheel.model';

import styles from './StyleSelect.module.css';

const toInputStyle = (select?: ThemeSelectStyle): CSSProperties | undefined =>
  select
    ? {
        background: select.background,
        color: select.color,
        borderColor: select.borderColor,
        fontFamily: select.fontFamily,
        fontWeight: 600,
      }
    : undefined;

/**
 * Theme picker. Every option (and the closed input) is painted with the
 * theme's own `select` tokens so the list works as a palette preview.
 */
const WheelStyleSelect = () => {
  const { t } = useTranslation();

  const styleOptions = THEME_IDS.map((style) => ({ value: style, label: t(`wheel.style.${style}`) }));

  const [hasOpenedDropdown, setHasOpenedDropdown] = useState(
    () => localStorage.getItem('wheelStyleHintShown') === 'true',
  );

  const handleOpenDropdown = () => {
    setHasOpenedDropdown(true);
    localStorage.setItem('wheelStyleHintShown', 'true');
  };

  const renderOption: SelectProps['renderOption'] = ({ option }) => {
    const select = THEMES[option.value as WheelStyle]?.select;
    return (
      <Group
        justify='space-between'
        wrap='nowrap'
        w='100%'
        px='sm'
        py={6}
        style={{ borderRadius: 6, ...toInputStyle(select) }}
      >
        <Text inherit>{option.label}</Text>
        {select?.icon && (
          <Text inherit span>
            {select.icon}
          </Text>
        )}
      </Group>
    );
  };

  return (
    <Controller
      name='wheelStyles'
      render={({ field: { onChange, value } }) => {
        const currentValue = resolveWheelStyle(value);
        const select = THEMES[currentValue].select;
        const shouldShowHint = !hasOpenedDropdown && currentValue === 'default';

        return (
          <Select
            value={currentValue}
            classNames={{
              options: styles.options,
              option: styles.option,
              wrapper: styles.wrapper,
            }}
            styles={{ input: toInputStyle(select) }}
            rightSection={select?.icon ? <Text style={{ color: select.color }}>{select.icon}</Text> : undefined}
            renderOption={renderOption}
            inputContainer={(children) => {
              return (
                <div
                  className={clsx(styles.inputContainer, {
                    [styles.withFakeBorder]: shouldShowHint,
                  })}
                >
                  {shouldShowHint && <div className={styles.fakeBorder} />}
                  {children}
                </div>
              );
            }}
            onClick={handleOpenDropdown}
            onChange={onChange}
            data={styleOptions}
            label={t('wheel.style.label')}
          />
        );
      }}
    />
  );
};

export default WheelStyleSelect;
