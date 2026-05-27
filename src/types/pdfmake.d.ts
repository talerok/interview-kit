declare module 'pdfmake/build/pdfmake' {
  export interface PdfCreator {
    download(filename?: string, cb?: () => void, options?: unknown): void;
    open(options?: unknown): void;
    print(options?: unknown): void;
    getBlob(cb: (blob: Blob) => void): void;
    getDataUrl(cb: (dataUrl: string) => void): void;
  }
  export interface PdfMakeStatic {
    createPdf(documentDefinition: unknown, options?: Record<string, unknown>): PdfCreator;
    fonts?: unknown;
    addVirtualFileSystem?(vfs: Record<string, string>): void;
  }
  const pdfMake: PdfMakeStatic;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: Record<string, string>;
  export default vfs;
}
