// src/svg.d.ts
/* declare module '*.svg?react' {
  import * as React from 'react';
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
} */
// src/svg.d.ts
declare module '*.svg' {
  const svg: React.FC<React.SVGProps<SVGElement>>;
  export default svg;
}
