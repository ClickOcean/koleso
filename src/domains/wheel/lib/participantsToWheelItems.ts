import { COLORS } from '@constants/color.constants';
import { Participant } from '@domains/participants/model/types';
import { WheelItem } from '@models/wheel.model';

/**
 * Maps the active roster to equally weighted wheel sectors.
 * Colors are assigned by position so they stay stable between renders, and the
 * last sector never repeats the first one's color.
 */
export const participantsToWheelItems = (participants: Participant[]): WheelItem[] => {
  const active = participants.filter((participant) => participant.isActive);
  const palette = COLORS.WHEEL;

  return active.map((participant, index) => {
    let colorIndex = index % palette.length;
    const isLast = index === active.length - 1;

    if (isLast && active.length > 1 && colorIndex === 0) {
      colorIndex = 1;
    }

    return {
      id: participant.id,
      name: participant.name,
      amount: 1,
      color: palette[colorIndex],
    };
  });
};
