# Extension workspace

Reserved for WXT/Manifest V3, TypeScript, React, and Tailwind.
Person 2 owns framework setup, package dependencies, guards, adapters, offscreen
NER, storage writes, and `src/api.ts`. Person 3 owns dashboard/options/popup,
`src/guards/fileGate.ts`, settings, and shared UI.

This workspace currently links `@promptshield/engine` only. No extension can
be loaded into Chrome yet. Use the Person 2 task file to start implementation.

Import detection/types from `@promptshield/engine`. Import `/ner` and `/files`
only inside workers, offscreen documents, or extension pages. Never send
detected text, values, files, or events to a server. Follow overview Sections
5.5 and 5.7 for storage keys and the internal API; event records contain no values.
