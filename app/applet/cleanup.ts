import fs from 'fs';
import { execSync } from 'child_process';
// Just cleanup
fs.unlinkSync('/app/applet/docgen.cjs');
fs.unlinkSync('/app/applet/make_docs.ts');
fs.unlinkSync('/app/applet/test2.ts');
