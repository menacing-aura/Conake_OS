import React from 'react';
import { OSProvider } from './context/OSContext';
import { Desktop } from './components/desktop/Desktop';

export const App: React.FC = () => {
  return (
    <OSProvider>
      <Desktop />
    </OSProvider>
  );
};

export default App;
