import React from 'react';
import { createRoot } from 'react-dom/client';
import ParryFreePreview from './ParryFreePreview';
createRoot(document.getElementById('noma-parry-preview-mount')).render(<ParryFreePreview images={globalThis.parryPreviewImages || {}} />);
