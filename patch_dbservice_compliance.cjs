const fs = require('fs');
let content = fs.readFileSync('src/services/dbService.ts', 'utf8');

content = content.replace(
  /ComplianceMatrixData/g,
  `ComplianceMatrixData` // NO-OP, just making sure it doesn't break if I match wrong. Let's do it safely.
);

content = content.replace(
  /CapaHistory\n\} from '\.\.\/types';/,
  `CapaHistory,\n  ComplianceMatrixData,\n  ComplianceMatrixSchema\n} from '../types';`
);

const serviceCode = `
export const complianceMatrixService = {
  subscribe: (callback: (data: ComplianceMatrixData[]) => void) => {
    const cached = getOfflineCache<ComplianceMatrixData[]>('compliance_matrix', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'compliance_matrix'), orderBy('period', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as ComplianceMatrixData);
      setOfflineCache('compliance_matrix', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'compliance_matrix');
    });
  },

  add: async (item: Omit<ComplianceMatrixData, 'id'>): Promise<ComplianceMatrixData> => {
    const id = \`RKL-\${crypto.randomUUID()}\`;
    const newItem: ComplianceMatrixData = {
      ...item,
      id
    };

    const parseResult = ComplianceMatrixSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const docRef = doc(db, 'compliance_matrix', id);
    await setDoc(docRef, newItem);

    const docs = getOfflineCache<ComplianceMatrixData[]>('compliance_matrix', []);
    setOfflineCache('compliance_matrix', [newItem, ...docs]);
    
    await auditService.createLog({
      collection: 'compliance_matrix',
      action: 'insert',
      recordId: id,
      details: \`Created new Compliance Matrix record for \${newItem.period} (\${newItem.aspect})\`
    });

    return newItem;
  },

  update: async (id: string, item: Partial<ComplianceMatrixData>): Promise<void> => {
    const docRef = doc(db, 'compliance_matrix', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data matriks tidak ditemukan");

    const oldData = snap.data() as ComplianceMatrixData;
    const updatedItem = { ...oldData, ...item };
    
    const parseResult = ComplianceMatrixSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem as any);

    const docs = getOfflineCache<ComplianceMatrixData[]>('compliance_matrix', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('compliance_matrix', updatedDocs);
    
    await auditService.createLog({
      collection: 'compliance_matrix',
      action: 'update',
      recordId: id,
      details: \`Updated Compliance Matrix record for \${updatedItem.period} (\${updatedItem.aspect})\`
    });
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'compliance_matrix', id);
    await deleteDoc(docRef);

    const docs = getOfflineCache<ComplianceMatrixData[]>('compliance_matrix', []);
    setOfflineCache('compliance_matrix', docs.filter(x => x.id !== id));
    
    await auditService.createLog({
      collection: 'compliance_matrix',
      action: 'delete',
      recordId: id,
      details: \`Deleted Compliance Matrix record\`
    });
  }
};
`;

content = content + '\n' + serviceCode;

fs.writeFileSync('src/services/dbService.ts', content);
