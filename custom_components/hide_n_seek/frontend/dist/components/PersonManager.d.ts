import React from 'react';
import { Person, TrackedDevice } from '../types';
interface PersonManagerProps {
    persons: Person[];
    devices: TrackedDevice[];
    onCreatePerson: (name: string, defaultDeviceId: string, linkedDeviceIds: string[], color: string) => Promise<void>;
    onUpdatePerson: (person: Person) => Promise<void>;
    onDeletePerson: (personId: string) => Promise<void>;
}
export declare const PersonManager: React.FC<PersonManagerProps>;
export {};
//# sourceMappingURL=PersonManager.d.ts.map