declare module "pptx-parser" {
  interface PptxParserOptions {
    [key: string]: any;
  }

  interface PptxParserResult {
    slides: Array<{
      text: string;
      [key: string]: any;
    }>;
    [key: string]: any;
  }

  function parsePptx(buffer: Buffer, options?: PptxParserOptions): Promise<PptxParserResult>;
  
  export = parsePptx;
} 