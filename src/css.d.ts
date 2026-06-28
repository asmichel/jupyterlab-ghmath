/**
 * CSS module imports are consumed by the JupyterLab extension builder.
 */
declare module "*.css" {
  /**
   * cssPath is the bundled stylesheet module identifier.
   */
  const cssPath: string;
  export default cssPath;
}

