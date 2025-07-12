import React, { useRef, useEffect } from 'react';
import { Group, Arc } from 'react-konva';
import Konva from 'konva';

const KonvaSpinner = ({ x = 0, y = 0, radius = 10, color = 'white' }) => {
  const groupRef = useRef(null);

  useEffect(() => {
    const layer = groupRef.current?.getLayer();
    if (!layer) return;
    const anim = new Konva.Animation((frame) => {
      if (groupRef.current && frame) {
        const angle = (frame.time / 1000) * 360;
        groupRef.current.rotation(angle % 360);
      }
    }, layer);
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Group ref={groupRef} x={x} y={y} listening={false}>
      <Arc
        innerRadius={radius - 3}
        outerRadius={radius}
        angle={270}
        fill={color}
        opacity={0.8}
      />
    </Group>
  );
};

export default KonvaSpinner;
