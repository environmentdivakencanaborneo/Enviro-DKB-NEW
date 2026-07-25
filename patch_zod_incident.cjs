const fs = require('fs');
let types = fs.readFileSync('src/types.ts', 'utf8');

types = types.replace(
  /export const SolidWasteSchema = z\.object\(\{/,
  `export const IncidentSchema = z.object({
  id: z.string(),
  date: z.string(),
  time: z.string(),
  category: z.enum(['Tumpahan Hidrokarbon', 'Tanggul Jebol', 'Air Asam Tambang', 'Kebakaran Hutan/Lahan', 'Emisi Asap Tebal', 'Lainnya']),
  location: z.string(),
  chronology: z.string(),
  firstAction: z.string(),
  status: z.enum(['Dilaporkan', 'Investigasi', 'Tindakan Korektif', 'Ditutup']),
  environmentalLoss: z.string(),
  documentationUrl: z.string().optional(),
  reporter: z.string(),
  createdAt: z.string().optional(),
  createdBy: z.string().optional()
});

export const SolidWasteSchema = z.object({`
);

fs.writeFileSync('src/types.ts', types);
