const fs = require('fs');
let types = fs.readFileSync('src/types.ts', 'utf8');

types = types.replace(
  /export const SolidWasteSchema = z\.object\(\{/,
  `export const ComplianceMatrixSchema = z.object({
  id: z.string(),
  period: z.string().min(1, "Periode harus diisi"),
  aspect: z.enum(['Kualitas Air', 'Kualitas Udara/Emisi', 'Pengelolaan Limbah B3', 'Sosial/Masyarakat', 'Flora/Fauna', 'Lainnya']),
  impactDetails: z.string().min(1, "Rincian dampak harus diisi"),
  target: z.string().min(1, "Target pemenuhan harus diisi"),
  status: z.enum(['Taat', 'Belum Taat', 'Tidak Taat', 'Tidak Relevan']),
  evidenceUrl: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().optional()
});

export const SolidWasteSchema = z.object({`
);

fs.writeFileSync('src/types.ts', types);
