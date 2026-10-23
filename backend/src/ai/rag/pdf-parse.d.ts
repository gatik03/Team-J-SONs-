// pdf-parse 1.x: the package root runs a debug block under ESM, so we import the lib entry, which ships no types.
declare module 'pdf-parse/lib/pdf-parse.js' {
  import pdfParse from 'pdf-parse';
  export default pdfParse;
}
