const fs = require('fs');
let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

content = content.replace(
  /ComplianceMatrixData,\n  ComplianceMatrixSchema\n\} from '\.\.\/types';/,
  `ComplianceMatrixData,\n  ComplianceMatrixSchema,\n  IncidentData,\n  IncidentSchema\n} from '../types';`
);

const serviceCode = `
export const incidentService = {
  subscribe: (callback: (data: IncidentData[]) => void) => {
    const cached = getOfflineCache<IncidentData[]>('incidents', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'incidents'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as IncidentData);
      setOfflineCache('incidents', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'incidents');
    });
  },

  add: async (item: Omit<IncidentData, 'id'>): Promise<IncidentData> => {
    const id = \`INC-\${crypto.randomUUID()}\`;
    const newItem: IncidentData = {
      ...item,
      id
    };

    const parseResult = IncidentSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const docRef = doc(db, 'incidents', id);
    await setDoc(docRef, newItem);

    const docs = getOfflineCache<IncidentData[]>('incidents', []);
    setOfflineCache('incidents', [newItem, ...docs]);
    
    await auditService.createLog({
      collection: 'incidents',
      action: 'insert',
      recordId: id,
      details: \`Created new Incident record (\${newItem.category} at \${newItem.location})\`
    });

    return newItem;
  },

  update: async (id: string, item: Partial<IncidentData>): Promise<void> => {
    const docRef = doc(db, 'incidents', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data insiden tidak ditemukan");

    const oldData = snap.data() as IncidentData;
    const updatedItem = { ...oldData, ...item };
    
    const parseResult = IncidentSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem as any);

    const docs = getOfflineCache<IncidentData[]>('incidents', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('incidents', updatedDocs);
    
    await auditService.createLog({
      collection: 'incidents',
      action: 'update',
      recordId: id,
      details: \`Updated Incident record status to \${updatedItem.status}\`
    });
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'incidents', id);
    await deleteDoc(docRef);

    const docs = getOfflineCache<IncidentData[]>('incidents', []);
    setOfflineCache('incidents', docs.filter(x => x.id !== id));
    
    await auditService.createLog({
      collection: 'incidents',
      action: 'delete',
      recordId: id,
      details: \`Deleted Incident record\`
    });
  }
};
`;

content = content + '\n' + serviceCode;

fs.writeFileSync('src/services/dbService.ts', content);
