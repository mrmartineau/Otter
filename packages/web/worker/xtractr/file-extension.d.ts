declare module 'file-extension' {
  interface FileExtensionOptions {
    preserveCase?: boolean
  }

  export default function fileExtension(
    filename: string,
    options?: FileExtensionOptions,
  ): string
}
