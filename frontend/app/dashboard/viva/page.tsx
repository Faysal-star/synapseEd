import { Suspense } from 'react';
import  VivaPage  from '@/components/dashboard_pages/viva/VivaPage';

export default function VivaRoute() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VivaPage />
    </Suspense>
  );
}