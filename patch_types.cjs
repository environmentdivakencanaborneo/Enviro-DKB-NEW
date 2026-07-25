const fs = require('fs');
let types = fs.readFileSync('src/types.ts', 'utf8');

types = types.replace(
  /type: 'AMDAL' \| 'UKL-UPL' \| 'Izin Lingkungan' \| 'Izin TPS B3' \| 'Izin Pembuangan Air Limbah' \| 'Persetujuan Rencana Reklamasi' \| 'Persetujuan Pasca Tambang';/,
  `type: 'AMDAL' | 'UKL-UPL' | 'Persetujuan Lingkungan' | 'Pertek Air Limbah' | 'Pertek Emisi' | 'Izin TPS B3' | 'Izin Pemanfaatan' | 'Persetujuan Rencana Reklamasi' | 'Lainnya';`
);

types = types.replace(
  /pic: string;\n  fileSize\?: string;/,
  `pic: string;
  issuer?: string;
  obligations?: string;
  documentUrl?: string;
  fileSize?: string;`
);

fs.writeFileSync('src/types.ts', types);
