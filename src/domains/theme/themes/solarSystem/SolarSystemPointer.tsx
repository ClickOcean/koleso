import { useEffect, useState } from 'react';

import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import SolarSystemPointerDrawn from './SolarSystemPointerDrawn';

import type { CSSProperties } from 'react';
import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/**
 * Фотоспрайт стрелки (прозрачный PNG, остриё внизу): `public/themes/solarSystem/pointer.png`.
 * Кандидаты, сгенерированные в Higgsfield, лежат рядом в истории решений; файл можно заменить любым
 * другим, ориентированным остриём вниз — код не меняется.
 */
export const POINTER_IMAGE = '/themes/solarSystem/pointer.png';

/**
 * Стрелка выступает над ободом не выше зазора под заголовок и входит в колесо на глубину `dip`:
 * космонавт стоит ботинками на лунном диске, подписи начинаются глубже (0.84·R = 64·scale от обода).
 */
const PROTRUSION_RATIO = 0.085;
const PROTRUSION_MAX = 64;
const DIP = 56;

type LoadState = 'loading' | 'ready' | 'missing';

let cachedState: LoadState = 'loading';

/**
 * Стрелка «Солнечной системы»: фото-объект, падающий остриём на лунный диск затмения. Пока картинка
 * не загрузилась или файла нет — рисованная SVG-комета (`SolarSystemPointerDrawn`).
 */
const SolarSystemPointer = ({ layout }: PointerProps) => {
  const [state, setState] = useState<LoadState>(cachedState);

  useEffect(() => {
    if (cachedState !== 'loading') {
      return;
    }

    const probe = new Image();
    probe.onload = () => {
      cachedState = 'ready';
      setState('ready');
    };
    probe.onerror = () => {
      cachedState = 'missing';
      setState('missing');
    };
    probe.src = POINTER_IMAGE;

    return () => {
      probe.onload = null;
      probe.onerror = null;
    };
  }, []);

  if (state !== 'ready') {
    return <SolarSystemPointerDrawn layout={layout} />;
  }

  const protrusion = Math.min(PROTRUSION_MAX, Math.round(layout.targetWheelSize * PROTRUSION_RATIO));
  const dip = Math.round(layout.scale * DIP);
  const height = protrusion + dip;
  const style: CSSProperties = {
    height,
    width: 'auto',
    // нижняя точка спрайта — на `dip` ниже верха колеса, то есть остриё чуть входит в диск
    transform: `translate(-50%, calc(-100% + ${dip}px))`,
    filter: 'drop-shadow(0 0 10px rgba(255, 170, 80, 0.45))',
  };

  return (
    <img
      src={POINTER_IMAGE}
      alt=''
      aria-hidden='true'
      className={`${classes.wheelPointer} solar-pointer`}
      style={style}
    />
  );
};

export default SolarSystemPointer;
