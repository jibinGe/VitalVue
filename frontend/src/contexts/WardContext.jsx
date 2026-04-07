import React, { createContext, useContext, useState } from 'react';

const WardContext = createContext(null);

export function useWard() {
  const context = useContext(WardContext);
  if (!context) {
    throw new Error('useWard must be used within a WardProvider');
  }
  return context;
}

export function WardProvider({ children }) {
  const [selectedWard, setSelectedWard] = useState(null);

  return (
    <WardContext.Provider value={{ selectedWard, setSelectedWard }}>
      {children}
    </WardContext.Provider>
  );
}
