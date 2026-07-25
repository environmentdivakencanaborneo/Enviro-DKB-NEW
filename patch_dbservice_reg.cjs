const fs = require('fs');
let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

content = content.replace(
  /IncidentData\n\} from '\.\.\/types';/,
  `IncidentData,\n  RegulatoryWatchData\n} from '../types';`
);

content = content.replace(
  /IncidentSchema\n\} from '\.\.\/utils\/validation';/,
  `IncidentSchema,\n  RegulatoryWatchSchema\n} from '../utils/validation';`
);

const serviceCode = `
export const regulatoryService = {
  subscribe: (callback: (data: RegulatoryWatchData[]) => void) => {
    const cached = getOfflineCache<RegulatoryWatchData[]>('regulatory', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'regulatory'), orderBy('issueDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as RegulatoryWatchData);
      setOfflineCache('regulatory', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'regulatory');
    });
  },

  add: async (item: Omit<RegulatoryWatchData, 'id'>): Promise<RegulatoryWatchData> => {
    const id = \`REG-\${crypto.randomUUID()}\`;
    const newItem: RegulatoryWatchData = {
      ...item,
      id
    };

    const parseResult = RegulatoryWatchSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const docRef = doc(db, 'regulatory', id);
    await setDoc(docRef, newItem);

    const docs = getOfflineCache<RegulatoryWatchData[]>('regulatory', []);
    setOfflineCache('regulatory', [newItem, ...docs]);
    
    await auditService.createLog({
      collection: 'regulatory',
      action: 'insert',
      recordId: id,
      details: \`Created new Regulatory Watch (\${newItem.regulationNo})\`
    });

    return newItem;
  },

  update: async (id: string, item: Partial<RegulatoryWatchData>): Promise<void> => {
    const docRef = doc(db, 'regulatory', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data regulasi tidak ditemukan");

    const oldData = snap.data() as RegulatoryWatchData;
    const updatedItem = { ...oldData, ...item };
    
    const parseResult = RegulatoryWatchSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem as any);

    const docs = getOfflineCache<RegulatoryWatchData[]>('regulatory', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('regulatory', updatedDocs);
    
    await auditService.createLog({
      collection: 'regulatory',
      action: 'update',
      recordId: id,
      details: \`Updated Regulatory Watch status/details\`
    });
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'regulatory', id);
    await deleteDoc(docRef);

    const docs = getOfflineCache<RegulatoryWatchData[]>('regulatory', []);
    setOfflineCache('regulatory', docs.filter(x => x.id !== id));
    
    await auditService.createLog({
      collection: 'regulatory',
      action: 'delete',
      recordId: id,
      details: \`Deleted Regulatory Watch\`
    });
  }
};
`;

content = content + '\n' + serviceCode;

fs.writeFileSync('src/services/dbService.ts', content);
