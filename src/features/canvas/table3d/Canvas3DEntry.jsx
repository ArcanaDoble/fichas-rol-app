import React, { lazy, Suspense } from 'react';

const Canvas3DSection = lazy(() => import('./Canvas3DSection'));

export default function Canvas3DEntry(props) {
  return (
    <Suspense
      fallback={
        <main
          style={{
            background: '#202620',
            color: '#efdfbd',
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'Georgia,serif',
          }}
        >
          Abriendo la mesa…
        </main>
      }
    >
      <Canvas3DSection {...props} />
    </Suspense>
  );
}
