import React from 'react';
import { Person, TrackedDevice, Position } from '../types';
interface PersonSwitcherProps {
    persons: Person[];
    devices: TrackedDevice[];
    positions: Record<string, Position>;
    onSetActiveDevice: (personId: string, deviceId: string) => Promise<void>;
}
export declare const PersonSwitcher: React.FC<PersonSwitcherProps>;
export {};
//# sourceMappingURL=PersonSwitcher.d.ts.map